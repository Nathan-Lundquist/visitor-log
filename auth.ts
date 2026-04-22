import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { sql } from "@vercel/postgres";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || "common"}/v2.0`,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const domain = user.email.split("@")[1];
      const result = await sql`SELECT id FROM companies WHERE domain = ${domain}`;
      if (result.rows.length === 0) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const domain = user.email.split("@")[1];
        const result = await sql`SELECT id, name, slug FROM companies WHERE domain = ${domain}`;
        if (result.rows[0]) {
          token.companyId = result.rows[0].id;
          token.companyName = result.rows[0].name;
          token.companySlug = result.rows[0].slug;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.companyId) {
        session.user.companyId = token.companyId as number;
        session.user.companyName = token.companyName as string;
        session.user.companySlug = token.companySlug as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin",
    error: "/admin",
  },
});
