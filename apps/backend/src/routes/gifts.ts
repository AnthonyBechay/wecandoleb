import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// Send a gift (credits or specific experience with tickets)
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { recipientEmail, recipientName, message, credits, giftType, experienceId, tickets, sendEmail } = req.body;

    if (!recipientEmail || !recipientName) {
      res.status(400).json({ error: "recipientEmail and recipientName are required" });
      return;
    }

    let totalCredits = 0;

    if (giftType === "experience" && experienceId) {
      // Gift a specific experience
      const experience = await prisma.experience.findUnique({ where: { id: experienceId } });
      if (!experience) { res.status(404).json({ error: "Experience not found" }); return; }
      const ticketCount = tickets || 1;
      totalCredits = experience.priceCredits * ticketCount;
    } else {
      // Gift credits directly
      if (!credits || credits <= 0) {
        res.status(400).json({ error: "credits amount is required for credit gifts" });
        return;
      }
      totalCredits = credits;
    }

    const sender = await prisma.user.findUnique({ where: { id: req.authUser!.userId } });
    if (!sender || sender.creditBalance < totalCredits) {
      res.status(400).json({ error: "Insufficient credits" });
      return;
    }

    const code = crypto.randomBytes(6).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    const recipientUser = await prisma.user.findUnique({ where: { email: recipientEmail } });

    const gift = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.authUser!.userId },
        data: { creditBalance: { decrement: totalCredits } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: req.authUser!.userId,
          amount: -totalCredits,
          type: "GIFT_SENT",
          description: giftType === "experience"
            ? `Gift experience (${tickets || 1} tickets) to ${recipientName}`
            : `Gift ${totalCredits / 100} credits to ${recipientName}`,
        },
      });

      const g = await tx.gift.create({
        data: {
          senderId: req.authUser!.userId,
          recipientId: recipientUser?.id,
          recipientEmail,
          recipientName,
          message,
          totalCredits,
          code,
          expiresAt,
          sendEmail: sendEmail || false,
          giftType: giftType === "experience" ? "experience" : "credits",
          items: giftType === "experience" && experienceId
            ? {
                create: [{
                  experienceId,
                  credits: totalCredits,
                  tickets: tickets || 1,
                }],
              }
            : undefined,
        },
        include: { items: { include: { experience: { select: { title: true, coverImage: true, priceCurrency: true } } } } },
      });

      return g;
    });

    res.status(201).json(gift);
  } catch {
    res.status(500).json({ error: "Failed to send gift" });
  }
});

// Claim a gift
router.post("/claim", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;

    const gift = await prisma.gift.findUnique({ where: { code } });
    if (!gift) {
      res.status(404).json({ error: "Gift not found" });
      return;
    }
    if (gift.status !== "PENDING") {
      res.status(400).json({ error: `Gift already ${gift.status.toLowerCase()}` });
      return;
    }
    if (gift.expiresAt < new Date()) {
      res.status(400).json({ error: "Gift has expired" });
      return;
    }

    await prisma.$transaction([
      prisma.gift.update({
        where: { id: gift.id },
        data: { status: "CLAIMED", recipientId: req.authUser!.userId, claimedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: req.authUser!.userId },
        data: { creditBalance: { increment: gift.totalCredits } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: req.authUser!.userId,
          amount: gift.totalCredits,
          type: "GIFT_RECEIVED",
          description: `Gift claimed (code: ${code})`,
          referenceId: gift.id,
        },
      }),
    ]);

    res.json({ message: "Gift claimed successfully", creditsReceived: gift.totalCredits });
  } catch {
    res.status(500).json({ error: "Failed to claim gift" });
  }
});

// Get gifts sent by user
router.get("/sent", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const gifts = await prisma.gift.findMany({
      where: { senderId: req.authUser!.userId },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { experience: { select: { title: true, coverImage: true, priceCurrency: true } } } } },
    });
    res.json(gifts);
  } catch {
    res.status(500).json({ error: "Failed to fetch sent gifts" });
  }
});

// Get gifts received by user
router.get("/received", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const gifts = await prisma.gift.findMany({
      where: { recipientId: req.authUser!.userId },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { firstName: true, lastName: true, avatarUrl: true } },
        items: { include: { experience: { select: { title: true, coverImage: true, priceCurrency: true } } } },
      },
    });
    res.json(gifts);
  } catch {
    res.status(500).json({ error: "Failed to fetch received gifts" });
  }
});

export default router;
