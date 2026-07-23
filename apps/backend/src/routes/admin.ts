import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { logAudit, actorFromReq, ipFromReq } from "../lib/audit";

const router = Router();

// credits are stored in cents where 100 credits = $1.00
const creditsToUsd = (credits: number) => Math.round((credits / 100) * 100) / 100;

// Dashboard stats
router.get("/stats", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (_req: AuthRequest, res: Response) => {
  try {
    const [users, businesses, experiences, bookings, totalRevenue, pendingRegistrations] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.experience.count(),
      prisma.booking.count(),
      prisma.creditTransaction.aggregate({
        where: { type: "PURCHASE" },
        _sum: { amount: true },
      }),
      prisma.businessRegistration.count({ where: { status: "PENDING" } }),
    ]);

    res.json({
      users,
      businesses,
      experiences,
      bookings,
      totalCreditsCirculating: totalRevenue._sum.amount || 0,
      pendingRegistrations,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── ACCOUNTING ──────────────────────────────────────────
// Money-in/out view of the credit economy. Credits are in cents (100cr = $1).
router.get("/accounting", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (_req: AuthRequest, res: Response) => {
  try {
    const [byType, balanceAgg, bookingsAgg, giftAgg] = await Promise.all([
      prisma.creditTransaction.groupBy({
        by: ["type"],
        _sum: { amount: true },
        _count: true,
      }),
      prisma.user.aggregate({ _sum: { creditBalance: true } }),
      prisma.booking.groupBy({
        by: ["status"],
        _sum: { totalCredits: true, participants: true },
        _count: true,
      }),
      prisma.gift.groupBy({
        by: ["status"],
        _sum: { totalCredits: true },
        _count: true,
      }),
    ]);

    const flow: Record<string, { credits: number; count: number }> = {};
    for (const row of byType) {
      flow[row.type] = { credits: row._sum.amount || 0, count: row._count };
    }

    const purchased = flow["PURCHASE"]?.credits || 0;
    const redeemed = Math.abs(flow["REDEMPTION"]?.credits || 0);
    const gifted = Math.abs(flow["GIFT_SENT"]?.credits || 0);
    const claimed = flow["GIFT_RECEIVED"]?.credits || 0;
    const refunded = flow["REFUND"]?.credits || 0;
    const adjustments = flow["ADMIN_ADJUSTMENT"]?.credits || 0;

    const realized = bookingsAgg
      .filter((b) => ["CONFIRMED", "COMPLETED"].includes(b.status))
      .reduce((s, b) => s + (b._sum.totalCredits || 0), 0);

    const outstanding = balanceAgg._sum.creditBalance || 0;

    res.json({
      currency: "USD",
      creditsPerDollar: 100,
      grossRevenue: {
        credits: purchased,
        usd: creditsToUsd(purchased),
        transactions: flow["PURCHASE"]?.count || 0,
      },
      redeemedOnBookings: { credits: redeemed, usd: creditsToUsd(redeemed) },
      giftedOut: { credits: gifted, usd: creditsToUsd(gifted) },
      giftsClaimed: { credits: claimed, usd: creditsToUsd(claimed) },
      refunded: { credits: refunded, usd: creditsToUsd(refunded) },
      adminAdjustments: { credits: adjustments, usd: creditsToUsd(adjustments) },
      outstandingLiability: { credits: outstanding, usd: creditsToUsd(outstanding) },
      bookingRevenue: { credits: realized, usd: creditsToUsd(realized) },
      bookingsByStatus: bookingsAgg.map((b) => ({
        status: b.status,
        count: b._count,
        credits: b._sum.totalCredits || 0,
        guests: b._sum.participants || 0,
      })),
      giftsByStatus: giftAgg.map((g) => ({
        status: g.status,
        count: g._count,
        credits: g._sum.totalCredits || 0,
      })),
      transactionFlow: byType.map((t) => ({
        type: t.type,
        credits: t._sum.amount || 0,
        count: t._count,
      })),
    });
  } catch (err) {
    console.error("Accounting error:", err);
    res.status(500).json({ error: "Failed to fetch accounting" });
  }
});

// ─── SALES ───────────────────────────────────────────────
// What sold and how much: units (participants) and revenue per experience,
// rolled up by category and business. Realized bookings only.
router.get("/sales", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (_req: AuthRequest, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      select: {
        participants: true,
        totalCredits: true,
        experience: {
          select: {
            id: true, title: true,
            category: { select: { id: true, name: true } },
            business: { select: { id: true, name: true } },
          },
        },
      },
    });

    const expMap: Record<string, any> = {};
    const catMap: Record<string, any> = {};
    const bizMap: Record<string, any> = {};
    let totalUnits = 0, totalCredits = 0;

    for (const b of bookings) {
      const e = b.experience;
      totalUnits += b.participants;
      totalCredits += b.totalCredits;

      const ex = (expMap[e.id] ||= { id: e.id, title: e.title, business: e.business?.name, unitsSold: 0, bookings: 0, revenueCredits: 0 });
      ex.unitsSold += b.participants; ex.bookings += 1; ex.revenueCredits += b.totalCredits;

      if (e.category) {
        const c = (catMap[e.category.id] ||= { id: e.category.id, name: e.category.name, unitsSold: 0, revenueCredits: 0 });
        c.unitsSold += b.participants; c.revenueCredits += b.totalCredits;
      }
      if (e.business) {
        const bz = (bizMap[e.business.id] ||= { id: e.business.id, name: e.business.name, unitsSold: 0, revenueCredits: 0 });
        bz.unitsSold += b.participants; bz.revenueCredits += b.totalCredits;
      }
    }

    const sortByRev = (a: any, b: any) => b.revenueCredits - a.revenueCredits;

    res.json({
      totals: { units: totalUnits, revenueCredits: totalCredits, revenueUsd: creditsToUsd(totalCredits), orders: bookings.length },
      topExperiences: Object.values(expMap).sort(sortByRev).slice(0, 25),
      byCategory: Object.values(catMap).sort(sortByRev),
      byBusiness: Object.values(bizMap).sort(sortByRev),
    });
  } catch (err) {
    console.error("Sales error:", err);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// ─── AUDIT LOG ───────────────────────────────────────────
router.get("/audit", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { page = "1", limit = "30", category, search } = req.query as Record<string, string | undefined>;
    const take = Math.min(Number(limit) || 30, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const where: any = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { summary: { contains: search, mode: "insensitive" } },
        { actorEmail: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: { page: Number(page) || 1, limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (err) {
    console.error("Audit fetch error:", err);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

// ─── BOOKINGS ────────────────────────────────────────────
router.get("/bookings", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { page = "1", limit = "20", status, search } = req.query as Record<string, string | undefined>;
    const take = Math.min(Number(limit) || 20, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { experience: { title: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { firstName: { contains: search, mode: "insensitive" } } },
        { user: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where, skip, take, orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          experience: { select: { id: true, title: true, business: { select: { name: true } } } },
          session: { select: { startTime: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ bookings, pagination: { page: Number(page) || 1, limit: take, total, totalPages: Math.ceil(total / take) } });
  } catch {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Admin-forced cancel + refund (financial action → SUPER_ADMIN only)
router.post("/bookings/:id/cancel", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id as string } });
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (!["CONFIRMED", "PENDING"].includes(booking.status)) {
      res.status(400).json({ error: "Only confirmed or pending bookings can be cancelled" });
      return;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const flip = await tx.booking.updateMany({
          where: { id: booking.id, status: { in: ["CONFIRMED", "PENDING"] } },
          data: { status: "CANCELLED" },
        });
        if (flip.count !== 1) throw new Error("ALREADY_CANCELLED");
        await tx.user.update({ where: { id: booking.userId }, data: { creditBalance: { increment: booking.totalCredits } } });
        await tx.creditTransaction.create({
          data: { userId: booking.userId, amount: booking.totalCredits, type: "REFUND", description: "Admin-cancelled booking refund", referenceId: booking.id },
        });
        await tx.experienceSession.update({ where: { id: booking.sessionId }, data: { spotsLeft: { increment: booking.participants } } });
      });
    } catch (e: any) {
      if (e.message === "ALREADY_CANCELLED") { res.status(400).json({ error: "Already cancelled" }); return; }
      throw e;
    }

    await logAudit({
      actor: actorFromReq(req), category: "BOOKING", action: "BOOKING_ADMIN_CANCEL",
      summary: `Admin cancelled a booking and refunded ${(booking.totalCredits / 100).toFixed(0)} credits`,
      targetType: "Booking", targetId: booking.id, amount: booking.totalCredits, ip: ipFromReq(req),
    });

    res.json({ message: "Booking cancelled and refunded" });
  } catch {
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// ─── REVIEWS (moderation) ────────────────────────────────
router.get("/reviews", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { page = "1", limit = "20", published, search } = req.query as Record<string, string | undefined>;
    const take = Math.min(Number(limit) || 20, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const where: any = {};
    if (published === "true") where.isPublished = true;
    if (published === "false") where.isPublished = false;
    if (search) {
      where.OR = [
        { comment: { contains: search, mode: "insensitive" } },
        { experience: { title: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where, skip, take, orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          experience: { select: { id: true, title: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    res.json({ reviews, pagination: { page: Number(page) || 1, limit: take, total, totalPages: Math.ceil(total / take) } });
  } catch {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// Publish / unpublish a review (moderation)
router.put("/reviews/:id/publish", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { isPublished } = req.body;
    const review = await prisma.review.update({
      where: { id: req.params.id as string },
      data: { isPublished: !!isPublished },
    });
    await recalcExperienceRating(review.experienceId);
    await logAudit({
      actor: actorFromReq(req), category: "EXPERIENCE", action: isPublished ? "REVIEW_PUBLISH" : "REVIEW_UNPUBLISH",
      summary: `${isPublished ? "Published" : "Hid"} a review`, targetType: "Review", targetId: review.id, ip: ipFromReq(req),
    });
    res.json(review);
  } catch {
    res.status(500).json({ error: "Failed to update review" });
  }
});

// Delete a review
router.delete("/reviews/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id as string } });
    if (!review) { res.status(404).json({ error: "Review not found" }); return; }
    await prisma.review.delete({ where: { id: review.id } });
    await recalcExperienceRating(review.experienceId);
    await logAudit({
      actor: actorFromReq(req), category: "EXPERIENCE", action: "REVIEW_DELETE",
      summary: "Deleted a review", targetType: "Review", targetId: review.id, ip: ipFromReq(req),
    });
    res.json({ message: "Review deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete review" });
  }
});

async function recalcExperienceRating(experienceId: string) {
  const agg = await prisma.review.aggregate({
    where: { experienceId, isPublished: true },
    _avg: { rating: true }, _count: { rating: true },
  });
  await prisma.experience.update({
    where: { id: experienceId },
    data: { averageRating: Math.round((agg._avg.rating || 0) * 10) / 10, totalReviews: agg._count.rating },
  });
}

// ─── USERS ───────────────────────────────────────────────

router.get("/users", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { page = "1", limit = "20", role, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (role) where.role = role as string;
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: "insensitive" } },
        { firstName: { contains: search as string, mode: "insensitive" } },
        { lastName: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, firstName: true, lastName: true, role: true,
          isActive: true, creditBalance: true, createdAt: true, authProvider: true,
          _count: { select: { bookings: true, businesses: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.put("/users/:id/role", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!["USER", "BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    await logAudit({
      actor: actorFromReq(req),
      category: "USER",
      action: "USER_ROLE_CHANGE",
      summary: `Changed ${user.email}'s role to ${role}`,
      targetType: "User",
      targetId: user.id,
      metadata: { role },
      ip: ipFromReq(req),
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to update role" });
  }
});

router.put("/users/:id/status", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });

    await logAudit({
      actor: actorFromReq(req),
      category: "USER",
      action: isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
      summary: `${isActive ? "Activated" : "Deactivated"} ${user.email}`,
      targetType: "User",
      targetId: user.id,
      ip: ipFromReq(req),
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// Get full user details
router.get("/users/:id", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        role: true, isActive: true, creditBalance: true, avatarUrl: true,
        authProvider: true, createdAt: true, updatedAt: true,
        businesses: {
          select: { id: true, name: true, city: true, isVerified: true, createdAt: true },
        },
        _count: { select: { bookings: true, reviews: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create a new user
router.post("/users", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, creditBalance } = req.body;

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: "email, password, firstName, and lastName are required" });
      return;
    }

    if (role && !["USER", "BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: role || "USER",
        creditBalance: creditBalance || 0,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true,
        isActive: true, creditBalance: true, createdAt: true,
      },
    });

    await logAudit({
      actor: actorFromReq(req),
      category: "USER",
      action: "USER_CREATE",
      summary: `Created user ${user.email} (${user.role})`,
      targetType: "User",
      targetId: user.id,
      amount: user.creditBalance || undefined,
      ip: ipFromReq(req),
    });

    res.status(201).json(user);
  } catch {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Edit any user field
router.put("/users/:id", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, email, phone, role, isActive, creditBalance } = req.body;

    if (role && !["USER", "BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const data: any = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (creditBalance !== undefined) data.creditBalance = creditBalance;

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        role: true, isActive: true, creditBalance: true, updatedAt: true,
      },
    });

    await logAudit({
      actor: actorFromReq(req),
      category: "USER",
      action: "USER_UPDATE",
      summary: `Edited user ${user.email}`,
      targetType: "User",
      targetId: user.id,
      metadata: { fields: Object.keys(data) },
      ip: ipFromReq(req),
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Soft delete or hard delete a user
router.delete("/users/:id", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const hard = req.query.hard === "true";

    const target = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, email: true },
    });

    if (hard) {
      await prisma.user.delete({ where: { id: req.params.id as string } });
    } else {
      await prisma.user.update({
        where: { id: req.params.id as string },
        data: { isActive: false },
      });
    }

    await logAudit({
      actor: actorFromReq(req),
      category: "USER",
      action: hard ? "USER_DELETE" : "USER_DEACTIVATE",
      summary: `${hard ? "Permanently deleted" : "Deactivated"} user ${target?.email ?? req.params.id}`,
      targetType: "User",
      targetId: req.params.id as string,
      ip: ipFromReq(req),
    });

    res.json({ message: hard ? "User permanently deleted" : "User deactivated" });
  } catch {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ─── BUSINESSES ──────────────────────────────────────────

router.get("/businesses", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (_req: AuthRequest, res: Response) => {
  try {
    const businesses = await prisma.business.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { experiences: true } },
      },
    });
    res.json(businesses);
  } catch {
    res.status(500).json({ error: "Failed to fetch businesses" });
  }
});

router.put("/businesses/:id/verify", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.update({
      where: { id: req.params.id as string },
      data: { isVerified: true },
    });

    await logAudit({
      actor: actorFromReq(req),
      category: "BUSINESS",
      action: "BUSINESS_VERIFY",
      summary: `Verified business "${business.name}"`,
      targetType: "Business",
      targetId: business.id,
      ip: ipFromReq(req),
    });

    res.json(business);
  } catch {
    res.status(500).json({ error: "Failed to verify business" });
  }
});

// Get full business details
router.get("/businesses/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id as string },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
        },
        experiences: {
          orderBy: { createdAt: "desc" },
          include: {
            category: { select: { id: true, name: true } },
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

// Create a business linked to an owner
router.post("/businesses", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, phone, email, website, address, city, region, ownerId } = req.body;

    if (!name || !ownerId) {
      res.status(400).json({ error: "name and ownerId are required" });
      return;
    }

    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      res.status(404).json({ error: "Owner user not found" });
      return;
    }

    const business = await prisma.business.create({
      data: { name, description, phone, email, website, address, city, region, ownerId },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    await logAudit({
      actor: actorFromReq(req),
      category: "BUSINESS",
      action: "BUSINESS_CREATE",
      summary: `Created business "${business.name}" for ${owner.email}`,
      targetType: "Business",
      targetId: business.id,
      ip: ipFromReq(req),
    });

    res.status(201).json(business);
  } catch {
    res.status(500).json({ error: "Failed to create business" });
  }
});

// Edit any business field
router.put("/businesses/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, phone, email, website, address, city, region, ownerId, isVerified } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (website !== undefined) data.website = website;
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (region !== undefined) data.region = region;
    if (ownerId !== undefined) data.ownerId = ownerId;
    if (isVerified !== undefined) data.isVerified = isVerified;

    const business = await prisma.business.update({
      where: { id: req.params.id as string },
      data,
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    await logAudit({
      actor: actorFromReq(req),
      category: "BUSINESS",
      action: "BUSINESS_UPDATE",
      summary: `Edited business "${business.name}"`,
      targetType: "Business",
      targetId: business.id,
      metadata: { fields: Object.keys(data) },
      ip: ipFromReq(req),
    });

    res.json(business);
  } catch {
    res.status(500).json({ error: "Failed to update business" });
  }
});

// Delete a business (SUPER_ADMIN only)
router.delete("/businesses/:id", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const biz = await prisma.business.findUnique({ where: { id: req.params.id as string }, select: { name: true } });
    await prisma.business.delete({ where: { id: req.params.id as string } });

    await logAudit({
      actor: actorFromReq(req),
      category: "BUSINESS",
      action: "BUSINESS_DELETE",
      summary: `Deleted business "${biz?.name ?? req.params.id}"`,
      targetType: "Business",
      targetId: req.params.id as string,
      ip: ipFromReq(req),
    });

    res.json({ message: "Business deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete business" });
  }
});

// ─── BUSINESS REGISTRATIONS ──────────────────────────────

router.get("/registrations", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (_req: AuthRequest, res: Response) => {
  try {
    const registrations = await prisma.businessRegistration.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(registrations);
  } catch {
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

router.put("/registrations/:id/approve", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const reg = await prisma.businessRegistration.findUnique({ where: { id: req.params.id as string } });
    if (!reg) { res.status(404).json({ error: "Registration not found" }); return; }

    // Update registration status
    await prisma.businessRegistration.update({
      where: { id: reg.id },
      data: { status: "APPROVED", reviewedBy: req.authUser!.userId },
    });

    // If user exists, upgrade to BUSINESS_OWNER and create business
    if (reg.userId) {
      await prisma.user.update({
        where: { id: reg.userId },
        data: { role: "BUSINESS_OWNER" },
      });

      await prisma.business.create({
        data: {
          name: reg.businessName,
          description: reg.description,
          phone: reg.ownerPhone,
          email: reg.ownerEmail,
          city: reg.city,
          region: reg.region,
          address: reg.address,
          website: reg.website,
          ownerId: reg.userId,
        },
      });
    }

    await logAudit({
      actor: actorFromReq(req),
      category: "REGISTRATION",
      action: "REGISTRATION_APPROVE",
      summary: `Approved business registration "${reg.businessName}" (${reg.ownerEmail})`,
      targetType: "BusinessRegistration",
      targetId: reg.id,
      ip: ipFromReq(req),
    });

    res.json({ message: "Registration approved" });
  } catch {
    res.status(500).json({ error: "Failed to approve registration" });
  }
});

router.put("/registrations/:id/reject", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { reviewNote } = req.body;
    const reg = await prisma.businessRegistration.update({
      where: { id: req.params.id as string },
      data: { status: "REJECTED", reviewedBy: req.authUser!.userId, reviewNote },
    });

    await logAudit({
      actor: actorFromReq(req),
      category: "REGISTRATION",
      action: "REGISTRATION_REJECT",
      summary: `Rejected business registration "${reg.businessName}"`,
      targetType: "BusinessRegistration",
      targetId: reg.id,
      metadata: { reviewNote: reviewNote || null },
      ip: ipFromReq(req),
    });

    res.json({ message: "Registration rejected" });
  } catch {
    res.status(500).json({ error: "Failed to reject registration" });
  }
});

// ─── EXPERIENCES MANAGEMENT ──────────────────────────────

router.get("/experiences", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, category } = req.query;
    const where: any = {};
    if (status) where.status = status as string;
    if (category) where.categoryId = category as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { city: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const experiences = await prisma.experience.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
      },
    });
    res.json(experiences);
  } catch {
    res.status(500).json({ error: "Failed to fetch experiences" });
  }
});

