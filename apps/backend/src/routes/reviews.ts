import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// Submit a review (user must have a completed booking for this experience)
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { experienceId, rating, comment } = req.body;

    if (!experienceId || !rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: "experienceId and rating (1-5) are required" });
      return;
    }

    // Check user has a completed booking for this experience
    const booking = await prisma.booking.findFirst({
      where: {
        userId: req.authUser!.userId,
        experienceId,
        status: "COMPLETED",
      },
    });

    if (!booking) {
      res.status(403).json({ error: "You can only review experiences you have completed" });
      return;
    }

    // Check if already reviewed
    const existing = await prisma.review.findUnique({
      where: { userId_experienceId: { userId: req.authUser!.userId, experienceId } },
    });

    if (existing) {
      // Update existing review
      const review = await prisma.review.update({
        where: { id: existing.id },
        data: { rating, comment },
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
      });

      // Recalculate average
      await recalculateRating(experienceId);

      res.json(review);
      return;
    }

    // Create new review
    const review = await prisma.review.create({
      data: {
        userId: req.authUser!.userId,
        experienceId,
        rating,
        comment,
      },
      include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
    });

    // Recalculate average
    await recalculateRating(experienceId);

    res.status(201).json(review);
  } catch {
    res.status(500).json({ error: "Failed to submit review" });
  }
});

// Get reviews for an experience (public)
router.get("/experience/:experienceId", async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { experienceId: req.params.experienceId as string, isPublished: true },
      include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(reviews);
  } catch {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// Delete review (admin or own review)
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id as string } });
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    if (review.userId !== req.authUser!.userId && !["ADMIN", "SUPER_ADMIN"].includes(req.authUser!.role)) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    await prisma.review.delete({ where: { id: review.id } });
    await recalculateRating(review.experienceId);

    res.json({ message: "Review deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete review" });
  }
});

async function recalculateRating(experienceId: string) {
  const agg = await prisma.review.aggregate({
    where: { experienceId, isPublished: true },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.experience.update({
    where: { id: experienceId },
    data: {
      averageRating: Math.round((agg._avg.rating || 0) * 10) / 10,
      totalReviews: agg._count.rating,
    },
  });
}

export default router;
