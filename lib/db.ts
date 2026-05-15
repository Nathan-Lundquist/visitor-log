import { sql } from "@vercel/postgres";

export async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      welcome_message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS workers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS visitors (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      worker_id INTEGER REFERENCES workers(id),
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      checked_in_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Migration: add company_id to existing tables if missing
  await sql`ALTER TABLE workers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`;
  await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`;
  await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP`;
  await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS us_citizen BOOLEAN`;

  // New columns on companies
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3b82f6'`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_license BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_agreement BOOLEAN DEFAULT false`;

  // New column on workers
  await sql`ALTER TABLE workers ADD COLUMN IF NOT EXISTS title TEXT`;

  // Visitor company name and badge number
  await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS company_name TEXT`;
  await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS badge_number TEXT`;

  // "Other" reason notification email on companies
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS other_notify_email TEXT`;

  // Admin password change tracking
  await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false`;

  // Agreements table
  await sql`
    CREATE TABLE IF NOT EXISTS agreements (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      filename TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Visitor licenses table
  await sql`
    CREATE TABLE IF NOT EXISTS visitor_licenses (
      id SERIAL PRIMARY KEY,
      visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
      photo_url TEXT NOT NULL,
      captured_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Visitor signatures table
  await sql`
    CREATE TABLE IF NOT EXISTS visitor_signatures (
      id SERIAL PRIMARY KEY,
      visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
      agreement_id INTEGER REFERENCES agreements(id) ON DELETE CASCADE,
      signature_url TEXT NOT NULL,
      signed_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export { sql };
