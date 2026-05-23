const GH_USER = 'gvogas';
const CACHE_KEY = 'gh-graph-v2';
const CACHE_TTL_MS = 60 * 60 * 1000;
const PRIMARY_URL  = `https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=all`;
const FALLBACK_URL = `https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=last`;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 53;

const monthShort = (d) => d.toLocaleDateString(undefined, { month: 'short' });

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// First Sunday on or before Jan 1 of the given year — the leftmost column
// when GitHub renders a single-year heatmap.
function yearChartStart(year) {
  const jan1 = startOfDay(new Date(year, 0, 1));
  return new Date(jan1.getTime() - jan1.getDay() * DAY_MS);
}

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

async function fetchAllYears() {
  const tryURL = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  try {
    return await tryURL(PRIMARY_URL);
  } catch {
    return await tryURL(FALLBACK_URL);
  }
}

export async function initGithubGraph() {
  const root = document.getElementById('github-graph');
  if (!root) return;

  const grid    = root.querySelector('.github-graph__grid');
  const months  = root.querySelector('.github-graph__months');
  const totalEl = root.querySelector('.github-graph__total');
  const tooltip = root.querySelector('.github-graph__tooltip');
  const tabsEl  = root.querySelector('.github-graph__tabs');
  if (!grid || !months || !totalEl || !tabsEl) return;

  // State
  let byDate = new Map();       // date → { count, level }
  let yearMaxima = new Map();   // year → max daily count (for fallback level calc)
  let yearTotals = new Map();   // year → total count
  let activeYear = null;

  function indexRecords(records) {
    byDate = new Map();
    yearMaxima = new Map();
    yearTotals = new Map();
    for (const r of records) {
      const y = Number(r.date.slice(0, 4));
      byDate.set(r.date, r);
      const curMax = yearMaxima.get(y) || 0;
      if (r.count > curMax) yearMaxima.set(y, r.count);
      yearTotals.set(y, (yearTotals.get(y) || 0) + (r.count || 0));
    }
  }

  function renderYear(year) {
    activeYear = year;
    root.setAttribute('aria-busy', 'false');
    const start = yearChartStart(year);
    const yearMax = yearMaxima.get(year) || 0;
    const today = startOfDay(new Date()).getTime();

    const frag = document.createDocumentFragment();
    const monthLabels = [];
    let lastLabelCol = -3;

    for (let col = 0; col < WEEKS; col++) {
      const colStart = new Date(start.getTime() + col * 7 * DAY_MS);
      const colYear = colStart.getFullYear();

      // Month label decision — only label columns whose first in-year day
      // starts a new month within the active year.
      const firstInYearDay = (() => {
        for (let r = 0; r < 7; r++) {
          const d = new Date(colStart.getTime() + r * DAY_MS);
          if (d.getFullYear() === year) return d;
        }
        return null;
      })();
      if (firstInYearDay) {
        const m = firstInYearDay.getMonth();
        const prevColStart = col > 0 ? new Date(start.getTime() + (col - 1) * 7 * DAY_MS) : null;
        const prevFirstInYear = prevColStart ? (() => {
          for (let r = 0; r < 7; r++) {
            const d = new Date(prevColStart.getTime() + r * DAY_MS);
            if (d.getFullYear() === year) return d;
          }
          return null;
        })() : null;
        const monthChanged = !prevFirstInYear || prevFirstInYear.getMonth() !== m;
        if (monthChanged && col - lastLabelCol > 2 && firstInYearDay.getDate() <= 14) {
          monthLabels.push({ col, label: monthShort(firstInYearDay) });
          lastLabelCol = col;
        }
      }

      for (let row = 0; row < 7; row++) {
        const d = new Date(colStart.getTime() + row * DAY_MS);
        if (d.getFullYear() !== year) continue;          // skip out-of-year padding
        if (d.getTime() > today) continue;               // skip future days

        const iso = isoDate(d);
        const rec = byDate.get(iso);
        const count = rec ? (rec.count || 0) : 0;
        const level = rec && typeof rec.level === 'number'
          ? rec.level
          : levelFor(count, yearMax);

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

    const total = yearTotals.get(year) || 0;
    totalEl.innerHTML = `<strong>${total.toLocaleString()}</strong> contributions in ${year}`;
  }

  function renderTabs(years) {
    tabsEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    years.forEach((y) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'github-graph__tab';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('data-year', String(y));
      btn.setAttribute('aria-selected', String(y === activeYear));
      if (y === activeYear) btn.classList.add('github-graph__tab--active');
      btn.textContent = String(y);
      frag.appendChild(btn);
    });
    tabsEl.appendChild(frag);
  }

  function pickDefaultYear(years) {
    const now = new Date().getFullYear();
    if (years.includes(now)) return now;
    return years[0]; // years sorted descending
  }

  function paintFromData(payload) {
    const records = Array.isArray(payload.contributions) ? payload.contributions : [];
    indexRecords(records);

    // Derive available years from `total` keys (excluding `lastYear`) and from
    // the data itself as a safety net.
    const yearsFromTotals = Object.keys(payload.total || {})
      .filter(k => /^\d{4}$/.test(k))
      .map(Number);
    const yearsFromData = [...yearTotals.keys()];
    const years = [...new Set([...yearsFromTotals, ...yearsFromData])]
      .sort((a, b) => b - a);

    if (years.length === 0) {
      root.innerHTML = '<span class="github-stats__error">No contribution data available.</span>';
      return;
    }

    activeYear = pickDefaultYear(years);
    renderTabs(years);
    renderYear(activeYear);
  }

  // Tab clicks
  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-year]');
    if (!btn) return;
    const y = Number(btn.getAttribute('data-year'));
    if (y === activeYear) return;
    tabsEl.querySelectorAll('button').forEach(b => {
      const active = Number(b.getAttribute('data-year')) === y;
      b.classList.toggle('github-graph__tab--active', active);
      b.setAttribute('aria-selected', String(active));
    });
    renderYear(y);
  });

  // Tooltip — delegated mouseover/focus on the grid.
  function showTipFor(cell) {
    if (!tooltip) return;
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
    if (tooltip) tooltip.setAttribute('aria-hidden', 'true');
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

  // Hydrate from cache for instant paint, then refresh in background.
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS && cached.payload) {
        paintFromData(cached.payload);
      } else {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }
  } catch { /* ignore */ }

  let live;
  try {
    live = await fetchAllYears();
  } catch {
    if (!grid.children.length) {
      root.innerHTML = '<span class="github-stats__error">Contribution graph unavailable.</span>';
    }
    return;
  }

  paintFromData(live);

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ payload: live, ts: Date.now() }));
  } catch { /* quota / private mode — ignore */ }
}
