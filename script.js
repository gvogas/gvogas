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

  const LANG_COLORS = {
    'Python':      '#4584b6',
    'Java':        '#e76f00',
    'JavaScript':  '#f7df1e',
    'TypeScript':  '#3178c6',
    'PHP':         '#8892bf',
    'C#':          '#239120',
    'Dart':        '#00d2b8',
    'HTML':        '#e44b23',
    'CSS':         '#7b5ea7',
    'C++':         '#f34b7d',
    'C':           '#6e7681',
    'ShaderLab':   '#4a90d9',
    'Swift':       '#f05138',
    'Kotlin':      '#a97bff',
    'Ruby':        '#cc342d',
    'Go':          '#00acd7',
    'Rust':        '#dea584',
  };
  const DEFAULT_COLOR = '#4f9cf9';
  const SKY_COLOR = '#070b12';

  // Shade/tint a hex colour (factor < 1 = darker, > 1 = brighter, clamped)
  function shade(hex, factor) {
    const n = parseInt(hex.replace('#',''), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 0xff) * factor));
    const g = Math.min(255, Math.round(((n >> 8)  & 0xff) * factor));
    const b = Math.min(255, Math.round((n & 0xff) * factor));
    return `rgb(${r},${g},${b})`;
  }
  function hexAlpha(hex, a) {
    const n = parseInt(hex.replace('#',''), 16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
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
      const res = await fetch(`https://api.github.com/repos/${GH_USER}/${repoName}/commits?per_page=1`);
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

  buildings.sort((a, b) => b.commits - a.commits);

  const N    = buildings.length;
  const COLS = Math.ceil(Math.sqrt(N * 1.6));
  buildings.forEach((b, i) => {
    b.gx = (i % COLS) * 2;
    b.gy = Math.floor(i / COLS) * 2;
    b.animDelay = (i / N) * 0.38;
    // Deterministic window pattern (seeded per building)
    b.winPattern = Array.from({length: 60}, (_, k) => ((i * 17 + k * 13) % 7) > 1);
  });

  const maxC = Math.max(...buildings.map(b => b.commits));
  const MIN_FLOORS = 10, MAX_FLOORS = 62;
  buildings.forEach(b => {
    b.targetFloors = Math.round(MIN_FLOORS + (b.commits / maxC) * (MAX_FLOORS - MIN_FLOORS));
  });

  // ── Canvas & projection ───────────────────────────────────────
  let TILE_W = 76, TILE_H = 38, FLOOR_H = 6;
  let stars = [];

  function updateTileScale() {
    const w = canvas.parentElement.clientWidth;
    if (w < 480) {
      TILE_W = 46; TILE_H = 23; FLOOR_H = 4;
    } else if (w < 720) {
      TILE_W = 60; TILE_H = 30; FLOOR_H = 5;
    } else {
      TILE_W = 76; TILE_H = 38; FLOOR_H = 6;
    }
    buildings.forEach(b => {
      b.targetFloors = Math.round(MIN_FLOORS + (b.commits / maxC) * (MAX_FLOORS - MIN_FLOORS));
    });
  }

  function genStars(W, H) {
    stars = Array.from({length: 90}, (_, i) => ({
      x: ((i * 137.508) % 1) * W,
      y: ((i * 97.31)   % 1) * H * 0.52,
      r: i % 7 === 0 ? 1.2 : 0.7,
      o: 0.18 + ((i * 63.7) % 1) * 0.45,
    }));
  }

  function resize() {
    updateTileScale();
    const dpr = window.devicePixelRatio || 1;
    const w   = canvas.parentElement.clientWidth;
    const rows = Math.ceil(N / COLS);
    const maxGx = (COLS - 1) * 2, maxGy = (rows - 1) * 2;
    const sceneH = (maxGx + maxGy + 2) * TILE_H / 2 + MAX_FLOORS * FLOOR_H + 100;
    const h = Math.min(sceneH, 580);
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    genStars(w, h);
  }
  resize();

  function isoProject(gx, gy, gz) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    return {
      x: W / 2 + (gx - gy) * TILE_W / 2,
      y: H * 0.84 + (gx + gy) * TILE_H / 2 - gz * FLOOR_H,
    };
  }

  let hitBoxes = [];
  let hoveredBuilding = null;

  // ── Draw ──────────────────────────────────────────────────────
  function draw(globalT) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.clearRect(0, 0, W, H);

    // Night sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.8);
    sky.addColorStop(0, '#050810');
    sky.addColorStop(1, SKY_COLOR);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars
    stars.forEach(s => {
      ctx.globalAlpha = s.o;
      ctx.fillStyle = '#dde8f5';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    hitBoxes = [];
    const rows = Math.ceil(N / COLS);
    const sorted = [...buildings].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

    // Ground tiles
    for (let gx = 0; gx <= (COLS - 1) * 2 + 1; gx++) {
      for (let gy = 0; gy <= (rows - 1) * 2 + 1; gy++) {
        const p0 = isoProject(gx, gy, 0), p1 = isoProject(gx+1, gy, 0);
        const p2 = isoProject(gx+1, gy+1, 0), p3 = isoProject(gx, gy+1, 0);
        ctx.beginPath();
        ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y);
        ctx.lineTo(p2.x,p2.y); ctx.lineTo(p3.x,p3.y);
        ctx.closePath();
        ctx.fillStyle = '#0e1520';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.035)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Ground glow under each building
    sorted.forEach(b => {
      const localT = calcLocalT(b, globalT);
      if (localT < 0.05) return;
      const base = LANG_COLORS[b.language] || DEFAULT_COLOR;
      const center = isoProject(b.gx + 0.5, b.gy + 0.5, 0);
      const g = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, TILE_W * 0.9);
      g.addColorStop(0, hexAlpha(base, 0.18 * localT));
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(center.x, center.y + TILE_H * 0.1, TILE_W * 0.9, TILE_H * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Buildings (back-to-front)
    sorted.forEach(b => {
      const localT   = calcLocalT(b, globalT);
      const floors   = Math.round(b.targetFloors * localT);
      if (floors < 1) return;

      const isHov    = b === hoveredBuilding;
      const brt      = isHov ? 1.35 : 1;
      const base     = LANG_COLORS[b.language] || DEFAULT_COLOR;
      const colTop   = shade(base, 1.0  * brt);
      const colRight = shade(base, 0.62 * brt);
      const colLeft  = shade(base, 0.36 * brt);

      const gx = b.gx, gy = b.gy;
      const p00 = isoProject(gx,   gy,   0), p10 = isoProject(gx+1, gy,   0);
      const p11 = isoProject(gx+1, gy+1, 0), p01 = isoProject(gx,   gy+1, 0);
      const p0h = isoProject(gx,   gy,   floors), p1h = isoProject(gx+1, gy,   floors);
      const p2h = isoProject(gx+1, gy+1, floors), p3h = isoProject(gx,   gy+1, floors);

      function face(pts, fill) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      face([p00, p01, p3h, p0h], colLeft);
      face([p10, p11, p2h, p1h], colRight);
      face([p0h, p1h, p2h, p3h], colTop);

      // Roof edge highlight
      ctx.beginPath();
      ctx.moveTo(p0h.x, p0h.y); ctx.lineTo(p1h.x, p1h.y);
      ctx.lineTo(p2h.x, p2h.y); ctx.lineTo(p3h.x, p3h.y); ctx.closePath();
      ctx.strokeStyle = hexAlpha(base, isHov ? 0.9 : 0.55);
      ctx.lineWidth = isHov ? 1.5 : 0.8;
      ctx.stroke();

      // Hover outline
      if (isHov) {
        ctx.beginPath();
        ctx.moveTo(p0h.x,p0h.y); ctx.lineTo(p00.x,p00.y); ctx.lineTo(p01.x,p01.y);
        ctx.lineTo(p3h.x,p3h.y); ctx.moveTo(p1h.x,p1h.y); ctx.lineTo(p10.x,p10.y);
        ctx.lineTo(p11.x,p11.y); ctx.lineTo(p2h.x,p2h.y);
        ctx.strokeStyle = hexAlpha(base, 0.7);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Windows
      if (floors > 5) {
        const wCols = 3, wStep = 5;
        const maxWR = Math.min(Math.floor(floors / wStep), 12);
        let pi = 0;
        for (let wr = 0; wr < maxWR; wr++) {
          for (let wc = 0; wc < wCols; wc++, pi++) {
            const lit = b.winPattern[pi] ?? true;
            const wOpacity = lit ? (isHov ? 0.9 : 0.6) : 0.07;
            const wColor   = lit ? `rgba(255,240,150,${wOpacity})` : `rgba(30,45,70,${wOpacity})`;
            const wz = 2 + wr * wStep;
            if (wz + 2.5 > floors) continue;
            const wx = 0.14 + wc * 0.28;
            ctx.fillStyle = wColor;
            // right-face window
            const ra = isoProject(gx+1, gy+wx,      wz+2.5);
            const rb = isoProject(gx+1, gy+wx+0.17, wz+2.5);
            const rc = isoProject(gx+1, gy+wx+0.17, wz);
            const rd = isoProject(gx+1, gy+wx,      wz);
            ctx.beginPath(); ctx.moveTo(ra.x,ra.y); ctx.lineTo(rb.x,rb.y);
            ctx.lineTo(rc.x,rc.y); ctx.lineTo(rd.x,rd.y); ctx.closePath(); ctx.fill();
            // left-face window
            const la = isoProject(gx+wx,      gy+1, wz+2.5);
            const lb = isoProject(gx+wx+0.17, gy+1, wz+2.5);
            const lc = isoProject(gx+wx+0.17, gy+1, wz);
            const ld = isoProject(gx+wx,      gy+1, wz);
            ctx.beginPath(); ctx.moveTo(la.x,la.y); ctx.lineTo(lb.x,lb.y);
            ctx.lineTo(lc.x,lc.y); ctx.lineTo(ld.x,ld.y); ctx.closePath(); ctx.fill();
          }
        }
      }

      // Label
      const lp = isoProject(gx + 0.5, gy + 1.18, 0);
      ctx.save();
      ctx.font = `${isHov ? 600 : 500} ${isHov ? 10 : 9}px Inter,sans-serif`;
      ctx.fillStyle = isHov ? 'rgba(220,232,245,0.95)' : 'rgba(110,118,129,0.75)';
      ctx.textAlign = 'center';
      const maxLW = TILE_W * 1.4;
      let lbl = b.name.replace(/[-_]/g, ' ');
      while (ctx.measureText(lbl).width > maxLW && lbl.length > 3) lbl = lbl.slice(0,-1);
      if (lbl.length < b.name.length) lbl += '…';
      ctx.fillText(lbl, lp.x, lp.y + 10);
      ctx.restore();

      const xs = [p00,p10,p11,p01,p0h,p1h,p2h,p3h].map(p=>p.x);
      const ys = [p00,p10,p11,p01,p0h,p1h,p2h,p3h].map(p=>p.y);
      hitBoxes.push({ b, x1:Math.min(...xs), y1:Math.min(...ys), x2:Math.max(...xs), y2:Math.max(...ys) });
    });

    // Bottom fog (blends into section bg)
    const fog = ctx.createLinearGradient(0, H * 0.72, 0, H);
    fog.addColorStop(0, 'transparent');
    fog.addColorStop(1, '#161b22');
    ctx.fillStyle = fog;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
  }

  function calcLocalT(b, globalT) {
    if (globalT >= 1) return easeOutExpo(1);
    const t = Math.max(0, Math.min(1, (globalT - b.animDelay) / 0.68));
    return easeOutExpo(t);
  }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  // ── Animation ─────────────────────────────────────────────────
  function animate() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { draw(1); return; }
    const DURATION = 1800, start = performance.now();
    (function frame(now) {
      const t = Math.min((now - start) / DURATION, 1);
      draw(t);
      if (t < 1) requestAnimationFrame(frame);
    })(performance.now());
  }

  // ── Tooltip & interaction ─────────────────────────────────────
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = hitBoxes.find(h => mx>=h.x1 && mx<=h.x2 && my>=h.y1 && my<=h.y2);
    const newHov = hit ? hit.b : null;
    if (newHov !== hoveredBuilding) { hoveredBuilding = newHov; draw(1); }
    if (hit) {
      canvas.style.cursor = 'pointer';
      const color = LANG_COLORS[hit.b.language] || DEFAULT_COLOR;
      tooltip.innerHTML = `
        <div class="city__tooltip-name">${hit.b.name.replace(/-/g,'‑')}</div>
        <div class="city__tooltip-row"><span class="city__tooltip-dot" style="background:${color}"></span>${hit.b.language}</div>
        <div class="city__tooltip-row" style="margin-top:5px;gap:5px">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <strong style="color:var(--text)">${hit.b.commits.toLocaleString()}</strong> commits
        </div>`;
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden','false');
      const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
      let tx = e.clientX + 16, ty = e.clientY - th / 2;
      if (tx + tw > window.innerWidth - 8) tx = e.clientX - tw - 16;
      if (ty < 8) ty = 8;
      if (ty + th > window.innerHeight - 8) ty = window.innerHeight - th - 8;
      tooltip.style.left = tx + 'px';
      tooltip.style.top  = ty + 'px';
    } else {
      canvas.style.cursor = 'default';
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden','true');
    }
  });
  canvas.addEventListener('mouseleave', () => {
    hoveredBuilding = null; draw(1);
    tooltip.classList.remove('visible');
    tooltip.setAttribute('aria-hidden','true');
  });
  // Opens a repo URL reliably in a new tab (anchor click avoids popup blockers)
  function openRepo(url) {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  let recentTouch = false; // guard: skip click handler when touch already handled it

  canvas.addEventListener('click', (e) => {
    if (recentTouch) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = hitBoxes.find(h => mx >= h.x1 && mx <= h.x2 && my >= h.y1 && my <= h.y2);
    if (hit) openRepo(hit.b.url);
  });

  // ── Touch events (mobile tap) ─────────────────────────────────
  let lastTouchedBuilding = null;
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    recentTouch = true;
    setTimeout(() => { recentTouch = false; }, 500);
    const t = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = t.clientX - rect.left, my = t.clientY - rect.top;
    const hit = hitBoxes.find(h => mx >= h.x1 && mx <= h.x2 && my >= h.y1 && my <= h.y2);

    if (hit) {
      if (lastTouchedBuilding === hit.b) {
        openRepo(hit.b.url);
        lastTouchedBuilding = null;
        hoveredBuilding = null;
        draw(1);
        tooltip.classList.remove('visible');
        tooltip.setAttribute('aria-hidden', 'true');
      } else {
        lastTouchedBuilding = hit.b;
        hoveredBuilding = hit.b;
        draw(1);
        const color = LANG_COLORS[hit.b.language] || DEFAULT_COLOR;
        tooltip.innerHTML = `
          <div class="city__tooltip-name">${hit.b.name.replace(/-/g,'‑')}</div>
          <div class="city__tooltip-row"><span class="city__tooltip-dot" style="background:${color}"></span>${hit.b.language}</div>
          <div class="city__tooltip-row" style="margin-top:5px;gap:5px">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <strong style="color:var(--text)">${hit.b.commits.toLocaleString()}</strong> commits
          </div>
          <div style="margin-top:6px;font-size:.72rem;color:var(--accent);opacity:.8">tap again to open →</div>`;
        tooltip.classList.add('visible');
        tooltip.setAttribute('aria-hidden', 'false');
        const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
        let tx = t.clientX - tw / 2, ty = t.clientY - th - 20;
        tx = Math.max(8, Math.min(tx, window.innerWidth - tw - 8));
        if (ty < 8) ty = t.clientY + 20;
        tooltip.style.left = tx + 'px';
        tooltip.style.top  = ty + 'px';
      }
    } else {
      lastTouchedBuilding = null;
      hoveredBuilding = null;
      draw(1);
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    }
  }, { passive: false });

  // ── Resize ────────────────────────────────────────────────────
  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); draw(1); }, 120);
  }).observe(canvas.parentElement);

  // ── Legend ────────────────────────────────────────────────────
  const seen = new Map();
  buildings.forEach(b => { if (!seen.has(b.language)) seen.set(b.language, LANG_COLORS[b.language] || DEFAULT_COLOR); });
  legend.innerHTML = [...seen.entries()].map(([lang, color]) =>
    `<span class="city__legend-item"><span class="city__legend-dot" style="background:${color}"></span>${lang}</span>`
  ).join('');

  // ── Reveal trigger ────────────────────────────────────────────
  let triggered = false;
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !triggered) {
      triggered = true;
      loading.classList.add('hidden');
      resize();
      animate();
    }
  }, { threshold: 0.12 }).observe(document.getElementById('city'));

  draw(0);
}
