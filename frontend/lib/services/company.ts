import { api } from "@/lib/api-client";
import { Company } from "@/lib/types";

export async function getCompany() {
  const res = await api.get<Company>("/api/company");
  return res.data!;
}

export async function updateCompany(data: Partial<{
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  rfc: string | null;
  razonSocial: string | null;
  regimenFiscal: string | null;
  codigoPostal: string | null;
  giro: string | null;
}>) {
  const res = await api.put<Company>("/api/company", data);
  return res.data!;
}
