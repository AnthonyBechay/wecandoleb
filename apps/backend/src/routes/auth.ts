import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { authenticate, AuthRequest } from "../middleware/auth";
import { logAudit, actorFromReq, ipFromReq } from "../lib/audit";
import passport from "passport";

const router = Router();

// Register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: "Email, password, firstName, and lastName are required" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, phone },
    });

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, creditBalance: user.creditBalance },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Account is deactivated" });
      return;
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await logAudit({
      actor: { id: user.id, email: user.email, role: user.role },
      category: "AUTH",
      action: "LOGIN",
      summary: `${user.email} signed in`,
      targetType: "User",
      targetId: user.id,
      ip: ipFromReq(req),
    });

    res.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, creditBalance: user.creditBalance, avatarUrl: user.avatarUrl },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Refresh token
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token required" });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

    if (!stored || stored.expiresAt < new Date()) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    // Rotate token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }

    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// Logout
router.post("/logout", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ message: "Logged out" });
  } catch {
    res.status(500).json({ error: "Logout failed" });
  }
});

// Get current user
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.authUser!.userId },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        avatarUrl: true, role: true, creditBalance: true, createdAt: true,
        businesses: { select: { id: true, name: true } },
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

// Update own profile
router.put("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, phone, avatarUrl } = req.body;

    const data: any = {};
    if (firstName !== undefined) {
      if (typeof firstName !== "string" || !firstName.trim()) {
        res.status(400).json({ error: "First name cannot be empty" });
        return;
      }
      data.firstName = firstName.trim();
    }
    if (lastName !== undefined) {
      if (typeof lastName !== "string" || !lastName.trim()) {
        res.status(400).json({ error: "Last name cannot be empty" });
        return;
      }
      data.lastName = lastName.trim();
    }
    if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl ? String(avatarUrl).trim() : null;

    // Note: email and role are intentionally NOT editable here — email changes
    // and role changes go through dedicated/admin flows.

    const user = await prisma.user.update({
      where: { id: req.authUser!.userId },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        avatarUrl: true, role: true, creditBalance: true, createdAt: true,
        businesses: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      actor: actorFromReq(req),
      category: "USER",
      action: "PROFILE_UPDATE",
      summary: `${user.email} updated their profile`,
      targetType: "User",
      targetId: user.id,
      metadata: { fields: Object.keys(data) },
      ip: ipFromReq(req),
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Change own password
router.post("/change-password", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.authUser!.userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // If the account already has a password, verify the current one. Accounts
    // created via Google (no passwordHash) may set one without a current password.
    if (user.passwordHash) {
      if (!currentPassword) {
        res.status(400).json({ error: "Current password is required" });
        return;
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    // Invalidate other sessions by clearing refresh tokens.
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    await logAudit({
      actor: actorFromReq(req),
      category: "AUTH",
      action: "PASSWORD_CHANGE",
      summary: `${user.email} changed their password`,
      targetType: "User",
      targetId: user.id,
      ip: ipFromReq(req),
    });

    res.json({ message: "Password updated successfully" });
  } catch {
    res.status(500).json({ error: "Failed to change password" });
  }
});

// Google OAuth - initiate
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google OAuth - callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login?error=oauth_failed" }),
  async (req: Request, res: Response) => {
    const user = req.user as any;
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  }
);

export default router;
