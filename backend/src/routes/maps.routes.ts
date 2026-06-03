import { Router, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router();

router.use(authenticate);

// GET /api/maps/autocomplete?input=...
router.get("/autocomplete", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = (req.query.input as string | undefined)?.trim() ?? "";

    if (input.length < 3) {
      res.json({ success: true, data: [] });
      return;
    }

    const key = process.env.GOOGLE_MAPS_KEY;
    if (!key) {
      res.status(503).json({ success: false, message: "Google Maps API key not configured" });
      return;
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("language", "es");
    url.searchParams.set("key", key);

    const response = await fetch(url.toString());
    const data = await response.json() as {
      predictions?: Array<{ place_id: string; description: string }>;
    };

    const suggestions = (data.predictions ?? []).map((p) => ({
      placeId: p.place_id,
      description: p.description,
    }));

    res.json({ success: true, data: suggestions });
  } catch (err) {
    next(err);
  }
});

export default router;
