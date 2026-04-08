import { Router, Response } from "express";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import crypto from "crypto";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// ---------------------------------------------------------------------------
// S3-compatible client for Cloudflare R2
// ---------------------------------------------------------------------------
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// ---------------------------------------------------------------------------
// Multer – in-memory storage, 10 MB limit
// ---------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ---------------------------------------------------------------------------
// POST / — Upload a file
// ---------------------------------------------------------------------------
router.post(
  "/",
  authenticate,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const folder = (req.body.folder as string) || "uploads";
      const uuid = crypto.randomUUID();
      const key = `${folder}/${uuid}-${file.originalname}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const url = `${PUBLIC_URL}/${key}`;

      res.status(201).json({ url, key });
    } catch (err) {
      console.error("Upload failed:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE / — Delete a file by key
// ---------------------------------------------------------------------------
router.delete("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== "string") {
      res.status(400).json({ error: "Missing or invalid key" });
      return;
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );

    res.json({ message: "File deleted" });
  } catch (err) {
    console.error("Delete failed:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
