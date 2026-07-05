import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

const isPrivileged = (role: string) => ["ADMIN", "SUPER_ADMIN"].includes(role);

// Resolve the business ids the current user is allowed to manage.
// Business owners see their own; admins can optionally scope to one business.
async function resolveOwnedBusinessIds(req: AuthRequest, requestedBusinessId?: string): Promise<string[]> {
  if (requestedBusinessId) {
    const biz = await prisma.business.findUnique({ where: { id: requestedBusinessId } });
    if (!biz) return [];
    if (biz.ownerId !== req.authUser!.userId && !isPrivileged(req.authUser!.role)) return [];
    return [biz.id];
  }
  const businesses = await prisma.business.findMany({
    where: { ownerId: req.authUser!.userId },
    select: { id: true },
  });
  return businesses.map((b) => b.id);
}

// ─── UNIFIED SCHEDULE ────────────────────────────────────
// Returns every meeting for the provider in one normalized shape:
//  - PLATFORM: derived from experience sessions that have active bookings
//  - EXTERNAL: manually added ProviderMeeting rows
// Optional query: businessId, from (ISO), to (ISO)
router.get(
  "/",
  authenticate,
  authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { businessId, from, to } = req.query as Record<string, string | undefined>;
      const bizIds = await resolveOwnedBusinessIds(req, businessId);

      if (bizIds.length === 0) {
        res.json([]);
        return;
      }

      const range: { gte?: Date; lte?: Date } = {};
      if (from) range.gte = new Date(from);
      if (to) range.lte = new Date(to);
      const hasRange = range.gte || range.lte;

      // Platform bookings, grouped by session
      const sessions = await prisma.experienceSession.findMany({
        where: {
          experience: { businessId: { in: bizIds } },
          bookings: { some: { status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } } },
          ...(hasRange ? { startTime: range } : {}),
        },
        include: {
          experience: { select: { id: true, title: true, city: true, businessId: true } },
          bookings: {
            where: { status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
            select: {
              id: true,
              participants: true,
              status: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { startTime: "asc" },
      });

      const platformMeetings = sessions.map((s) => {
        const headcount = s.bookings.reduce((sum, b) => sum + b.participants, 0);
        return {
          id: `session-${s.id}`,
          source: "PLATFORM" as const,
          title: s.experience.title,
          startTime: s.startTime,
          endTime: s.endTime,
          headcount,
          bookingCount: s.bookings.length,
          location: s.experience.city,
          status: "SCHEDULED" as const,
          businessId: s.experience.businessId,
          experience: { id: s.experience.id, title: s.experience.title },
          attendees: s.bookings.map((b) => ({
            name: `${b.user.firstName} ${b.user.lastName}`.trim(),
            participants: b.participants,
            status: b.status,
          })),
        };
      });

      // Manual / external meetings
      const manual = await prisma.providerMeeting.findMany({
        where: {
          businessId: { in: bizIds },
          ...(hasRange ? { startTime: range } : {}),
        },
        include: { experience: { select: { id: true, title: true } } },
        orderBy: { startTime: "asc" },
      });

      const manualMeetings = manual.map((m) => ({
        id: m.id,
        source: m.source,
        title: m.title,
        startTime: m.startTime,
        endTime: m.endTime,
        headcount: m.headcount,
        bookingCount: 1,
        location: m.location,
        status: m.status,
        businessId: m.businessId,
        experience: m.experience,
        customerName: m.customerName,
        customerPhone: m.customerPhone,
        notes: m.notes,
      }));

      const all = [...platformMeetings, ...manualMeetings].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      res.json(all);
    } catch (err) {
      console.error("Schedule fetch error:", err);
      res.status(500).json({ error: "Failed to fetch schedule" });
    }
  }
);

// ─── CREATE A MANUAL MEETING ─────────────────────────────
router.post(
  "/meetings",
  authenticate,
  authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        businessId, experienceId, title, startTime, endTime, headcount,
        location, customerName, customerPhone, notes,
      } = req.body;

      if (!businessId || !title || !startTime) {
        res.status(400).json({ error: "businessId, title, and startTime are required" });
        return;
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business) {
        res.status(404).json({ error: "Business not found" });
        return;
      }
      if (business.ownerId !== req.authUser!.userId && !isPrivileged(req.authUser!.role)) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }

      // If an experience is linked, make sure it belongs to this business
      if (experienceId) {
        const exp = await prisma.experience.findFirst({ where: { id: experienceId, businessId } });
        if (!exp) {
          res.status(400).json({ error: "Experience does not belong to this business" });
          return;
        }
      }

      const meeting = await prisma.providerMeeting.create({
        data: {
          businessId,
          experienceId: experienceId || null,
          title,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          headcount: headcount != null ? Number(headcount) : 1,
          location: location || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          notes: notes || null,
          source: "EXTERNAL",
        },
        include: { experience: { select: { id: true, title: true } } },
      });

      res.status(201).json(meeting);
    } catch (err) {
      console.error("Create meeting error:", err);
      res.status(500).json({ error: "Failed to create meeting" });
    }
  }
);

// ─── UPDATE A MANUAL MEETING ─────────────────────────────
router.put(
  "/meetings/:id",
  authenticate,
  authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const existing = await prisma.providerMeeting.findUnique({
        where: { id: req.params.id as string },
        include: { business: { select: { ownerId: true } } },
      });
      if (!existing) {
        res.status(404).json({ error: "Meeting not found" });
        return;
      }
      if (existing.business.ownerId !== req.authUser!.userId && !isPrivileged(req.authUser!.role)) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }

      const {
        title, startTime, endTime, headcount, location,
        customerName, customerPhone, notes, status, experienceId,
      } = req.body;

      const data: any = {};
      if (title !== undefined) data.title = title;
      if (startTime !== undefined) data.startTime = new Date(startTime);
      if (endTime !== undefined) data.endTime = endTime ? new Date(endTime) : null;
      if (headcount !== undefined) data.headcount = Number(headcount);
      if (location !== undefined) data.location = location || null;
      if (customerName !== undefined) data.customerName = customerName || null;
      if (customerPhone !== undefined) data.customerPhone = customerPhone || null;
      if (notes !== undefined) data.notes = notes || null;
      if (experienceId !== undefined) data.experienceId = experienceId || null;
      if (status !== undefined && ["SCHEDULED", "COMPLETED", "CANCELLED"].includes(status)) {
        data.status = status;
      }

      const meeting = await prisma.providerMeeting.update({
        where: { id: req.params.id as string },
        data,
        include: { experience: { select: { id: true, title: true } } },
      });

      res.json(meeting);
    } catch (err) {
      console.error("Update meeting error:", err);
      res.status(500).json({ error: "Failed to update meeting" });
    }
  }
);

// ─── DELETE A MANUAL MEETING ─────────────────────────────
router.delete(
  "/meetings/:id",
  authenticate,
  authorize("BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const existing = await prisma.providerMeeting.findUnique({
        where: { id: req.params.id as string },
        include: { business: { select: { ownerId: true } } },
      });
      if (!existing) {
        res.status(404).json({ error: "Meeting not found" });
        return;
      }
      if (existing.business.ownerId !== req.authUser!.userId && !isPrivileged(req.authUser!.role)) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }

      await prisma.providerMeeting.delete({ where: { id: req.params.id as string } });
      res.json({ message: "Meeting deleted" });
    } catch (err) {
      console.error("Delete meeting error:", err);
      res.status(500).json({ error: "Failed to delete meeting" });
    }
  }
);

export default router;
