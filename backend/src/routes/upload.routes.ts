import { Router, Response, NextFunction } from "express";
import multer from "multer";
import { put } from "@vercel/blob";
import { authenticate, requireAdmin } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router();

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo se permiten imágenes"));
  },
});

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Solo se permiten archivos PDF"));
  },
});

// POST /api/upload — images
router.post(
  "/",
  authenticate,
  uploadImage.single("file"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No se recibió ningún archivo" });
        return;
      }
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const blob = await put(`ticket-reports/${suffix}.jpg`, req.file.buffer, {
        access: "public",
        contentType: req.file.mimetype,
        token: process.env.DEPLOYR_BLOB_READ_WRITE_TOKEN,
      });
      res.json({ success: true, data: { url: blob.url } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/upload/pdf — review documents (admin only)
router.post(
  "/pdf",
  authenticate,
  requireAdmin,
  uploadPdf.single("file"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No se recibió ningún archivo" });
        return;
      }
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const blob = await put(`review-documents/${suffix}.pdf`, req.file.buffer, {
        access: "public",
        contentType: "application/pdf",
        token: process.env.DEPLOYR_BLOB_READ_WRITE_TOKEN,
      });
      res.json({ success: true, data: { url: blob.url } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
