import { Router, Request, Response } from "express";
import { expireOverdueTickets } from "../utils/expire-tickets";

const router = Router();

// GET /api/cron/expire-tickets — called by Vercel Cron (hourly)
// Protected by CRON_SECRET env variable
router.get("/expire-tickets", async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
  }

  try {
    const count = await expireOverdueTickets();
    res.json({ success: true, expired: count });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
