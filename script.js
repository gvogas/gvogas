import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

  function closeMenu() {
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('open') && !nav.contains(e.target)) closeMenu();
  });

  // ── Active nav link on scroll ─────────────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav__links a[href^="#"]');
  const NAV_OFFSET = 80;

  function updateActiveLink() {
    let current = '';
    sections.forEach(section => {
      if (window.scrollY >= section.offsetTop - NAV_OFFSET) current = section.id;
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
        card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      });
    });
  }

  // ── Scroll reveal ─────────────────────────────────────────────
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = Array.from(el.parentElement.querySelectorAll('.reveal:not(.visible)'));
        const delay = Math.min(siblings.indexOf(el) * 70, 280);
        setTimeout(() => el.classList.add('visible'), delay);
        observer.unobserve(el);
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -48px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  // ── Commit Skyline ────────────────────────────────────────────
  initCity().catch(err => {
    console.error('initCity failed:', err);
    const loading = document.getElementById('city-loading');
    if (loading) loading.innerHTML = '<span style="color:var(--text-dim);font-size:.85rem">Could not load the 3D skyline.</span>';
  });
})();

// ── City module (Three.js) ────────────────────────────────────────
async function initCity() {
  const GH_USER = 'gvogas';
  const canvas  = document.getElementById('city-canvas');
  const loading = document.getElementById('city-loading');
  const tooltip = document.getElementById('city-tooltip');
  const legend  = document.getElementById('city-legend');
  if (!canvas) return;

  const LANG_COLORS = {
    'Python':      0x4584b6,
    'Java':        0xe76f00,
    'JavaScript':  0xf7df1e,
    'TypeScript':  0x3178c6,
    'PHP':         0x8892bf,
    'C#':          0x239120,
    'Dart':        0x00d2b8,
    'HTML':        0xe44b23,
    'CSS':         0x7b5ea7,
    'C++':         0xf34b7d,
    'C':           0x6e7681,
    'ShaderLab':   0x4a90d9,
    'Swift':       0xf05138,
    'Kotlin':      0xa97bff,
    'Ruby':        0xcc342d,
    'Go':          0x00acd7,
    'Rust':        0xdea584,
  };
  const DEFAULT_COLOR = 0x4f9cf9;
  const SKY_COLOR     = 0x070b12;

  const hexCSS = (n) => '#' + n.toString(16).padStart(6, '0');
  const colorOf = (lang) => LANG_COLORS[lang] || DEFAULT_COLOR;

  // ── Fetch repos & commit counts ────────────────────────────────
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

  async function fetchCommits(name) {
    try {
      const res = await fetch(`https://api.github.com/repos/${GH_USER}/${name}/commits?per_page=1`);
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

  // ── Layout (centered grid in world space, Y is up) ─────────────
  const N    = buildings.length;
  const COLS = Math.ceil(Math.sqrt(N * 1.6));
  const ROWS = Math.ceil(N / COLS);
  const TILE     = 1.6;   // building footprint
  const SPACING  = 2.4;   // grid step
  const gridW = COLS * SPACING;
  const gridD = ROWS * SPACING;

  const maxC = Math.max(...buildings.map(b => b.commits));
  const MIN_H = 1.5, MAX_H = 9.5;

  buildings.forEach((b, i) => {
    const cx = i % COLS;
    const cz = Math.floor(i / COLS);
    b.x = cx * SPACING - gridW / 2 + SPACING / 2;
    b.z = cz * SPACING - gridD / 2 + SPACING / 2;
    b.height = MIN_H + (b.commits / maxC) * (MAX_H - MIN_H);
    b.seed = i;
    b.animDelay = (i / N) * 0.38;
  });

  // ── Three.js renderer, scene, camera ───────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(SKY_COLOR, Math.max(gridW, gridD) * 0.6, Math.max(gridW, gridD) * 2.4);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  const camDist = Math.max(gridW, gridD) * 1.15;
  camera.position.set(camDist, camDist * 0.78, camDist);

  // ── Lights ─────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0x6a8cb8, 0x080812, 0.45));
  scene.add(new THREE.AmbientLight(0x1a2436, 0.55));
  const keyLight = new THREE.DirectionalLight(0xc8d8ff, 0.85);
  keyLight.position.set(gridW * 0.6, gridW * 1.2, gridD * 0.4);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x4f9cf9, 0.25);
  fillLight.position.set(-gridW, gridW * 0.4, -gridD);
  scene.add(fillLight);

  // ── Ground & grid ──────────────────────────────────────────────
  const groundSize = Math.max(gridW, gridD) * 6;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize),
    new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(groundSize, Math.floor(groundSize / SPACING), 0x1a2434, 0x111722);
  gridHelper.position.y = 0.01;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.35;
  scene.add(gridHelper);

  // ── Stars (dome) ───────────────────────────────────────────────
  {
    const count = 420;
    const pos = new Float32Array(count * 3);
    const r = Math.max(gridW, gridD) * 4;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45 + 0.02;
      pos[i*3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3 + 1] = r * Math.cos(phi);
      pos[i*3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xdde8f5, size: 0.45, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false,
    });
    scene.add(new THREE.Points(geo, mat));
  }

  // ── Window texture (procedural CanvasTexture per building) ─────
  function makeWindowTexture(cols, rows, seed) {
    const cell = 14;
    const c = document.createElement('canvas');
    c.width  = cols * cell;
    c.height = rows * cell;
    const cx = c.getContext('2d');
    cx.fillStyle = '#0a0e16';
    cx.fillRect(0, 0, c.width, c.height);
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const lit = ((seed * 17 + r * 13 + col * 7) % 7) > 2;
        cx.fillStyle = lit ? '#ffe88a' : '#1a2434';
        cx.fillRect(col * cell + 4, r * cell + 3, cell - 8, cell - 6);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  // ── Buildings ──────────────────────────────────────────────────
  const buildingsGroup = new THREE.Group();
  scene.add(buildingsGroup);
  const buildingMeshes = [];

  buildings.forEach(b => {
    const base = new THREE.Color(colorOf(b.language));
    const floors = Math.max(3, Math.round(b.height / 0.32));
    const winTex = makeWindowTexture(3, floors, b.seed);

    const sideMat = new THREE.MeshStandardMaterial({
      color: base.clone().multiplyScalar(0.32),
      map: winTex,
      emissive: 0xffd980,
      emissiveMap: winTex,
      emissiveIntensity: 0.55,
      roughness: 0.78,
      metalness: 0.08,
    });
    const topMat = new THREE.MeshStandardMaterial({
      color: base.clone().multiplyScalar(0.85),
      emissive: base.clone(),
      emissiveIntensity: 0.22,
      roughness: 0.5,
      metalness: 0.2,
    });
    const bottomMat = new THREE.MeshStandardMaterial({ color: 0x05080d, roughness: 1, metalness: 0 });

    const geo = new THREE.BoxGeometry(TILE, b.height, TILE);
    geo.translate(0, b.height / 2, 0); // origin at bottom for grow-from-floor scaling
    // BoxGeometry material order: +x, -x, +y (top), -y (bottom), +z, -z
    const mats = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
    const mesh = new THREE.Mesh(geo, mats);
    mesh.position.set(b.x, 0, b.z);
    mesh.scale.y = 0.001;

    const edges = new THREE.EdgesGeometry(geo, 1);
    const edgeMat = new THREE.LineBasicMaterial({
      color: base.clone().lerp(new THREE.Color(0xffffff), 0.35),
      transparent: true,
      opacity: 0.45,
    });
    const edgeLines = new THREE.LineSegments(edges, edgeMat);
    mesh.add(edgeLines);

    mesh.userData = { b, sideMat, topMat, edgeMat, baseEmissive: 0.55, baseTopEmissive: 0.22, baseEdge: 0.45 };
    buildingsGroup.add(mesh);
    buildingMeshes.push(mesh);
  });

  // ── OrbitControls ──────────────────────────────────────────────
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 1.5, 0);
  controls.minDistance = 6;
  controls.maxDistance = Math.max(gridW, gridD) * 2.6;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minPolarAngle = Math.PI * 0.08;
  controls.zoomSpeed = 0.8;
  controls.rotateSpeed = 0.9;
  controls.update();

  let isDragging = false;
  controls.addEventListener('start', () => { isDragging = true; hideTooltip(); });
  controls.addEventListener('end',   () => { isDragging = false; });

  // ── Sizing ─────────────────────────────────────────────────────
  function getSize() {
    const w = canvas.parentElement.clientWidth;
    const h = Math.min(580, Math.max(360, Math.round(w * 0.62)));
    return { w, h };
  }

  function resize() {
    const { w, h } = getSize();
    renderer.setSize(w, h, false);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }).observe(canvas.parentElement);

  // ── Tooltip helpers (ported from previous code) ────────────────
  function buildTooltipHTML(b, colorHex, extraHTML = '') {
    return `
      <div class="city__tooltip-name">${b.name.replace(/-/g,'‑')}</div>
      <div class="city__tooltip-row"><span class="city__tooltip-dot" style="background:${hexCSS(colorHex)}"></span>${b.language}</div>
      <div class="city__tooltip-row" style="margin-top:5px;gap:5px">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <strong style="color:var(--text)">${b.commits.toLocaleString()}</strong> commits
      </div>${extraHTML}`;
  }

  function showTooltip(html, clientX, clientY, above = false) {
    tooltip.innerHTML = html;
    tooltip.classList.add('visible');
    tooltip.setAttribute('aria-hidden', 'false');
    const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    let tx, ty;
    if (above) {
      tx = clientX - tw / 2;
      ty = clientY - th - 20;
      tx = Math.max(8, Math.min(tx, window.innerWidth - tw - 8));
      if (ty < 8) ty = clientY + 20;
    } else {
      tx = clientX + 16;
      ty = clientY - th / 2;
      if (tx + tw > window.innerWidth - 8) tx = clientX - tw - 16;
      if (ty < 8) ty = 8;
      if (ty + th > window.innerHeight - 8) ty = window.innerHeight - th - 8;
    }
    tooltip.style.left = tx + 'px';
    tooltip.style.top  = ty + 'px';
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  // ── Hover & raycasting ─────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null;

  function setHover(mesh) {
    if (hovered === mesh) return;
    if (hovered) {
      hovered.userData.sideMat.emissiveIntensity = hovered.userData.baseEmissive;
      hovered.userData.topMat.emissiveIntensity  = hovered.userData.baseTopEmissive;
      hovered.userData.edgeMat.opacity           = hovered.userData.baseEdge;
    }
    hovered = mesh;
    if (hovered) {
      hovered.userData.sideMat.emissiveIntensity = 1.1;
      hovered.userData.topMat.emissiveIntensity  = 0.6;
      hovered.userData.edgeMat.opacity           = 0.95;
    }
  }

  function hitTest(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x =  ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(buildingMeshes, false);
    return hits[0]?.object || null;
  }

  // ── Mouse interaction ──────────────────────────────────────────
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (isDragging) { setHover(null); hideTooltip(); return; }
    const mesh = hitTest(e.clientX, e.clientY);
    setHover(mesh);
    if (mesh) {
      canvas.style.cursor = 'pointer';
      const b = mesh.userData.b;
      showTooltip(buildTooltipHTML(b, colorOf(b.language)), e.clientX, e.clientY);
    } else {
      canvas.style.cursor = 'grab';
      hideTooltip();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    setHover(null);
    hideTooltip();
  });

  function openRepo(url) {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  let recentTouch = false;
  canvas.addEventListener('click', (e) => {
    if (recentTouch) return;
    const mesh = hitTest(e.clientX, e.clientY);
    if (mesh) openRepo(mesh.userData.b.url);
  });

  // ── Touch (two-tap pattern, ignore drags) ──────────────────────
  let touchStartX = 0, touchStartY = 0;
  let lastTouchedMesh = null;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const moved = Math.sqrt(dx * dx + dy * dy) > 10;

    recentTouch = true;
    setTimeout(() => { recentTouch = false; }, 500);

    if (moved) {
      // Drag — let OrbitControls handle it, just clear hover/tooltip
      lastTouchedMesh = null;
      setHover(null);
      hideTooltip();
      return;
    }

    const mesh = hitTest(t.clientX, t.clientY);
    if (mesh) {
      if (lastTouchedMesh === mesh) {
        openRepo(mesh.userData.b.url);
        lastTouchedMesh = null;
        setHover(null);
        hideTooltip();
      } else {
        lastTouchedMesh = mesh;
        setHover(mesh);
        const b = mesh.userData.b;
        const extra = '<div style="margin-top:6px;font-size:.72rem;color:var(--accent);opacity:.8">tap again to open →</div>';
        showTooltip(buildTooltipHTML(b, colorOf(b.language), extra), t.clientX, t.clientY, true);
      }
    } else {
      lastTouchedMesh = null;
      setHover(null);
      hideTooltip();
    }
  }, { passive: true });

  // ── Animation loop ─────────────────────────────────────────────
  const easeOutExpo = (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const BUILDUP_MS = 1800;
  let buildupStart = null;
  let cityVisible  = false;

  function tick(now) {
    requestAnimationFrame(tick);
    if (!cityVisible && buildupStart === null) return;

    controls.update();

    if (buildupStart !== null) {
      const t = Math.min((now - buildupStart) / BUILDUP_MS, 1);
      buildingMeshes.forEach(mesh => {
        const localT = Math.max(0, Math.min(1, (t - mesh.userData.b.animDelay) / 0.68));
        mesh.scale.y = Math.max(0.001, easeOutExpo(localT));
      });
      if (t >= 1) buildupStart = -1; // mark "done" so we don't re-evaluate, but keep rendering
    }

    renderer.render(scene, camera);
  }

  // ── Reveal trigger & visibility observer ───────────────────────
  let triggered = false;
  new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      cityVisible = entry.isIntersecting;
      if (entry.isIntersecting && !triggered) {
        triggered = true;
        loading.classList.add('hidden');
        buildupStart = performance.now();
      }
    });
  }, { threshold: 0.12 }).observe(document.getElementById('city'));

  // ── Legend ─────────────────────────────────────────────────────
  const seen = new Map();
  buildings.forEach(b => { if (!seen.has(b.language)) seen.set(b.language, hexCSS(colorOf(b.language))); });
  legend.innerHTML = [...seen.entries()].map(([lang, color]) =>
    `<span class="city__legend-item"><span class="city__legend-dot" style="background:${color}"></span>${lang}</span>`
  ).join('');

  // Kick off the render loop (renders only when section is visible)
  requestAnimationFrame(tick);
}
