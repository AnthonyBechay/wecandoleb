import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "passport";
import { logger } from "./lib/logger";
import { configurePassport } from "./services/passport";

// Routes
import authRoutes from "./routes/auth";
import experienceRoutes from "./routes/experiences";
import creditRoutes from "./routes/credits";
import giftRoutes from "./routes/gifts";
import bookingRoutes from "./routes/bookings";
import businessRoutes from "./routes/businesses";
import adminRoutes from "./routes/admin";
import reviewRoutes from "./routes/reviews";
import uploadRoutes from "./routes/uploads";

const app = express();
const PORT = process.env.PORT || 10000;

// Security & parsing
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Configure Google OAuth
configurePassport();

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/credits", creditRoutes);
app.use("/api/gifts", giftRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/uploads", uploadRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