router.put("/experiences/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, shortDescription, description, highlights, includes, whatToBring,
      priceCredits, priceCurrency, duration, maxParticipants, minParticipants,
      difficulty, minAge, address, city, region, coverImage, categoryId,
      status, featured,
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
    if (req.body.costCredits !== undefined) data.costCredits = req.body.costCredits;
    if (req.body.costCurrency !== undefined) data.costCurrency = req.body.costCurrency;
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
    if (featured !== undefined) data.featured = featured;

    const experience = await prisma.experience.update({
      where: { id: req.params.id as string },
      data,
      include: { category: { select: { id: true, name: true } }, business: { select: { id: true, name: true } } },
    });

    await logAudit({
      actor: actorFromReq(req),
      category: "EXPERIENCE",
      action: "EXPERIENCE_UPDATE",
      summary: `Edited experience "${experience.title}"`,
      targetType: "Experience",
      targetId: experience.id,
      metadata: { fields: Object.keys(data) },
      ip: ipFromReq(req),
    });

    res.json(experience);
  } catch {
    res.status(500).json({ error: "Failed to update experience" });
  }
});

// Toggle featured status
router.put("/experiences/:id/featured", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { featured } = req.body;
    const experience = await prisma.experience.update({
      where: { id: req.params.id as string },
      data: { featured },
    });
    res.json(experience);
  } catch {
    res.status(500).json({ error: "Failed to toggle featured" });
  }
});

