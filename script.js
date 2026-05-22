(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Progress bar ──────────────────────────────────────────────
  const progressBar = document.getElementById('progress-bar');
  function updateProgress() {
    const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    progressBar.style.transform = `scaleX(${Math.min(scrolled, 1)})`;
  }

  // ── Nav: scrolled class for backdrop ─────────────────────────
  const nav = document.getElementById('nav');
  function updateNav() {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }

  window.addEventListener('scroll', () => {
    updateProgress();
    updateNav();
    updateActiveLink();
  }, { passive: true });

  updateNav();
  updateProgress();

  // ── Mobile hamburger ──────────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('open') && !nav.contains(e.target)) {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  // ── Active nav link on scroll ─────────────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav__links a[href^="#"]');
  const NAV_OFFSET = 80;

  function updateActiveLink() {
    let current = '';
    sections.forEach(section => {
      if (window.scrollY >= section.offsetTop - NAV_OFFSET) {
        current = section.id;
      }
    });
    navAnchors.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
  }
  updateActiveLink();

  // ── Card radial glow on mouse move ────────────────────────────
  if (!prefersReducedMotion) {
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mx', `${x}%`);
        card.style.setProperty('--my', `${y}%`);
      });
    });
  }

  // ── Scroll reveal ─────────────────────────────────────────────
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  } else {
    const reveals = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const parent = el.parentElement;
        const siblings = Array.from(parent.querySelectorAll('.reveal:not(.visible)'));
        const idx = siblings.indexOf(el);
        const delay = Math.min(idx * 70, 280);

        setTimeout(() => el.classList.add('visible'), delay);
        observer.unobserve(el);
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -48px 0px' });

    reveals.forEach(el => observer.observe(el));
  }
  // ── Commit Skyline ────────────────────────────────────────────
  initCity();
})();

