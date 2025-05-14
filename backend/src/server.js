const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database(path.join(__dirname, '../db/stats.db'));

app.use(cors());

app.get('/api/accounts', (req, res) => {
  db.all('SELECT DISTINCT SUBSTR(repo_name, 1, INSTR(repo_name, "/") - 1) AS account FROM repo_views ORDER BY account', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Debugging log to see fetched accounts
    console.log('Fetched accounts:', rows);

    const accounts = rows.map(row => row.account);
    res.json(accounts);
  });
});

app.get('/api/repos', (req, res) => {
  const account = req.query.account;
  if (!account) return res.status(400).json({ error: 'Account is required' });

  db.all('SELECT DISTINCT repo_name FROM repo_views WHERE repo_name LIKE ? ORDER BY repo_name', [`${account}%`], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const repoNames = rows.map(row => row.repo_name);
    res.json(repoNames);
  });
});

function getAllDates(startDateStr, endDateStr) {
  const result = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

app.get('/api/views', (req, res) => {
  const { account, repo } = req.query;
  if (!account || !repo) return res.status(400).json({ error: 'Account and repo are required' });

  db.get('SELECT MIN(date) as minDate FROM repo_views WHERE repo_name = ?', [repo], (err, minResult) => {
    if (err) return res.status(500).json({ error: err.message });
    const minDate = minResult?.minDate;
    if (!minDate) return res.json([]);

    const today = new Date().toISOString().slice(0, 10);
    const allDates = getAllDates(minDate, today);

    db.all(
      'SELECT date, views, uniques FROM repo_views WHERE repo_name = ?',
      [repo],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const dataMap = new Map(rows.map(row => [row.date, row]));
        const filledData = allDates.map(date => ({
          date,
          views: dataMap.get(date)?.views || 0,
          uniques: dataMap.get(date)?.uniques || 0,
        }));
        res.json(filledData);
      }
    );
  });
});

app.get('/api/views/all', (req, res) => {
  db.all('SELECT repo_name, date, views, uniques FROM repo_views ORDER BY repo_name, date', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`\u{1F680} Server running on http://localhost:${PORT}`);
});
