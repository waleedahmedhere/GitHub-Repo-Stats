const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'stats.db'));

db.prepare(`
  CREATE TABLE IF NOT EXISTS repo_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_name TEXT,
    date TEXT,
    views INTEGER,
    uniques INTEGER,
    UNIQUE(repo_name, date)
  )
`).run();

function saveView(repo, date, views, uniques) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO repo_views (repo_name, date, views, uniques)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(repo, date, views, uniques);
}

module.exports = { saveView };
