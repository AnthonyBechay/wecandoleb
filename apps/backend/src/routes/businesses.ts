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
