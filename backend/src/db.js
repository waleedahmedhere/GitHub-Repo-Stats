const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../db/stats.db'));

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
    INSERT INTO repo_views (repo_name, date, views, uniques)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(repo_name, date) DO UPDATE SET
      views = excluded.views,
      uniques = excluded.uniques
  `);
  stmt.run(repo, date, views, uniques);
}

module.exports = { saveView };
