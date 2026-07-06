import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { logAudit, actorFromReq, ipFromReq } from "../lib/audit";

const router = Router();

// Send a gift (credits or specific experience with tickets)
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { recipientEmail, recipientName, message, giftType, experienceId, sendEmail } = req.body;

    if (!recipientEmail || !recipientName) {
      res.status(400).json({ error: "recipientEmail and recipientName are required" });
      return;
    }

    let totalCredits = 0;
    let ticketCount = 1;

    if (giftType === "experience" && experienceId) {
      // Gift a specific experience — validate ticket count is a positive int.
      ticketCount = Number(req.body.tickets ?? 1);
      if (!Number.isInteger(ticketCount) || ticketCount < 1 || ticketCount > 100) {
        res.status(400).json({ error: "tickets must be a whole number between 1 and 100" });
        return;
      }
      const experience = await prisma.experience.findUnique({ where: { id: experienceId } });
      if (!experience) { res.status(404).json({ error: "Experience not found" }); return; }
      totalCredits = experience.priceCredits * ticketCount;
    } else {
      // Gift credits directly — validate a positive integer amount.
      const credits = Number(req.body.credits);
      if (!Number.isInteger(credits) || credits <= 0) {
        res.status(400).json({ error: "credits must be a positive whole number" });
        return;
      }
      totalCredits = credits;
    }

    if (totalCredits <= 0) {
      res.status(400).json({ error: "Invalid gift amount" });
      return;
    }

    const code = crypto.randomBytes(6).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    const recipientUser = await prisma.user.findUnique({ where: { email: recipientEmail } });

    let gift;
    try {
      gift = await prisma.$transaction(async (tx) => {
        // Atomically debit the sender only if they can cover the gift.
        const debit = await tx.user.updateMany({
          where: { id: req.authUser!.userId, creditBalance: { gte: totalCredits } },
          data: { creditBalance: { decrement: totalCredits } },
        });
        if (debit.count !== 1) throw new Error("INSUFFICIENT_CREDITS");

        await tx.creditTransaction.create({
          data: {
            userId: req.authUser!.userId,
            amount: -totalCredits,
            type: "GIFT_SENT",
            description: giftType === "experience"
              ? `Gift experience (${ticketCount} tickets) to ${recipientName}`
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
                    tickets: ticketCount,
                  }],
                }
              : undefined,
          },
          include: { items: { include: { experience: { select: { title: true, coverImage: true, priceCurrency: true } } } } },
        });

        return g;
      });
    } catch (e: any) {
      if (e.message === "INSUFFICIENT_CREDITS") {
        res.status(400).json({ error: "Insufficient credits" });
        return;
      }
      throw e;
    }

    await logAudit({
      actor: actorFromReq(req),
      category: "GIFT",
      action: "GIFT_SEND",
      summary: `Sent a ${gift.giftType} gift to ${recipientName}`,
      targetType: "Gift",
      targetId: gift.id,
      amount: -totalCredits,
      metadata: { recipientEmail, giftType: gift.giftType },
      ip: ipFromReq(req),
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

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "A gift code is required" });
      return;
    }

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
    // A sender reclaiming their own gift would just reverse the debit and
    // muddy accounting — disallow it.
    if (gift.senderId === req.authUser!.userId) {
      res.status(400).json({ error: "You cannot claim your own gift" });
      return;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Atomic PENDING → CLAIMED transition. Two concurrent claims can't
        // both succeed, so credits are only ever granted once.
        const claim = await tx.gift.updateMany({
          where: { id: gift.id, status: "PENDING" },
          data: { status: "CLAIMED", recipientId: req.authUser!.userId, claimedAt: new Date() },
        });
        if (claim.count !== 1) throw new Error("ALREADY_CLAIMED");

        await tx.user.update({
          where: { id: req.authUser!.userId },
          data: { creditBalance: { increment: gift.totalCredits } },
        });
        await tx.creditTransaction.create({
          data: {
            userId: req.authUser!.userId,
            amount: gift.totalCredits,
            type: "GIFT_RECEIVED",
            description: `Gift claimed (code: ${code})`,
            referenceId: gift.id,
          },
        });
      });
    } catch (e: any) {
      if (e.message === "ALREADY_CLAIMED") {
        res.status(400).json({ error: "Gift already claimed" });
        return;
      }
      throw e;
    }

    await logAudit({
      actor: actorFromReq(req),
      category: "GIFT",
      action: "GIFT_CLAIM",
      summary: `Claimed a gift (code ${code})`,
      targetType: "Gift",
      targetId: gift.id,
      amount: gift.totalCredits,
      ip: ipFromReq(req),
    });

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
