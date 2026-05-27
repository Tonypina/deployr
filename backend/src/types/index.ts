import { Role } from "@prisma/client";
import { Request } from "express";

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  companyId?: string;
  clientId?: string;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export function paginate(page = 1, limit = 20) {
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;
  return { take, skip };
}
