import { makeCommitCounter } from './gh-commits.js';

const GH_USER = 'gvogas';
const CACHE_KEY = 'gh-stats-v1';
const CACHE_TTL_MS = 30 * 60 * 1000;

export async function initGithubStats() {
  const grid = document.getElementById('github-stats-grid');
  if (!grid) return;

  const cards = {};
  grid.querySelectorAll('[data-stat]').forEach(card => {
    cards[card.dataset.stat] = card;
  });

  function setStat(name, value, sub) {
    const card = cards[name];
    if (!card) return;
    const valueEl = card.querySelector('.github-stats__value');
    if (valueEl) {
      valueEl.textContent = typeof value === 'number' ? value.toLocaleString() : value;
    }
    if (sub !== undefined) {
      const subEl = card.querySelector('.github-stats__sub');
      if (subEl) subEl.textContent = sub;
    }
  }

  function setError(name) {
    const card = cards[name];
    if (!card) return;
    const valueEl = card.querySelector('.github-stats__value');
    if (valueEl) {
      valueEl.innerHTML = '<span class="github-stats__error">unavailable</span>';
    }
  }

  // Tab-level cache so a reload after the first successful run is instant.
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        setStat('repos', cached.repos);
        setStat('stars', cached.stars);
        setStat('followers', cached.followers);
        setStat('language', cached.language || '—');
        setStat('commits', cached.commits, `across ${cached.repos} repos`);
        return;
      }
    }
  } catch { /* ignore corrupt cache */ }

  const userPromise = fetch(`https://api.github.com/users/${GH_USER}`)
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)));

  const reposPromise = fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`)
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)));

  let userOk = false;
  let reposOk = false;
  let repos = [];
  let followers, publicRepos, stars, topLanguage;

  try {
    const user = await userPromise;
    followers = user.followers;
    publicRepos = user.public_repos;
    setStat('followers', followers);
    setStat('repos', publicRepos);
    userOk = true;
  } catch {
    setError('followers');
    setError('repos');
  }

  try {
    repos = await reposPromise;
    if (!Array.isArray(repos)) repos = [];
    stars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
    // Top language = mode of non-null language; tie-break by total stars desc.
    const langStats = new Map();
    for (const r of repos) {
      if (!r.language) continue;
      const cur = langStats.get(r.language) || { count: 0, stars: 0 };
      cur.count += 1;
      cur.stars += r.stargazers_count || 0;
      langStats.set(r.language, cur);
    }
    if (langStats.size > 0) {
      topLanguage = [...langStats.entries()].sort((a, b) =>
        b[1].count - a[1].count || b[1].stars - a[1].stars
      )[0][0];
    } else {
      topLanguage = '—';
    }
    setStat('stars', stars);
    setStat('language', topLanguage);
    // Correct the repo count from the actual listing.
    setStat('repos', repos.length);
    publicRepos = repos.length;
    reposOk = true;
  } catch {
    setError('stars');
    setError('language');
    if (!userOk) setError('repos');
  }

  if (!reposOk || repos.length === 0) {
    setError('commits');
    return;
  }

  // Progressive commit total — one request per repo, sequential to keep the
  // unauthenticated rate-limit headroom intact and to give a visible ticking
  // animation rather than a sudden drop-in.
  const counter = makeCommitCounter(GH_USER);
  let total = 0;
  let resolved = 0;
  let rateLimited = false;
  setStat('commits', 0, `0 / ${repos.length} repos`);

  for (const r of repos) {
    try {
      const n = await counter.ensure(r.name);
      if (typeof n === 'number') total += n;
    } catch (err) {
      if (err && err.status === 403) {
        rateLimited = true;
        break;
      }
    }
    resolved += 1;
    setStat('commits', total, `${resolved} / ${repos.length} repos`);
  }

  if (rateLimited) {
    setStat('commits', total, `so far — rate-limited (${resolved} / ${repos.length} repos)`);
    return;
  }

  setStat('commits', total, `across ${repos.length} repos`);

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      repos: publicRepos,
      stars,
      followers,
      language: topLanguage,
      commits: total,
      ts: Date.now(),
    }));
  } catch { /* quota / private mode — ignore */ }
}
