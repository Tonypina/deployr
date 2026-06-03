import { api } from "@/lib/api-client";
import { AuthUser } from "@/lib/types";

export async function login(email: string, password: string) {
  const res = await api.post<{ token: string; user: AuthUser }>("/api/auth/login", { email, password });
  return res.data!;
}

export async function register(payload: {
  companyName: string;
  companyEmail: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}) {
  const res = await api.post<{ token: string; user: AuthUser }>("/api/auth/register", payload);
  return res.data!;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await api.post("/api/auth/change-password", { currentPassword, newPassword });
}
