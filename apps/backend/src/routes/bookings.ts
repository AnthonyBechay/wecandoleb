import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// Create booking
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { experienceId, sessionId, participants = 1, specialNotes } = req.body;

    const session = await prisma.experienceSession.findUnique({
      where: { id: sessionId },
      include: { experience: true },
    });

    if (!session || session.experienceId !== experienceId) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.spotsLeft < participants) {
      res.status(400).json({ error: "Not enough spots available" });
      return;
    }

    const totalCredits = session.experience.priceCredits * participants;
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.userId } });

    if (!user || user.creditBalance < totalCredits) {
      res.status(400).json({ error: "Insufficient credits" });
      return;
    }

    const booking = await prisma.$transaction(async (tx) => {
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

      await tx.user.update({
        where: { id: req.authUser!.userId },
        data: { creditBalance: { decrement: totalCredits } },
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

      await tx.experienceSession.update({
        where: { id: sessionId },
        data: { spotsLeft: { decrement: participants } },
      });

      await tx.experience.update({
        where: { id: experienceId },
        data: { totalBookings: { increment: 1 } },
      });

      return b;
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

    await prisma.$transaction([
      prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } }),
      prisma.user.update({
        where: { id: req.authUser!.userId },
        data: { creditBalance: { increment: booking.totalCredits } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: req.authUser!.userId,
          amount: booking.totalCredits,
          type: "REFUND",
          description: "Booking cancellation refund",
          referenceId: booking.id,
        },
      }),
      prisma.experienceSession.update({
        where: { id: booking.sessionId },
        data: { spotsLeft: { increment: booking.participants } },
      }),
    ]);

    res.json({ message: "Booking cancelled and credits refunded" });
  } catch {
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

export default router;
