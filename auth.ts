import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "visitor-log-default-secret-change-me";

interface AdminSession {
  email: string;
  companyId: number;
  companyName: string;
  companySlug: string;
  mustChangePassword?: boolean;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export function createSessionCookie(session: AdminSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("admin_session")?.value;
  if (!raw) return null;

  try {
    // Support signed format: payload.signature
    const dotIndex = raw.lastIndexOf(".");
    if (dotIndex === -1) return null; // Reject unsigned cookies

    const payload = raw.substring(0, dotIndex);
    const signature = raw.substring(dotIndex + 1);

    // Verify HMAC signature
    const expected = sign(payload);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    if (decoded.companyId && decoded.email) {
      return decoded as AdminSession;
    }
  } catch {}

  return null;
}
