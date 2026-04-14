import { sql } from "@vercel/postgres";

export async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS workers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
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
      reason TEXT NOT NULL,
      checked_in_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;
  // Add email column to existing workers tables (safe to re-run)
  await sql`
    ALTER TABLE workers ADD COLUMN IF NOT EXISTS email TEXT
  `;
}

export { sql };