// ── City module ───────────────────────────────────────────────────
async function initCity() {
  const GH_USER = 'gvogas';
  const canvas  = document.getElementById('city-canvas');
  const loading = document.getElementById('city-loading');
  const tooltip = document.getElementById('city-tooltip');
  const legend  = document.getElementById('city-legend');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Language → base color
  const LANG_COLORS = {
    'Python':      '#3572a5',
    'Java':        '#b07219',
    'JavaScript':  '#f1e05a',
    'TypeScript':  '#3178c6',
    'PHP':         '#6a4f9b',
    'C#':          '#178600',
    'Dart':        '#00b4ab',
    'HTML':        '#e44b23',
    'CSS':         '#563d7c',
    'C++':         '#f34b7d',
    'C':           '#555555',
    'ShaderLab':   '#222c37',
    'Swift':       '#f05138',
    'Kotlin':      '#a97bff',
    'Ruby':        '#701516',
    'Go':          '#00add8',
    'Rust':        '#dea584',
  };
  const DEFAULT_COLOR = '#4f9cf9';

  function getBuildingColors(lang) {
    const base = LANG_COLORS[lang] || DEFAULT_COLOR;
    return { top: base, right: shade(base, 0.6), left: shade(base, 0.35) };
  }

  // Shade a hex color by a factor (0=black, 1=original)
  function shade(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 0xff) * factor);
    const g = Math.round(((n >> 8)  & 0xff) * factor);
    const b = Math.round((n & 0xff) * factor);
    return `rgb(${r},${g},${b})`;
  }

  // ── Fetch repos ───────────────────────────────────────────────
  let repos = [];
  try {
    const res = await fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`);
    repos = await res.json();
    if (!Array.isArray(repos)) repos = [];
  } catch (_) { repos = []; }

  if (repos.length === 0) {
    loading.innerHTML = '<span style="color:var(--text-dim);font-size:.85rem">Could not load repositories.</span>';
    return;
  }

  // ── Fetch commit counts ───────────────────────────────────────
  async function fetchCommits(repoName) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GH_USER}/${repoName}/commits?per_page=1`
      );
      const link = res.headers.get('Link') || '';
      const m = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
      return m ? parseInt(m[1], 10) : 1;
    } catch (_) { return 1; }
  }

  const commitResults = await Promise.allSettled(repos.map(r => fetchCommits(r.name)));
  const buildings = repos.map((r, i) => ({
    name:     r.name,
    url:      r.html_url,
    language: r.language || 'Other',
    commits:  commitResults[i].status === 'fulfilled' ? commitResults[i].value : 1,
  }));

  // Sort tallest first
  buildings.sort((a, b) => b.commits - a.commits);

  // ── Layout: grid ──────────────────────────────────────────────
  const N = buildings.length;
  const COLS = Math.ceil(Math.sqrt(N * 1.5));
  buildings.forEach((b, i) => {
    b.gx = (i % COLS) * 2;
    b.gy = Math.floor(i / COLS) * 2;
  });

  // ── Height calc ───────────────────────────────────────────────
  const maxC = Math.max(...buildings.map(b => b.commits));
  const MIN_FLOORS = 8, MAX_FLOORS = 70;
  buildings.forEach(b => {
    b.floors = Math.round(MIN_FLOORS + (b.commits / maxC) * (MAX_FLOORS - MIN_FLOORS));
    b.targetFloors = b.floors;
    b.currentFloors = 0;
  });

  // ── Canvas sizing ─────────────────────────────────────────────
  const TILE_W = 64, TILE_H = 32, FLOOR_H = 5;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w   = canvas.parentElement.clientWidth;
    const rows = Math.ceil(N / COLS);

    // World extents → screen extents
    const maxGx = (COLS - 1) * 2, maxGy = (rows - 1) * 2;
    const sceneW = (maxGx + maxGy + 2) * TILE_W / 2 + 60;
    const sceneH = (maxGx + maxGy + 2) * TILE_H / 2 + MAX_FLOORS * FLOOR_H + 80;

    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(Math.min(sceneH, 560) * dpr);
    canvas.style.height = Math.min(sceneH, 560) + 'px';
    ctx.scale(dpr, dpr);
  }
  resize();

  // ── Projection ────────────────────────────────────────────────
  function isoProject(gx, gy, gz) {
    const logicalW = canvas.width / (window.devicePixelRatio || 1);
    const logicalH = canvas.height / (window.devicePixelRatio || 1);
    const rows = Math.ceil(N / COLS);
    const originX = logicalW / 2;
    const originY = logicalH * 0.85;
    return {
      x: originX + (gx - gy) * TILE_W / 2,
      y: originY + (gx + gy) * TILE_H / 2 - gz * FLOOR_H,
    };
  }

  // ── Hit boxes for hover ───────────────────────────────────────
  let hitBoxes = [];

  // ── Draw ──────────────────────────────────────────────────────
  function draw(progress) {
    const logicalW = canvas.width / (window.devicePixelRatio || 1);
    const logicalH = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, logicalW, logicalH);

    hitBoxes = [];

    // Draw ground grid
    const rows = Math.ceil(N / COLS);
    ctx.strokeStyle = 'rgba(48,54,61,0.5)';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= (COLS - 1) * 2 + 1; gx++) {
      for (let gy = 0; gy <= (rows - 1) * 2 + 1; gy++) {
        const p0 = isoProject(gx,     gy,     0);
        const p1 = isoProject(gx + 1, gy,     0);
        const p2 = isoProject(gx + 1, gy + 1, 0);
        const p3 = isoProject(gx,     gy + 1, 0);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Sort back-to-front
    const sorted = [...buildings].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

    sorted.forEach(b => {
      const floors = Math.round(b.targetFloors * progress);
      if (floors === 0) return;

      const colors = getBuildingColors(b.language);
      const gx = b.gx, gy = b.gy;

      // 8 corners
      const p00 = isoProject(gx,     gy,     0);
      const p10 = isoProject(gx + 1, gy,     0);
      const p11 = isoProject(gx + 1, gy + 1, 0);
      const p01 = isoProject(gx,     gy + 1, 0);
      const p0h = isoProject(gx,     gy,     floors);
      const p1h = isoProject(gx + 1, gy,     floors);
      const p2h = isoProject(gx + 1, gy + 1, floors);
      const p3h = isoProject(gx,     gy + 1, floors);

      // Left face
      ctx.beginPath();
      ctx.moveTo(p00.x, p00.y);
      ctx.lineTo(p01.x, p01.y);
      ctx.lineTo(p3h.x, p3h.y);
      ctx.lineTo(p0h.x, p0h.y);
      ctx.closePath();
      ctx.fillStyle = colors.left;
      ctx.fill();

      // Right face
      ctx.beginPath();
      ctx.moveTo(p10.x, p10.y);
      ctx.lineTo(p11.x, p11.y);
      ctx.lineTo(p2h.x, p2h.y);
      ctx.lineTo(p1h.x, p1h.y);
      ctx.closePath();
      ctx.fillStyle = colors.right;
      ctx.fill();

      // Top face
      ctx.beginPath();
      ctx.moveTo(p0h.x, p0h.y);
      ctx.lineTo(p1h.x, p1h.y);
      ctx.lineTo(p2h.x, p2h.y);
      ctx.lineTo(p3h.x, p3h.y);
      ctx.closePath();
      ctx.fillStyle = colors.top;
      ctx.fill();

      // Windows on right face
      if (floors > 4) {
        ctx.fillStyle = 'rgba(255,240,180,0.55)';
        const wCols = 2, wRows = Math.min(Math.floor(floors / 5), 8);
        for (let wr = 0; wr < wRows; wr++) {
          for (let wc = 0; wc < wCols; wc++) {
            const wx = 0.25 + wc * 0.45;
            const wz = 3 + wr * 5;
            if (wz >= floors) continue;
            const wa = isoProject(gx + 1, gy + wx,       wz + 2);
            const wb = isoProject(gx + 1, gy + wx + 0.2, wz + 2);
            const wbBot = isoProject(gx + 1, gy + wx + 0.2, wz);
            const waBot = isoProject(gx + 1, gy + wx,       wz);
            ctx.beginPath();
            ctx.moveTo(wa.x, wa.y);
            ctx.lineTo(wb.x, wb.y);
            ctx.lineTo(wbBot.x, wbBot.y);
            ctx.lineTo(waBot.x, waBot.y);
            ctx.closePath();
            ctx.fill();
          }
        }
        // Windows on left face
        for (let wr = 0; wr < wRows; wr++) {
          for (let wc = 0; wc < wCols; wc++) {
            const wy = 0.25 + wc * 0.45;
            const wz = 3 + wr * 5;
            if (wz >= floors) continue;
            const wa = isoProject(gx + wy,       gy + 1, wz + 2);
            const wb = isoProject(gx + wy + 0.2, gy + 1, wz + 2);
            const wbBot = isoProject(gx + wy + 0.2, gy + 1, wz);
            const waBot = isoProject(gx + wy,       gy + 1, wz);
            ctx.beginPath();
            ctx.moveTo(wa.x, wa.y);
            ctx.lineTo(wb.x, wb.y);
            ctx.lineTo(wbBot.x, wbBot.y);
            ctx.lineTo(waBot.x, waBot.y);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // Label below building
      const labelPt = isoProject(gx + 0.5, gy + 1.1, 0);
      const maxLabelW = TILE_W * 1.2;
      ctx.save();
      ctx.font = '600 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(139,148,158,0.85)';
      ctx.textAlign = 'center';
      // Truncate name
      let label = b.name.replace(/-/g, ' ').replace(/_/g, ' ');
      while (ctx.measureText(label).width > maxLabelW && label.length > 4) {
        label = label.slice(0, -1);
      }
      if (label !== b.name.replace(/-/g, ' ').replace(/_/g, ' ')) label += '…';
      ctx.fillText(label, labelPt.x, labelPt.y + 8);
      ctx.restore();

      // Hit box (bounding rect of the whole building screen footprint)
      const xs = [p00.x, p10.x, p11.x, p01.x, p0h.x, p1h.x, p2h.x, p3h.x];
      const ys = [p00.y, p10.y, p11.y, p01.y, p0h.y, p1h.y, p2h.y, p3h.y];
      hitBoxes.push({
        b,
        x1: Math.min(...xs),
        y1: Math.min(...ys),
        x2: Math.max(...xs),
        y2: Math.max(...ys),
      });
    });
  }

  // ── Grow animation ────────────────────────────────────────────
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function animate() {
    const DURATION = 1100;
    const prefersRM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersRM) { draw(1); return; }

    const start = performance.now();
    function frame(now) {
      const t = Math.min((now - start) / DURATION, 1);
      draw(easeOutExpo(t));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ── Tooltip ───────────────────────────────────────────────────
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const hit = hitBoxes.find(h => mx >= h.x1 && mx <= h.x2 && my >= h.y1 && my <= h.y2);
    if (hit) {
      canvas.style.cursor = 'pointer';
      const color = LANG_COLORS[hit.b.language] || DEFAULT_COLOR;
      tooltip.innerHTML = `
        <div class="city__tooltip-name">${hit.b.name.replace(/-/g,'‑')}</div>
        <div class="city__tooltip-row">
          <span class="city__tooltip-dot" style="background:${color}"></span>
          ${hit.b.language}
        </div>
        <div class="city__tooltip-row" style="margin-top:4px">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
          ${hit.b.commits.toLocaleString()} commits
        </div>`;
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden', 'false');
      const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
      let tx = e.clientX + 14, ty = e.clientY - th / 2;
      if (tx + tw > window.innerWidth - 8) tx = e.clientX - tw - 14;
      if (ty < 8) ty = 8;
      if (ty + th > window.innerHeight - 8) ty = window.innerHeight - th - 8;
      tooltip.style.left = tx + 'px';
      tooltip.style.top  = ty + 'px';
    } else {
      canvas.style.cursor = 'default';
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    }
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.classList.remove('visible');
    tooltip.setAttribute('aria-hidden', 'true');
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = hitBoxes.find(h => mx >= h.x1 && mx <= h.x2 && my >= h.y1 && my <= h.y2);
    if (hit) window.open(hit.b.url, '_blank', 'noopener,noreferrer');
  });

  // ── Resize ────────────────────────────────────────────────────
  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); draw(1); }, 120);
  }).observe(canvas.parentElement);

  // ── Legend ────────────────────────────────────────────────────
  function buildLegend() {
    const seen = new Map();
    buildings.forEach(b => {
      if (!seen.has(b.language)) seen.set(b.language, LANG_COLORS[b.language] || DEFAULT_COLOR);
    });
    legend.innerHTML = [...seen.entries()].map(([lang, color]) => `
      <span class="city__legend-item">
        <span class="city__legend-dot" style="background:${color}"></span>
        ${lang}
      </span>`).join('');
  }
  buildLegend();

  // ── Reveal trigger ────────────────────────────────────────────
  const section = document.getElementById('city');
  let triggered = false;
  const cityObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !triggered) {
      triggered = true;
      loading.classList.add('hidden');
      resize();
      animate();
      cityObserver.disconnect();
    }
  }, { threshold: 0.15 });
  cityObserver.observe(section);

  // Pre-draw static frame while waiting for scroll
  draw(0);
}
