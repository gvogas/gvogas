const GH_USER = 'gvogas';
const CACHE_KEY = 'gh-graph-v1';
const CACHE_TTL_MS = 60 * 60 * 1000;
const PRIMARY_URL  = `https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=last`;
const FALLBACK_URL = `https://github-contributions.vercel.app/api/v1/${GH_USER}`;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 53;

const monthShort = (d) => d.toLocaleDateString(undefined, { month: 'short' });
const isoDate = (d) => d.toISOString().slice(0, 10);

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// The chart's leftmost column is the Sunday 52 weeks before the most recent
// Sunday on or before today. Same convention GitHub uses.
function chartStart(today = new Date()) {
  const t = startOfDay(today);
  const offsetToSun = t.getDay(); // 0..6, Sun=0
  const lastSun = new Date(t.getTime() - offsetToSun * DAY_MS);
  return new Date(lastSun.getTime() - (WEEKS - 1) * 7 * DAY_MS);
}

async function fetchContributions() {
  const tryParse = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Normalise — both endpoints expose { contributions: [{date, count, level?}], total?: { lastYear? } }
    const list = Array.isArray(data.contributions) ? data.contributions : [];
    if (list.length === 0) throw new Error('Empty contributions');
    const total = data.total && (data.total.lastYear ?? data.total.last_year ?? null);
    return { list, total };
  };
  try {
    return await tryParse(PRIMARY_URL);
  } catch {
    return await tryParse(FALLBACK_URL);
  }
}

// Bucket a raw daily count into a 0..4 level when the API didn't pre-compute it.
function levelFor(count, max) {
  if (!count) return 0;
  if (max <= 0) return 0;
  const r = count / max;
  if (r <= 0.25) return 1;
  if (r <= 0.50) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

function formatTooltipDate(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export async function initGithubGraph() {
  const root = document.getElementById('github-graph');
  if (!root) return;

  const grid    = root.querySelector('.github-graph__grid');
  const months  = root.querySelector('.github-graph__months');
  const totalEl = root.querySelector('.github-graph__total');
  const tooltip = root.querySelector('.github-graph__tooltip');
  if (!grid || !months || !totalEl) return;

  const start = chartStart();

  function renderFrom(records, totalCount) {
    // Build a date → record lookup for O(1) access while iterating the grid.
    const byDate = new Map();
    let max = 0;
    for (const r of records) {
      byDate.set(r.date, r);
      if (r.count > max) max = r.count;
    }

    const frag = document.createDocumentFragment();
    let countWithinWindow = 0;
    const monthLabels = []; // [{ col, label }]
    let lastLabelCol = -3;

    for (let col = 0; col < WEEKS; col++) {
      // Track first day of this column for the month label decision.
      const colStart = new Date(start.getTime() + col * 7 * DAY_MS);
      const colMonth = colStart.getMonth();
      const colYear  = colStart.getFullYear();
      const prevColStart = col > 0 ? new Date(start.getTime() + (col - 1) * 7 * DAY_MS) : null;
      const monthChanged = !prevColStart || prevColStart.getMonth() !== colMonth || prevColStart.getFullYear() !== colYear;
      if (monthChanged && col - lastLabelCol > 2) {
        monthLabels.push({ col, label: monthShort(colStart) });
        lastLabelCol = col;
      }

      for (let row = 0; row < 7; row++) {
        const d = new Date(colStart.getTime() + row * DAY_MS);
        // Skip rendering future days (last column may bleed past today).
        if (d.getTime() > Date.now()) continue;
        const iso = isoDate(d);
        const rec = byDate.get(iso);
        const count = rec ? rec.count : 0;
        const level = rec && typeof rec.level === 'number' ? rec.level : levelFor(count, max);
        countWithinWindow += count;

        const cell = document.createElement('div');
        cell.className = 'github-graph__cell';
        cell.setAttribute('data-level', String(level));
        cell.setAttribute('data-date', iso);
        cell.setAttribute('data-count', String(count));
        cell.setAttribute('tabindex', '0');
        cell.style.gridColumnStart = String(col + 1);
        cell.style.gridRowStart    = String(row + 1);
        frag.appendChild(cell);
      }
    }

    grid.innerHTML = '';
    grid.appendChild(frag);

    months.innerHTML = '';
    const monthsFrag = document.createDocumentFragment();
    for (const { col, label } of monthLabels) {
      const span = document.createElement('span');
      span.textContent = label;
      span.style.gridColumnStart = String(col + 1);
      monthsFrag.appendChild(span);
    }
    months.appendChild(monthsFrag);

    const displayTotal = typeof totalCount === 'number' ? totalCount : countWithinWindow;
    totalEl.innerHTML = `<strong>${displayTotal.toLocaleString()}</strong> contributions in the last year`;
    root.setAttribute('aria-busy', 'false');
  }

  // Tab-level cache — keep the heatmap snappy across reloads.
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS && Array.isArray(cached.contributions)) {
        renderFrom(cached.contributions, cached.total);
      } else {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }
  } catch { /* ignore */ }

  // Always fetch fresh in the background; if we already painted from cache the
  // re-render is a no-op visually unless the counts changed.
  let live;
  try {
    live = await fetchContributions();
  } catch {
    if (!grid.children.length) {
      root.innerHTML = '<span class="github-stats__error">Contribution graph unavailable.</span>';
    }
    return;
  }

  renderFrom(live.list, live.total);

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      contributions: live.list,
      total: live.total,
      ts: Date.now(),
    }));
  } catch { /* quota / private mode — ignore */ }

  // Tooltip — delegated mouseover/focus on the grid.
  if (!tooltip) return;
  function showTipFor(cell) {
    const date  = cell.getAttribute('data-date');
    const count = Number(cell.getAttribute('data-count') || 0);
    const d = new Date(date + 'T00:00:00');
    const label = count === 0
      ? `No contributions on ${formatTooltipDate(d)}`
      : `${count.toLocaleString()} contribution${count === 1 ? '' : 's'} on ${formatTooltipDate(d)}`;
    tooltip.textContent = label;
    tooltip.setAttribute('aria-hidden', 'false');

    const cellRect = cell.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const x = cellRect.left - rootRect.left + cellRect.width / 2;
    const y = cellRect.top  - rootRect.top;
    tooltip.style.left = `${x}px`;
    tooltip.style.top  = `${y}px`;
  }
  function hideTip() {
    tooltip.setAttribute('aria-hidden', 'true');
  }
  grid.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.github-graph__cell');
    if (cell) showTipFor(cell);
  });
  grid.addEventListener('mouseleave', hideTip);
  grid.addEventListener('focusin', (e) => {
    const cell = e.target.closest('.github-graph__cell');
    if (cell) showTipFor(cell);
  });
  grid.addEventListener('focusout', hideTip);
}
