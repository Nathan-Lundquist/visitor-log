import { cookies } from "next/headers";

interface AdminSession {
  email: string;
  companyId: number;
  companyName: string;
  companySlug: string;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("admin_session")?.value;
  if (!raw) return null;

  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64").toString());
    if (decoded.companyId && decoded.email) {
      return decoded as AdminSession;
    }
  } catch {}

  return null;
}
