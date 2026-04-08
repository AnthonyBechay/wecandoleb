import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// List experiences (public)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { category, city, region, search, featured, page = "1", limit = "12" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { status: "ACTIVE" };
    if (category) where.category = { slug: category };
    if (city) where.city = { contains: city as string, mode: "insensitive" };
    if (region) where.region = { contains: region as string, mode: "insensitive" };
    if (featured === "true") where.featured = true;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { shortDescription: { contains: search as string, mode: "insensitive" } },
        { city: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [experiences, total] = await Promise.all([
      prisma.experience.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
          business: { select: { id: true, name: true, logoUrl: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      }),
      prisma.experience.count({ where }),
    ]);

    res.json({
      experiences,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch experiences" });
  }
});

// Get featured experiences (public)
router.get("/featured", async (_req: Request, res: Response) => {
  try {
    const experiences = await prisma.experience.findMany({
      where: { status: "ACTIVE", featured: true },
      take: 6,
      orderBy: { totalBookings: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        business: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });
    res.json(experiences);
  } catch {
    res.status(500).json({ error: "Failed to fetch featured experiences" });
  }
});

// Get single experience (public)
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const experience = await prisma.experience.findUnique({
      where: { slug: req.params.slug as string },
      include: {
        category: true,
        business: { select: { id: true, name: true, logoUrl: true, description: true, phone: true, email: true, website: true } },
        images: { orderBy: { sortOrder: "asc" } },
        sessions: {
          where: { isActive: true, startTime: { gte: new Date() } },
          orderBy: { startTime: "asc" },
          take: 10,
        },
        reviews: {
          where: { isPublished: true },
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!experience || experience.status !== "ACTIVE") {
      res.status(404).json({ error: "Experience not found" });
      return;
    }
    res.json(experience);
  } catch {
    res.status(500).json({ error: "Failed to fetch experience" });
  }
});

// Get categories (public)
router.get("/meta/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { experiences: true } } },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Create experience (business owner)
router.post("/", authenticate, authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, shortDescription, description, highlights, includes, whatToBring,
      priceCredits, priceCurrency, duration, maxParticipants, minParticipants,
      difficulty, minAge, address, city, region, latitude, longitude,
      coverImage, categoryId, businessId,
    } = req.body;

    // Verify business ownership
    if (req.authUser!.role === "BUSINESS_OWNER") {
      const business = await prisma.business.findFirst({
        where: { id: businessId, ownerId: req.authUser!.userId },
      });
      if (!business) {
        res.status(403).json({ error: "You don't own this business" });
        return;
      }
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const experience = await prisma.experience.create({
      data: {
        title, slug: `${slug}-${Date.now()}`, shortDescription, description,
        highlights: highlights || [], includes: includes || [], whatToBring: whatToBring || [],
        priceCredits, priceCurrency, duration, maxParticipants, minParticipants: minParticipants || 1,
        difficulty: difficulty || "EASY", minAge, address, city, region,
        latitude, longitude, coverImage, categoryId, businessId,
      },
    });

    res.status(201).json(experience);
  } catch (error) {
    res.status(500).json({ error: "Failed to create experience" });
  }
});

// Update experience
router.put("/:id", authenticate, authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const experience = await prisma.experience.findUnique({
      where: { id: req.params.id as string },
      include: { business: true },
    });

    if (!experience) {
      res.status(404).json({ error: "Experience not found" });
      return;
    }

    if (req.authUser!.role === "BUSINESS_OWNER" && experience.business.ownerId !== req.authUser!.userId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const updated = await prisma.experience.update({
      where: { id: req.params.id as string },
      data: req.body,
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update experience" });
  }
});

export default router;
