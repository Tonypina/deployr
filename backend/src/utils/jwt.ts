import jwt from "jsonwebtoken";
import { TokenPayload } from "../types";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: "HS256",
    expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]) ?? "24h",
  });
}

export function verifyToken(token: string): TokenPayload {
  // Pin the algorithm so a token forged with "none" / an asymmetric alg is rejected.
  return jwt.verify(token, getSecret(), { algorithms: ["HS256"] }) as TokenPayload;
}
