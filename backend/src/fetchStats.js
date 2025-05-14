const { log } = require('./logger');
const axios = require('axios');
const dotenv = require('dotenv');
const cron = require('node-cron');
const { saveView } = require('./db');

dotenv.config();

const TOKENS = process.env.GITHUB_TOKENS?.split(',') || [];
console.log('🔑 GitHub Tokens loaded:', TOKENS.length);
log('🔑 GitHub Tokens loaded:', TOKENS.length);

async function fetchAllUserRepos(token) {
  const repos = [];
  let page = 1;
  let more = true;

  while (more) {
    const url = `https://api.github.com/user/repos?per_page=100&page=${page}`;
    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `token ${token}`,
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
      log('❌ Error fetching repos:', err.response?.data || err.message);
      break;
    }
  }

  return repos;
}

async function fetchRepoViews(token, repo) {
  const url = `https://api.github.com/repos/${repo}/traffic/views`;
  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'GitHub-Stats-Tracker'
      }
    });
    const views = res.data.views;
    for (const day of views) {
      const date = day.timestamp.slice(0, 10);
      saveView(repo, date, day.count, day.uniques);
    }
    log(`✅ Synced: ${repo}`);
  } catch (err) {
    log(`❌ Error fetching stats for ${repo}:`, err.response?.data || err.message);
    console.log('🔎 Full error:', err.response?.status, err.response?.data || err.message);
  }
}

async function runSync() {

  for (let i = 0; i < TOKENS.length; i++) {
    const token = TOKENS[i];
    log(`🔄 Syncing data using token ${i + 1}`);

    const repos = await fetchAllUserRepos(token);
    log(`📁 Repos found:`, repos.length);

    for (const repo of repos) {
      await fetchRepoViews(token, repo);

      // 🕒 Delay between repo API calls (helps prevent secondary rate limit)
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
    }

    // 🕒 Optional: Delay between tokens if you scale to many accounts
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
  }

  log('\n✅ All accounts synced');
}


runSync();
cron.schedule('1 0 * * *', () => {
  log('\n🕒 Running daily GitHub sync...');
  runSync();
});
