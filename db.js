const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'jbm-storage.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    file_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    mime TEXT,
    size INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_files_phone ON files(phone);
`);

module.exports = db;
