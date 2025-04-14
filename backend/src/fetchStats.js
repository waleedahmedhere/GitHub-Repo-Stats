const { log } = require('./logger');
const axios = require('axios');
const dotenv = require('dotenv');
const cron = require('node-cron');
const { saveView } = require('./db');

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
log('🔑 GitHub Token loaded:', GITHUB_TOKEN ? '✅' : '❌ Not loaded');

async function fetchAllUserRepos() {
  const repos = [];
  let page = 1;
  let more = true;

  while (more) {
    const url = `https://api.github.com/user/repos?per_page=100&page=${page}`;
    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'User-Agent': 'GitHub-Stats-Tracker'
        }
      });

      if (res.data.length === 0) {
        more = false;
      } else {
        const repoNames = res.data.map(repo => repo.full_name);
        repos.push(...repoNames);
        page++;
      }
    } catch (err) {
      log('❌ Error fetching user repos:', err.response?.data || err.message);
      break;
    }
  }

  return repos;
}

async function fetchRepoViews(repo) {
  const url = `https://api.github.com/repos/${repo}/traffic/views`;

  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'GitHub-Stats-Tracker'
      }
    });

    const views = res.data.views;
    for (const day of views) {
      const date = day.timestamp.slice(0, 10); // YYYY-MM-DD
      saveView(repo, date, day.count, day.uniques);
    }

    log(`✅ Synced: ${repo}`);
  } catch (err) {
    log(`❌ Error fetching stats for ${repo}:`, err.response?.data || err.message);
  }
}

// 📦 Main sync function
async function runSync() {
  const repos = await fetchAllUserRepos();

  log('\n📦 Repositories found:');
  repos.forEach((repo, i) => {
    log(`${i + 1}. ${repo}`);
  });

  for (const repo of repos) {
    await fetchRepoViews(repo);
  }

  log('\n✅ All repositories synced');
}

// 🚀 Run once on start
runSync();

// ⏰ Schedule to run every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
  log('\n🕒 Running daily GitHub sync...');
  runSync();
});
