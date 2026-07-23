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
        // Hosting locations that have accepted, each with its upcoming sessions
        locations: {
          where: { status: "ACCEPTED" },
          orderBy: { isPrimary: "desc" },
          include: {
            business: { select: { id: true, name: true, city: true, region: true } },
            sessions: {
              where: { isActive: true, startTime: { gte: new Date() } },
              orderBy: { startTime: "asc" },
              take: 20,
            },
          },
        },
        sessions: {
          where: { isActive: true, startTime: { gte: new Date() } },
          orderBy: { startTime: "asc" },
          take: 20,
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
      title, shortDescription, description, highlights, includes, includesNote, whatToBring, whatToBringNote,
      priceCredits, priceCurrency, costCredits, costCurrency, duration, maxParticipants, minParticipants,
      difficulty, minAge, maxAge, address, city, region, latitude, longitude,
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

    if (minAge != null && maxAge != null && Number(maxAge) < Number(minAge)) {
      res.status(400).json({ error: "maxAge cannot be less than minAge" });
      return;
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const experience = await prisma.experience.create({
      data: {
        title, slug: `${slug}-${Date.now()}`, shortDescription, description,
        highlights: highlights || [], includes: includes || [], includesNote,
        whatToBring: whatToBring || [], whatToBringNote,
        priceCredits, priceCurrency,
        costCredits: costCredits ?? 0, costCurrency: costCurrency ?? 0,
        duration, maxParticipants, minParticipants: minParticipants || 1,
        difficulty: difficulty || "EASY", minAge, maxAge, address, city, region,
        latitude, longitude, coverImage, categoryId, businessId,
        // The owning business is automatically the primary hosting location.
        locations: {
          create: [{ businessId, status: "ACCEPTED", isPrimary: true, address, city, region }],
        },
      },
      include: { locations: true },
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

    // Whitelist updatable fields (never trust req.body directly — a raw
    // spread would let an owner change businessId, slug, ratings, etc.).
    const allowed = [
      "title", "shortDescription", "description", "highlights", "includes", "includesNote",
      "whatToBring", "whatToBringNote", "priceCredits", "priceCurrency", "costCredits", "costCurrency",
      "duration", "maxParticipants", "minParticipants", "difficulty", "minAge", "maxAge", "address",
      "city", "region", "latitude", "longitude", "coverImage", "categoryId", "status",
    ];
    // Only ADMIN / SUPER_ADMIN may toggle featured.
    if (["ADMIN", "SUPER_ADMIN"].includes(req.authUser!.role)) allowed.push("featured");

    const data: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    const updated = await prisma.experience.update({
      where: { id: req.params.id as string },
      data,
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update experience" });
  }
});

// ─── HELPERS ─────────────────────────────────────────────
type OwnedResult =
  | { ok: true; experience: { id: string; duration: number; maxParticipants: number; business: { ownerId: string } } }
  | { ok: false; status: number; message: string };

async function loadOwnedExperience(req: AuthRequest, expId: string): Promise<OwnedResult> {
  const experience = await prisma.experience.findUnique({
    where: { id: expId },
    include: { business: { select: { ownerId: true } } },
  });
  if (!experience) return { ok: false, status: 404, message: "Experience not found" };
  const isOwner = experience.business.ownerId === req.authUser!.userId;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.authUser!.role);
  if (!isOwner && !isAdmin) return { ok: false, status: 403, message: "Unauthorized" };
  return { ok: true, experience };
}

// ─── COLLABORATIONS (multi-location hosting) ─────────────

// List all hosting links for an experience (owner view — incl. pending/declined)
router.get("/:id/collaborations", authenticate, authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  const found = await loadOwnedExperience(req, req.params.id as string);
  if (!found.ok) { res.status(found.status).json({ error: found.message }); return; }
  const links = await prisma.experienceBusiness.findMany({
    where: { experienceId: req.params.id as string },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: { business: { select: { id: true, name: true, city: true, region: true } }, _count: { select: { sessions: true } } },
  });
  res.json(links);
});

// Request another business to host this experience
router.post("/:id/collaborations", authenticate, authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  const found = await loadOwnedExperience(req, req.params.id as string);
  if (!found.ok) { res.status(found.status).json({ error: found.message }); return; }

  const { businessId, address, city, region } = req.body;
  if (!businessId) { res.status(400).json({ error: "businessId is required" }); return; }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const existing = await prisma.experienceBusiness.findUnique({
    where: { experienceId_businessId: { experienceId: req.params.id as string, businessId } },
  });
  if (existing) { res.status(409).json({ error: "This business is already linked or has a pending request" }); return; }

  const link = await prisma.experienceBusiness.create({
    data: {
      experienceId: req.params.id as string,
      businessId,
      status: "PENDING",
      address: address || null,
      city: city || business.city,
      region: region || business.region,
    },
    include: { business: { select: { id: true, name: true, city: true, region: true } } },
  });
  res.status(201).json(link);
});

