import postgres from "postgres";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.vproj_POSTGRES_URL ||
  process.env.DATABASE_URL ||
  "";

const pg = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  max: 10,
  idle_timeout: 20,
  prepare: false, // Required for Supabase PgBouncer pooler
});

// Compatibility wrapper: @vercel/postgres returns { rows, rowCount }
// postgres.js returns rows directly. Wrap to match the old API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryResult = { rows: any[]; rowCount: number };

export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<QueryResult> {
  return (pg as any)(strings, ...values).then((rows: any[]) => ({
    rows: [...rows],
    rowCount: rows.length,
  }));
}

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

  await sql`ALTER TABLE workers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`;
  await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`;
  await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP`;
  await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS us_citizen BOOLEAN`;

  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3b82f6'`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_license BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_agreement BOOLEAN DEFAULT false`;

  await sql`ALTER TABLE workers ADD COLUMN IF NOT EXISTS title TEXT`;

  await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS company_name TEXT`;
  await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS badge_number TEXT`;

  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS other_notify_email TEXT`;

  await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false`;

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

  await sql`
    CREATE TABLE IF NOT EXISTS visitor_licenses (
      id SERIAL PRIMARY KEY,
      visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
      photo_url TEXT NOT NULL,
      captured_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS visitor_signatures (
      id SERIAL PRIMARY KEY,
      visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
      agreement_id INTEGER REFERENCES agreements(id) ON DELETE CASCADE,
      signature_url TEXT NOT NULL,
      signed_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Performance indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_visitors_company_checkin ON visitors (company_id, checked_in_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_visitors_worker ON visitors (worker_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_workers_company ON workers (company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_admins_company ON admins (company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_admins_email ON admins (email)`;
}
