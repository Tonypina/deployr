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

  // Control-flow signals thrown by route handlers — these are expected outcomes,
  // not failures, so they map to a status without being logged as errors.
  const CONTROL_ERRORS: Record<string, { status: number; message: string }> = {
    NOT_FOUND:  { status: 404, message: "Resource not found" },
    FORBIDDEN:  { status: 403, message: "Insufficient permissions" },
    CONFLICT:   { status: 409, message: "Resource already exists" },
    PLAN_LIMIT: { status: 402, message: "Límite del plan alcanzado. Actualiza tu plan para continuar." },
  };

  if (err instanceof Error) {
    const known = CONTROL_ERRORS[err.message];
    if (known) {
      res.status(known.status).json({ success: false, message: known.message });
      return;
    }
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: "Route not found" });
}
