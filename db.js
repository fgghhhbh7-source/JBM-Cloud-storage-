const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'jbm-storage.json');

function readAll() {
  try {
    if (!fs.existsSync(dbPath)) return [];
    const raw = fs.readFileSync(dbPath, 'utf8');
    const data = JSON.parse(raw || '[]');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('DB read error:', e.message);
    return [];
  }
}

function writeAll(rows) {
  fs.writeFileSync(dbPath, JSON.stringify(rows, null, 2), 'utf8');
}

function insert(row) {
  const rows = readAll();
  rows.push(row);
  writeAll(rows);
  return row;
}

function findByPhone(phone) {
  return readAll()
    .filter((r) => r.phone === phone)
    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

function findOne(id, phone) {
  return readAll().find((r) => r.id === id && r.phone === phone) || null;
}

function remove(id, phone) {
  const rows = readAll();
  const next = rows.filter((r) => !(r.id === id && r.phone === phone));
  const changed = next.length !== rows.length;
  if (changed) writeAll(next);
  return changed;
}

module.exports = { insert, findByPhone, findOne, remove };
