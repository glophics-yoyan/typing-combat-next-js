import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const project_root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrations_directory = path.join(project_root, 'migrations');
const database_url = process.env.DATABASE_URL;

if (!database_url) {
  console.error('DATABASE_URL is required. Copy .env.example to .env and set it first.');
  process.exit(1);
}

const sql = neon(database_url);

async function runMigrations() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied_rows = await sql.query('SELECT filename FROM schema_migrations');
  const applied_migrations = new Set(applied_rows.map((row) => row.filename));
  const migration_files = (await readdir(migrations_directory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  for (const filename of migration_files) {
    if (applied_migrations.has(filename)) continue;

    const migration_path = path.join(migrations_directory, filename);
    const migration_sql = await readFile(migration_path, 'utf8');
    const statements = migration_sql
      .replace(/^\uFEFF/, '')
      .replace(/^\s*--.*$/gm, '')
      .split(/;\s*(?:\r?\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean);

    console.log(`Applying ${filename}`);
    for (const statement of statements) {
      await sql.query(statement);
    }

    await sql.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
  }

  console.log('Migrations are up to date.');
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
