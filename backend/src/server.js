const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database(path.join(__dirname, '../db/stats.db'));

app.use(cors());

// Get all repo names
app.get('/api/repos', (req, res) => {
  db.all('SELECT DISTINCT repo_name FROM repo_views ORDER BY repo_name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const repoNames = rows.map(row => row.repo_name);
    res.json(repoNames);
  });
});

// Utility to generate all dates between two
function getAllDates(startDateStr, endDateStr) {
    const result = [];
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      result.push(d.toISOString().slice(0, 10));
    }
    return result;
  }

// Get data for a selected repo
app.get('/api/views', (req, res) => {
    const repo = req.query.repo;
    if (!repo) return res.status(400).json({ error: 'Repo is required' });
  
    // Step 1: Get the global minimum date
    db.get('SELECT MIN(date) as minDate FROM repo_views', [], (err, minResult) => {
      if (err) return res.status(500).json({ error: err.message });
      const minDate = minResult?.minDate;
      if (!minDate) return res.json([]); // no data at all
  
      const today = new Date().toISOString().slice(0, 10);
      const allDates = getAllDates(minDate, today);
  
      // Step 2: Get actual data for selected repo
      db.all(
        'SELECT date, views, uniques FROM repo_views WHERE repo_name = ?',
        [repo],
        (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
  
          const dataMap = new Map(rows.map(row => [row.date, row]));
          const filledData = allDates.map(date => {
            const entry = dataMap.get(date);
            return {
              date,
              views: entry ? entry.views : 0,
              uniques: entry ? entry.uniques : 0,
            };
          });
  
          res.json(filledData);
        }
      );
    });
  });

  

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
