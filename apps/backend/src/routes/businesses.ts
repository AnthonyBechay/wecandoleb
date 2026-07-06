import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// Get my businesses
router.get("/mine", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { ownerId: req.authUser!.userId },
      include: { _count: { select: { experiences: true } } },
    });
    res.json(businesses);
  } catch {
    res.status(500).json({ error: "Failed to fetch businesses" });
  }
});

// Business owner analytics: revenue, cost, profit & reservation stats
// across all businesses the owner manages (optional ?businessId= to scope).
router.get("/stats", authenticate, authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.query as Record<string, string | undefined>;

    const businesses = await prisma.business.findMany({
      where: {
        ownerId: req.authUser!.userId,
        ...(businessId ? { id: businessId } : {}),
      },
      select: { id: true, name: true },
    });
    const bizIds = businesses.map((b) => b.id);

    if (bizIds.length === 0) {
      res.json({
        businesses: [],
        totals: { experiences: 0, activeExperiences: 0, bookings: 0, guests: 0,
          revenueCredits: 0, costCredits: 0, profitCredits: 0, upcoming: 0, averageRating: 0 },
        byStatus: {}, byExperience: [], recentBookings: [],
      });
      return;
    }

    const now = new Date();

    const [experiences, bookings] = await Promise.all([
      prisma.experience.findMany({
        where: { businessId: { in: bizIds } },
        select: {
          id: true, title: true, status: true, priceCredits: true, costCredits: true,
          priceCurrency: true, costCurrency: true, averageRating: true, totalReviews: true,
        },
      }),
      prisma.booking.findMany({
        where: { experience: { businessId: { in: bizIds } } },
        select: {
          id: true, status: true, participants: true, totalCredits: true, createdAt: true,
          experience: { select: { id: true, title: true, costCredits: true } },
          session: { select: { startTime: true } },
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const REALIZED = new Set(["CONFIRMED", "COMPLETED"]);

    const byStatus: Record<string, number> = {};
    let guests = 0, revenueCredits = 0, costCredits = 0, upcoming = 0;

    // Per-experience accumulators
    const perExp: Record<string, any> = {};
    for (const e of experiences) {
      perExp[e.id] = {
        id: e.id, title: e.title, status: e.status,
        priceCredits: e.priceCredits, costCredits: e.costCredits,
        unitsSold: 0, bookings: 0, revenueCredits: 0, costCredits_total: 0, profitCredits: 0,
        averageRating: e.averageRating, totalReviews: e.totalReviews,
      };
    }

    for (const b of bookings) {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      const realized = REALIZED.has(b.status);
      if (realized) {
        guests += b.participants;
        revenueCredits += b.totalCredits;
        const cost = (b.experience.costCredits || 0) * b.participants;
        costCredits += cost;
        const pe = perExp[b.experience.id];
        if (pe) {
          pe.unitsSold += b.participants;
          pe.bookings += 1;
          pe.revenueCredits += b.totalCredits;
          pe.costCredits_total += cost;
          pe.profitCredits += b.totalCredits - cost;
        }
      }
      if (b.status === "CONFIRMED" && b.session && b.session.startTime > now) upcoming += 1;
    }

    const ratedExps = experiences.filter((e) => e.totalReviews > 0);
    const averageRating = ratedExps.length
      ? Math.round((ratedExps.reduce((s, e) => s + e.averageRating, 0) / ratedExps.length) * 10) / 10
      : 0;

    const byExperience = Object.values(perExp).sort((a: any, b: any) => b.revenueCredits - a.revenueCredits);

    const recentBookings = bookings.slice(0, 12).map((b) => ({
      id: b.id,
      customer: `${b.user.firstName} ${b.user.lastName}`.trim(),
      experience: b.experience.title,
      participants: b.participants,
      totalCredits: b.totalCredits,
      status: b.status,
      date: b.session?.startTime ?? b.createdAt,
    }));

    res.json({
      businesses,
      totals: {
        experiences: experiences.length,
        activeExperiences: experiences.filter((e) => e.status === "ACTIVE").length,
        bookings: bookings.length,
        guests,
        revenueCredits,
        costCredits,
        profitCredits: revenueCredits - costCredits,
        upcoming,
        averageRating,
      },
      byStatus,
      byExperience,
      recentBookings,
    });
  } catch (err) {
    console.error("Business stats error:", err);
    res.status(500).json({ error: "Failed to fetch business stats" });
  }
});

// Create business
router.post("/", authenticate, authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, phone, email, website, address, city, region, latitude, longitude } = req.body;
    const business = await prisma.business.create({
      data: {
        name, description, phone, email, website,
        address, city, region, latitude, longitude,
        ownerId: req.authUser!.userId,
      },
    });
    res.status(201).json(business);
  } catch {
    res.status(500).json({ error: "Failed to create business" });
  }
});

// Update business
router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.id as string } });
    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    if (business.ownerId !== req.authUser!.userId && !["ADMIN", "SUPER_ADMIN"].includes(req.authUser!.role)) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const updated = await prisma.business.update({ where: { id: req.params.id as string }, data: req.body });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update business" });
  }
});

// Register a business (public - anyone can apply)
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { businessName, description, ownerName, ownerEmail, ownerPhone, city, region, address, website, message } = req.body;

    if (!businessName || !ownerName || !ownerEmail) {
      res.status(400).json({ error: "businessName, ownerName, and ownerEmail are required" });
      return;
    }

    // Check if user exists to link
    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });

    const registration = await prisma.businessRegistration.create({
      data: {
        businessName, description, ownerName, ownerEmail, ownerPhone,
        city, region, address, website, message,
        userId: existingUser?.id,
      },
    });

    res.status(201).json({ message: "Registration submitted successfully", id: registration.id });
  } catch {
    res.status(500).json({ error: "Failed to submit registration" });
  }
});