// Remove a hosting link (cannot remove the primary)
router.delete("/:id/collaborations/:linkId", authenticate, authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  const found = await loadOwnedExperience(req, req.params.id as string);
  if (!found.ok) { res.status(found.status).json({ error: found.message }); return; }
  const link = await prisma.experienceBusiness.findFirst({ where: { id: req.params.linkId as string, experienceId: req.params.id as string } });
  if (!link) { res.status(404).json({ error: "Link not found" }); return; }
  if (link.isPrimary) { res.status(400).json({ error: "Cannot remove the primary location" }); return; }
  await prisma.experienceBusiness.delete({ where: { id: link.id } });
  res.json({ message: "Location removed" });
});

// ─── SESSIONS ────────────────────────────────────────────

// List sessions for an experience (owner view, grouped-friendly)
router.get("/:id/sessions", authenticate, authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  const found = await loadOwnedExperience(req, req.params.id as string);
  if (!found.ok) { res.status(found.status).json({ error: found.message }); return; }
  const sessions = await prisma.experienceSession.findMany({
    where: { experienceId: req.params.id as string },
    orderBy: { startTime: "asc" },
    include: {
      location: { include: { business: { select: { id: true, name: true } } } },
      _count: { select: { bookings: true } },
    },
  });
  res.json(sessions);
});

// Create a session at a specific hosting location
router.post("/:id/sessions", authenticate, authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  const experience = await prisma.experience.findUnique({
    where: { id: req.params.id as string },
    include: { business: { select: { ownerId: true } } },
  });
  if (!experience) { res.status(404).json({ error: "Experience not found" }); return; }

  const { experienceBusinessId, startTime, endTime, capacity } = req.body;
  if (!experienceBusinessId || !startTime) { res.status(400).json({ error: "experienceBusinessId and startTime are required" }); return; }

  const link = await prisma.experienceBusiness.findFirst({
    where: { id: experienceBusinessId, experienceId: experience.id },
    include: { business: { select: { ownerId: true } } },
  });
  if (!link) { res.status(404).json({ error: "Hosting location not found" }); return; }
  if (link.status !== "ACCEPTED") { res.status(400).json({ error: "This location has not accepted the collaboration yet" }); return; }

  // The experience owner OR the owner of the hosting business (or admin) may add sessions
  const isExpOwner = experience.business.ownerId === req.authUser!.userId;
  const isLocOwner = link.business.ownerId === req.authUser!.userId;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.authUser!.role);
  if (!isExpOwner && !isLocOwner && !isAdmin) { res.status(403).json({ error: "Unauthorized" }); return; }

  const start = new Date(startTime);
  if (isNaN(start.getTime())) { res.status(400).json({ error: "Invalid startTime" }); return; }
  if (start < new Date()) { res.status(400).json({ error: "Session cannot be in the past" }); return; }
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + experience.duration * 60000);

  const cap = capacity != null ? Number(capacity) : experience.maxParticipants;
  if (!Number.isInteger(cap) || cap < 1) { res.status(400).json({ error: "capacity must be a positive whole number" }); return; }

  const session = await prisma.experienceSession.create({
    data: {
      experienceId: experience.id,
      experienceBusinessId,
      startTime: start,
      endTime: end,
      capacity: cap,
      spotsLeft: cap,
    },
    include: { location: { include: { business: { select: { id: true, name: true } } } } },
  });
  res.status(201).json(session);
});

// Delete a session (only if it has no bookings)
router.delete("/:id/sessions/:sid", authenticate, authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  const found = await loadOwnedExperience(req, req.params.id as string);
  if (!found.ok) { res.status(found.status).json({ error: found.message }); return; }
  const session = await prisma.experienceSession.findFirst({
    where: { id: req.params.sid as string, experienceId: req.params.id as string },
    include: { _count: { select: { bookings: true } } },
  });
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  if (session._count.bookings > 0) { res.status(400).json({ error: "Cannot delete a session that has bookings — deactivate it instead" }); return; }
  await prisma.experienceSession.delete({ where: { id: session.id } });
  res.json({ message: "Session deleted" });
});

export default router;
