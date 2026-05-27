import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".");
      errors[key] = errors[key] ?? [];
      errors[key].push(issue.message);
    }
    res.status(422).json({ success: false, message: "Validation failed", errors });
    return;
  }

  if (err instanceof Error) {
    console.error(err.message);
    if (err.message === "NOT_FOUND") {
      res.status(404).json({ success: false, message: "Resource not found" });
      return;
    }
    if (err.message === "FORBIDDEN") {
      res.status(403).json({ success: false, message: "Insufficient permissions" });
      return;
    }
    if (err.message === "CONFLICT") {
      res.status(409).json({ success: false, message: "Resource already exists" });
      return;
    }
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: "Route not found" });
}
