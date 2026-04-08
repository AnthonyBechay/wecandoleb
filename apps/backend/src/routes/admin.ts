import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// Dashboard stats
router.get("/stats", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (_req: AuthRequest, res: Response) => {
  try {
    const [users, businesses, experiences, bookings, totalRevenue, pendingRegistrations] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.experience.count(),
      prisma.booking.count(),
      prisma.creditTransaction.aggregate({
        where: { type: "PURCHASE" },
        _sum: { amount: true },
      }),
      prisma.businessRegistration.count({ where: { status: "PENDING" } }),
    ]);

    res.json({
      users,
      businesses,
      experiences,
      bookings,
      totalCreditsCirculating: totalRevenue._sum.amount || 0,
      pendingRegistrations,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── USERS ───────────────────────────────────────────────

router.get("/users", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { page = "1", limit = "20", role, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (role) where.role = role as string;
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: "insensitive" } },
        { firstName: { contains: search as string, mode: "insensitive" } },
        { lastName: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, firstName: true, lastName: true, role: true,
          isActive: true, creditBalance: true, createdAt: true, authProvider: true,
          _count: { select: { bookings: true, businesses: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.put("/users/:id/role", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!["USER", "BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to update role" });
  }
});

router.put("/users/:id/status", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// ─── BUSINESSES ──────────────────────────────────────────

router.get("/businesses", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (_req: AuthRequest, res: Response) => {
  try {
    const businesses = await prisma.business.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { experiences: true } },
      },
    });
    res.json(businesses);
  } catch {
    res.status(500).json({ error: "Failed to fetch businesses" });
  }
});

router.put("/businesses/:id/verify", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.update({
      where: { id: req.params.id as string },
      data: { isVerified: true },
    });
    res.json(business);
  } catch {
    res.status(500).json({ error: "Failed to verify business" });
  }
});

// ─── BUSINESS REGISTRATIONS ──────────────────────────────

router.get("/registrations", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (_req: AuthRequest, res: Response) => {
  try {
    const registrations = await prisma.businessRegistration.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(registrations);
  } catch {
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

router.put("/registrations/:id/approve", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const reg = await prisma.businessRegistration.findUnique({ where: { id: req.params.id as string } });
    if (!reg) { res.status(404).json({ error: "Registration not found" }); return; }

    // Update registration status
    await prisma.businessRegistration.update({
      where: { id: reg.id },
      data: { status: "APPROVED", reviewedBy: req.authUser!.userId },
    });

    // If user exists, upgrade to BUSINESS_OWNER and create business
    if (reg.userId) {
      await prisma.user.update({
        where: { id: reg.userId },
        data: { role: "BUSINESS_OWNER" },
      });

      await prisma.business.create({
        data: {
          name: reg.businessName,
          description: reg.description,
          phone: reg.ownerPhone,
          email: reg.ownerEmail,
          city: reg.city,
          region: reg.region,
          address: reg.address,
          website: reg.website,
          ownerId: reg.userId,
        },
      });
    }

    res.json({ message: "Registration approved" });
  } catch {
    res.status(500).json({ error: "Failed to approve registration" });
  }
});

router.put("/registrations/:id/reject", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { reviewNote } = req.body;
    await prisma.businessRegistration.update({
      where: { id: req.params.id as string },
      data: { status: "REJECTED", reviewedBy: req.authUser!.userId, reviewNote },
    });
    res.json({ message: "Registration rejected" });
  } catch {
    res.status(500).json({ error: "Failed to reject registration" });
  }
});

// ─── EXPERIENCES MANAGEMENT ──────────────────────────────

router.get("/experiences", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, category } = req.query;
    const where: any = {};
    if (status) where.status = status as string;
    if (category) where.categoryId = category as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { city: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const experiences = await prisma.experience.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
      },
    });
    res.json(experiences);
  } catch {
    res.status(500).json({ error: "Failed to fetch experiences" });
  }
});

router.put("/experiences/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, shortDescription, description, highlights, includes, whatToBring,
      priceCredits, priceCurrency, duration, maxParticipants, minParticipants,
      difficulty, minAge, address, city, region, coverImage, categoryId,
      status, featured,
    } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (shortDescription !== undefined) data.shortDescription = shortDescription;
    if (description !== undefined) data.description = description;
    if (highlights !== undefined) data.highlights = highlights;
    if (includes !== undefined) data.includes = includes;
    if (whatToBring !== undefined) data.whatToBring = whatToBring;
    if (priceCredits !== undefined) data.priceCredits = priceCredits;
    if (priceCurrency !== undefined) data.priceCurrency = priceCurrency;
    if (duration !== undefined) data.duration = duration;
    if (maxParticipants !== undefined) data.maxParticipants = maxParticipants;
    if (minParticipants !== undefined) data.minParticipants = minParticipants;
    if (difficulty !== undefined) data.difficulty = difficulty;
    if (minAge !== undefined) data.minAge = minAge;
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (region !== undefined) data.region = region;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (status !== undefined) data.status = status;
    if (featured !== undefined) data.featured = featured;

    const experience = await prisma.experience.update({
      where: { id: req.params.id as string },
      data,
      include: { category: { select: { id: true, name: true } }, business: { select: { id: true, name: true } } },
    });

    res.json(experience);
  } catch {
    res.status(500).json({ error: "Failed to update experience" });
  }
});

// Toggle featured status
router.put("/experiences/:id/featured", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { featured } = req.body;
    const experience = await prisma.experience.update({
      where: { id: req.params.id as string },
      data: { featured },
    });
    res.json(experience);
  } catch {
    res.status(500).json({ error: "Failed to toggle featured" });
  }
});

// ─── CATEGORIES ──────────────────────────────────────────

router.post("/categories", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, iconUrl, sortOrder } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const category = await prisma.category.create({
      data: { name, slug, description, iconUrl, sortOrder: sortOrder || 0 },
    });
    res.status(201).json(category);
  } catch {
    res.status(500).json({ error: "Failed to create category" });
  }
});

export default router;
