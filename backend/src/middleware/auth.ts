import { Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { AuthRequest } from "../types";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Missing or invalid authorization header" });
    return;
  }

  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {

    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRoles(Role.ADMIN);
export const requireTechnician = requireRoles(Role.TECHNICIAN);
export const requireClient = requireRoles(Role.CLIENT_USER);
export const requireAdminOrTech = requireRoles(Role.ADMIN, Role.TECHNICIAN);
export const requireAdminOrClient = requireRoles(Role.ADMIN, Role.CLIENT_USER);
export const requireAdminOrTechOrClient = requireRoles(Role.ADMIN, Role.TECHNICIAN, Role.CLIENT_USER);

// Blocks access when a company's subscription has expired.
// Skipped for CLIENT_USER (no companyId in JWT) and routes with no user context.
export async function requireActiveSubscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const companyId = req.user?.companyId;
  if (!companyId) { next(); return; }

  try {
    const sub = await prisma.subscription.findUnique({
      where: { companyId },
      select: { status: true, trialEndsAt: true, stripeSubscriptionId: true },
    });

    if (!sub) { next(); return; }

    const now = new Date();
    const valid =
      sub.status === "ACTIVE" ||
      (sub.status === "TRIALING" &&
        (!!sub.stripeSubscriptionId ||
          (sub.trialEndsAt !== null && sub.trialEndsAt > now)));

    if (!valid) {
      res.status(402).json({
        success: false,
        message: "Tu suscripción ha expirado. Activa un plan para continuar.",
      });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
