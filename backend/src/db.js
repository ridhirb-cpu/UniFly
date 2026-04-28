import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databaseDir = path.resolve(__dirname, "../../database");
const legacyDatabasePath = path.join(databaseDir, "campusride.sqlite");
const bundledDatabasePath = path.join(databaseDir, "unifly.sqlite");
const schemaPath = path.join(databaseDir, "schema.sql");
const vercelRuntimePath = "/tmp/unifly.sqlite";
const databasePath = process.env.VERCEL ? vercelRuntimePath : bundledDatabasePath;

if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

if (process.env.VERCEL) {
  if (!fs.existsSync(databasePath)) {
    if (fs.existsSync(bundledDatabasePath)) {
      fs.copyFileSync(bundledDatabasePath, databasePath);
    } else if (fs.existsSync(legacyDatabasePath)) {
      fs.copyFileSync(legacyDatabasePath, databasePath);
    }
  }
} else if (!fs.existsSync(databasePath) && fs.existsSync(legacyDatabasePath)) {
  fs.copyFileSync(legacyDatabasePath, databasePath);
}

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initializeDatabase() {
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);
  runMigrations();
}

function columnExists(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function runMigrations() {
  if (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()) {
    if (!columnExists("users", "home_airport")) {
      db.exec("ALTER TABLE users ADD COLUMN home_airport TEXT");
    }
  }

  if (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'trip_plans'").get()) {
    if (!columnExists("trip_plans", "creator_id")) {
      db.exec("ALTER TABLE trip_plans ADD COLUMN creator_id INTEGER");
    }
    if (!columnExists("trip_plans", "destination")) {
      db.exec("ALTER TABLE trip_plans ADD COLUMN destination TEXT");
    }
    if (!columnExists("trip_plans", "is_shared")) {
      db.exec("ALTER TABLE trip_plans ADD COLUMN is_shared INTEGER NOT NULL DEFAULT 0");
    }
    db.exec("UPDATE trip_plans SET creator_id = COALESCE(creator_id, user_id)");
  }

  if (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ride_posts'").get()) {
    if (!columnExists("ride_posts", "trip_plan_id")) {
      db.exec("ALTER TABLE ride_posts ADD COLUMN trip_plan_id INTEGER");
    }
    if (!columnExists("ride_posts", "flight_id")) {
      db.exec("ALTER TABLE ride_posts ADD COLUMN flight_id INTEGER");
    }
  }

  if (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'breaks'").get()) {
    if (!columnExists("breaks", "source_url")) {
      db.exec("ALTER TABLE breaks ADD COLUMN source_url TEXT");
    }
  }
}