// ─── EXPERIENCE MANAGEMENT FOR BUSINESS OWNERS ─────────

// List experiences for a business
router.get("/:businessId/experiences", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.businessId as string } });
    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    if (business.ownerId !== req.authUser!.userId && !["ADMIN", "SUPER_ADMIN"].includes(req.authUser!.role)) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const experiences = await prisma.experience.findMany({
      where: { businessId: req.params.businessId as string },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    res.json(experiences);
  } catch {
    res.status(500).json({ error: "Failed to fetch experiences" });
  }
});

// Create an experience for a business
router.post("/:businessId/experiences", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.businessId as string } });
    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    if (business.ownerId !== req.authUser!.userId && !["ADMIN", "SUPER_ADMIN"].includes(req.authUser!.role)) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const {
      title, shortDescription, description, highlights, includes, whatToBring,
      priceCredits, priceCurrency, costCredits, costCurrency, duration, maxParticipants, minParticipants,
      difficulty, minAge, address, city, region, coverImage, categoryId,
    } = req.body;

    if (!title || !duration || !maxParticipants || !categoryId || !address || !city || !region) {
      res.status(400).json({ error: "title, duration, maxParticipants, categoryId, address, city, and region are required" });
      return;
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const experience = await prisma.experience.create({
      data: {
        title,
        slug: `${slug}-${Date.now()}`,
        shortDescription,
        description,
        highlights: highlights || [],
        includes: includes || [],
        whatToBring: whatToBring || [],
        priceCredits,
        priceCurrency,
        costCredits: costCredits ?? 0,
        costCurrency: costCurrency ?? 0,
        duration,
        maxParticipants,
        minParticipants: minParticipants || 1,
        difficulty: difficulty || "EASY",
        minAge,
        address,
        city,
        region,
        coverImage,
        categoryId,
        businessId: req.params.businessId as string,
        status: "DRAFT",
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(experience);
  } catch (err) {
    console.error("Create experience error:", err);
    res.status(500).json({ error: "Failed to create experience" });
  }
});

// Update an experience for a business
router.put("/:businessId/experiences/:expId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.businessId as string } });
    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    if (business.ownerId !== req.authUser!.userId && !["ADMIN", "SUPER_ADMIN"].includes(req.authUser!.role)) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const experience = await prisma.experience.findFirst({
      where: { id: req.params.expId as string, businessId: req.params.businessId as string },
    });
    if (!experience) {
      res.status(404).json({ error: "Experience not found" });
      return;
    }

    const {
      title, shortDescription, description, highlights, includes, whatToBring,
      priceCredits, priceCurrency, costCredits, costCurrency, duration, maxParticipants, minParticipants,
      difficulty, minAge, address, city, region, coverImage, categoryId, status,
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
    if (costCredits !== undefined) data.costCredits = costCredits;
    if (costCurrency !== undefined) data.costCurrency = costCurrency;
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

    const updated = await prisma.experience.update({
      where: { id: req.params.expId as string },
      data,
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update experience" });
  }
});

// Delete an experience for a business
router.delete("/:businessId/experiences/:expId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.businessId as string } });
    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    if (business.ownerId !== req.authUser!.userId && !["ADMIN", "SUPER_ADMIN"].includes(req.authUser!.role)) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const experience = await prisma.experience.findFirst({
      where: { id: req.params.expId as string, businessId: req.params.businessId as string },
    });
    if (!experience) {
      res.status(404).json({ error: "Experience not found" });
      return;
    }

    await prisma.experience.delete({ where: { id: req.params.expId as string } });
    res.json({ message: "Experience deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete experience" });
  }
});

// Add image to an experience
router.post("/:businessId/experiences/:expId/images", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.businessId as string } });
    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    if (business.ownerId !== req.authUser!.userId && !["ADMIN", "SUPER_ADMIN"].includes(req.authUser!.role)) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const experience = await prisma.experience.findFirst({
      where: { id: req.params.expId as string, businessId: req.params.businessId as string },
    });
    if (!experience) {
      res.status(404).json({ error: "Experience not found" });
      return;
    }

    const { url, alt, sortOrder } = req.body;
    if (!url) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    const image = await prisma.experienceImage.create({
      data: {
        url,
        alt: alt || "",
        sortOrder: sortOrder || 0,
        experienceId: req.params.expId as string,
      },
    });

    res.status(201).json(image);
  } catch {
    res.status(500).json({ error: "Failed to add image" });
  }
});

// Remove an image from an experience
router.delete("/:businessId/experiences/:expId/images/:imageId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.businessId as string } });
    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    if (business.ownerId !== req.authUser!.userId && !["ADMIN", "SUPER_ADMIN"].includes(req.authUser!.role)) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const image = await prisma.experienceImage.findFirst({
      where: {
        id: req.params.imageId as string,
        experience: { id: req.params.expId as string, businessId: req.params.businessId as string },
      },
    });
    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    await prisma.experienceImage.delete({ where: { id: req.params.imageId as string } });
    res.json({ message: "Image deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// ─── PUBLIC ROUTES ──────────────────────────────────────

// Get business by ID (public)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id as string },
      include: {
        experiences: {
          where: { status: "ACTIVE" },
          include: {
            category: { select: { name: true, slug: true } },
            images: { take: 1, orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });
    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    res.json(business);
  } catch {
    res.status(500).json({ error: "Failed to fetch business" });
  }
});

export default router;
