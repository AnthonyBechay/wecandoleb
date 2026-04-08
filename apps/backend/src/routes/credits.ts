import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// Get credit packages (public)
router.get("/packages", async (_req: Request, res: Response) => {
  try {
    const packages = await prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json(packages);
  } catch {
    res.status(500).json({ error: "Failed to fetch credit packages" });
  }
});

// Get user's credit balance & history
router.get("/balance", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.authUser!.userId },
      select: { creditBalance: true },
    });
    res.json({ balance: user?.creditBalance || 0 });
  } catch {
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

router.get("/history", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = "1", limit = "20" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { userId: req.authUser!.userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.creditTransaction.count({ where: { userId: req.authUser!.userId } }),
    ]);

    res.json({
      transactions,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch credit history" });
  }
});

// Purchase credits
router.post("/purchase", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { packageId } = req.body;

    const pkg = await prisma.creditPackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.isActive) {
      res.status(404).json({ error: "Credit package not found" });
      return;
    }

    const totalCredits = pkg.credits + pkg.bonus;

    // In production, integrate payment gateway here
    // For now, directly add credits
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.authUser!.userId },
        data: { creditBalance: { increment: totalCredits } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: req.authUser!.userId,
          amount: totalCredits,
          type: "PURCHASE",
          description: `Purchased ${pkg.name} (${pkg.credits} + ${pkg.bonus} bonus credits)`,
        },
      }),
    ]);

    res.json({ balance: user.creditBalance, creditsAdded: totalCredits });
  } catch {
    res.status(500).json({ error: "Failed to purchase credits" });
  }
});

// Admin: adjust credits
router.post("/adjust", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, amount, description } = req.body;

    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: amount } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount,
          type: "ADMIN_ADJUSTMENT",
          description: description || "Admin adjustment",
        },
      }),
    ]);

    res.json({ balance: user.creditBalance });
  } catch {
    res.status(500).json({ error: "Failed to adjust credits" });
  }
});

export default router;