// ─── CATEGORIES ──────────────────────────────────────────

router.get("/categories", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (_req: AuthRequest, res: Response) => {
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

router.post("/categories", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, iconUrl, sortOrder } = req.body;
    if (!name || !name.trim()) { res.status(400).json({ error: "Name is required" }); return; }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const category = await prisma.category.create({
      data: { name, slug, description, iconUrl, sortOrder: sortOrder || 0 },
    });
    await logAudit({
      actor: actorFromReq(req), category: "EXPERIENCE", action: "CATEGORY_CREATE",
      summary: `Created category "${category.name}"`, targetType: "Category", targetId: category.id, ip: ipFromReq(req),
    });
    res.status(201).json(category);
  } catch {
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.put("/categories/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, iconUrl, sortOrder } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (iconUrl !== undefined) data.iconUrl = iconUrl;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    const category = await prisma.category.update({ where: { id: req.params.id as string }, data });
    await logAudit({
      actor: actorFromReq(req), category: "EXPERIENCE", action: "CATEGORY_UPDATE",
      summary: `Edited category "${category.name}"`, targetType: "Category", targetId: category.id, ip: ipFromReq(req),
    });
    res.json(category);
  } catch {
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/categories/:id", authenticate, authorize("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const inUse = await prisma.experience.count({ where: { categoryId: req.params.id as string } });
    if (inUse > 0) {
      res.status(400).json({ error: `Cannot delete: ${inUse} experience(s) use this category` });
      return;
    }
    const cat = await prisma.category.findUnique({ where: { id: req.params.id as string }, select: { name: true } });
    await prisma.category.delete({ where: { id: req.params.id as string } });
    await logAudit({
      actor: actorFromReq(req), category: "EXPERIENCE", action: "CATEGORY_DELETE",
      summary: `Deleted category "${cat?.name ?? req.params.id}"`, targetType: "Category", targetId: req.params.id as string, ip: ipFromReq(req),
    });
    res.json({ message: "Category deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
