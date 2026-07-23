import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { logAudit, actorFromReq, ipFromReq } from "../lib/audit";

const router = Router();

// Create booking
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { experienceId, sessionId, specialNotes } = req.body;

    // Validate participants: must be a positive integer. Without this a
    // negative value would make totalCredits negative and *credit* the user.
    const participants = Number(req.body.participants ?? 1);
    if (!Number.isInteger(participants) || participants < 1 || participants > 100) {
      res.status(400).json({ error: "participants must be a whole number between 1 and 100" });
      return;
    }

    const session = await prisma.experienceSession.findUnique({
      where: { id: sessionId },
      include: { experience: true },
    });

    if (!session || session.experienceId !== experienceId) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (!session.isActive) {
      res.status(400).json({ error: "This session is no longer available" });
      return;
    }
    if (session.startTime < new Date()) {
      res.status(400).json({ error: "This session has already started" });
      return;
    }
    if (participants > session.experience.maxParticipants) {
      res.status(400).json({ error: `This experience allows at most ${session.experience.maxParticipants} people per booking` });
      return;
    }
    if (session.spotsLeft < participants) {
      res.status(400).json({ error: "Not enough spots available" });
      return;
    }

    const totalCredits = session.experience.priceCredits * participants;
    if (totalCredits < 0) {
      res.status(400).json({ error: "Invalid booking amount" });
      return;
    }

    let booking;
    try {
      booking = await prisma.$transaction(async (tx) => {
        // Atomically debit only if the balance still covers it (prevents
        // concurrent-spend overdraw / negative balances).
        const debit = await tx.user.updateMany({
          where: { id: req.authUser!.userId, creditBalance: { gte: totalCredits } },
          data: { creditBalance: { decrement: totalCredits } },
        });
        if (debit.count !== 1) throw new Error("INSUFFICIENT_CREDITS");

        // Atomically claim the spots only if still available.
        const claim = await tx.experienceSession.updateMany({
          where: { id: sessionId, spotsLeft: { gte: participants } },
          data: { spotsLeft: { decrement: participants } },
        });
        if (claim.count !== 1) throw new Error("NO_SPOTS");

        const b = await tx.booking.create({
          data: {
            userId: req.authUser!.userId,
            experienceId,
            sessionId,
            participants,
            totalCredits,
            status: "CONFIRMED",
            specialNotes,
          },
        });

        await tx.creditTransaction.create({
          data: {
            userId: req.authUser!.userId,
            amount: -totalCredits,
            type: "REDEMPTION",
            description: `Booking for ${session.experience.title}`,
            referenceId: b.id,
          },
        });

        await tx.experience.update({
          where: { id: experienceId },
          data: { totalBookings: { increment: 1 } },
        });

        return b;
      });
    } catch (e: any) {
      if (e.message === "INSUFFICIENT_CREDITS") {
        res.status(400).json({ error: "Insufficient credits" });
        return;
      }
      if (e.message === "NO_SPOTS") {
        res.status(400).json({ error: "Not enough spots available" });
        return;
      }
      throw e;
    }

    await logAudit({
      actor: actorFromReq(req),
      category: "BOOKING",
      action: "BOOKING_CREATE",
      summary: `Booked ${participants} spot(s) for "${session.experience.title}"`,
      targetType: "Booking",
      targetId: booking.id,
      amount: -totalCredits,
      metadata: { experienceId, sessionId, participants },
      ip: ipFromReq(req),
    });

    res.status(201).json(booking);
  } catch {
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// Get user's bookings
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = { userId: req.authUser!.userId };
    if (status) where.status = status as string;

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        experience: { select: { title: true, coverImage: true, city: true, duration: true } },
        session: { select: { startTime: true, endTime: true } },
      },
    });

    res.json(bookings);
  } catch {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Cancel booking
router.post("/:id/cancel", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id as string },
      include: { session: true },
    });

    if (!booking || booking.userId !== req.authUser!.userId) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
      res.status(400).json({ error: "Cannot cancel this booking" });
      return;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Atomic status transition guards against a double-cancel refunding twice.
        const flip = await tx.booking.updateMany({
          where: { id: booking.id, status: { in: ["CONFIRMED", "PENDING"] } },
          data: { status: "CANCELLED" },
        });
        if (flip.count !== 1) throw new Error("ALREADY_CANCELLED");

        await tx.user.update({
          where: { id: req.authUser!.userId },
          data: { creditBalance: { increment: booking.totalCredits } },
        });
        await tx.creditTransaction.create({
          data: {
            userId: req.authUser!.userId,
            amount: booking.totalCredits,
            type: "REFUND",
            description: "Booking cancellation refund",
            referenceId: booking.id,
          },
        });
        await tx.experienceSession.update({
          where: { id: booking.sessionId },
          data: { spotsLeft: { increment: booking.participants } },
        });
      });
    } catch (e: any) {
      if (e.message === "ALREADY_CANCELLED") {
        res.status(400).json({ error: "Cannot cancel this booking" });
        return;
      }
      throw e;
    }

    await logAudit({
      actor: actorFromReq(req),
      category: "BOOKING",
      action: "BOOKING_CANCEL",
      summary: "Booking cancelled and credits refunded",
      targetType: "Booking",
      targetId: booking.id,
      amount: booking.totalCredits,
      ip: ipFromReq(req),
    });

    res.json({ message: "Booking cancelled and credits refunded" });
  } catch {
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

export default router;
