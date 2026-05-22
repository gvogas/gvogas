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
  if (!canvas) return;

  const SKY_COLOR = 0x0d1a30;  // arena-night blue — late-game lighting outside the rink

  // Hover/idle material constants (same for every building).
  const IDLE_EMISSIVE = 0.7, HOVER_EMISSIVE = 1.1;
  const IDLE_TOP_EMISSIVE = 0.35, HOVER_TOP_EMISSIVE = 0.6;
  const IDLE_EDGE = 0.6, HOVER_EDGE = 0.95;

  // Each repo gets a unique color via FNV-1a hash of its name → HSL hue.
  // Same name → same color across reloads.
  function uniqueColor(name) {
    let h = 2166136261 >>> 0;
    for (let k = 0; k < name.length; k++) {
      h = Math.imul(h ^ name.charCodeAt(k), 16777619) >>> 0;
    }
    return new THREE.Color().setHSL(h / 0xffffffff, 0.7, 0.58);
  }
  const colorToCSS = (c) => '#' + c.getHexString();

  // Human-readable repo size: KB → "412 KB" / "1.3 MB" / "2 GB".
  function formatSize(kb) {
    if (!kb || kb < 1)     return '< 1 KB';
    if (kb < 1024)         return `${Math.round(kb)} KB`;
    if (kb < 1024 * 1024)  return `${(kb / 1024).toFixed(kb < 10240 ? 1 : 0)} MB`;
    return `${(kb / (1024 * 1024)).toFixed(1)} GB`;
  }

  // "3 days ago" / "2 months ago" — coarse, good enough for a tooltip.
  function formatRelative(iso) {
    if (!iso) return 'recently';
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return 'recently';
    const secs = Math.max(1, Math.round((Date.now() - then) / 1000));
    const units = [
      [60,            'second'],
      [60 * 60,       'minute'],
      [60 * 60 * 24,  'hour'  ],
      [60 * 60 * 24 * 30,  'day'  ],
      [60 * 60 * 24 * 365, 'month'],
    ];
    for (let i = 0; i < units.length; i++) {
      if (secs < units[i][0]) {
        const div = i === 0 ? 1 : units[i - 1][0];
        const n = Math.max(1, Math.floor(secs / div));
        return `${n} ${units[i][1]}${n === 1 ? '' : 's'} ago`;
      }
    }
    const years = Math.floor(secs / (60 * 60 * 24 * 365));
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }

  // ── Fetch repos (single request — no per-repo fan-out) ─────────
  let repos = [];
  try {
    const res = await fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`);
    repos = await res.json();
    if (!Array.isArray(repos)) repos = [];
  } catch { repos = []; }

  if (repos.length === 0) {
    loading.innerHTML = '<span style="color:var(--text-dim);font-size:.85rem">Could not load repositories.</span>';
    return;
  }

  // Tower weight comes entirely from data /repos already returned:
  //   sizeScore   — log-damped KB of code, so one asset-heavy repo
  //                 doesn't flatten the rest of the skyline.
  //   recencyBoost — small additive bump for repos pushed in the last
  //                 year, scaled linearly toward zero across that window.
  const RECENCY_W = 1.5;
  const now = Date.now();
  const buildings = repos.map(r => {
    const sizeKB     = r.size || 0;
    const pushedAt   = r.pushed_at || null;
    const sizeScore  = Math.log1p(sizeKB);
    const days       = pushedAt
      ? (now - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;
    const recencyBoost = Math.max(0, 1 - days / 365) * RECENCY_W;
    return {
      name:     r.name,
      url:      r.html_url,
      language: r.language || 'Other',
      sizeKB,
      pushedAt,
      weight:   sizeScore + recencyBoost,
    };
  });
  buildings.sort((a, b) => b.weight - a.weight);

  // ── Layout (centered grid in world space, Y is up) ─────────────
  const N    = buildings.length;
  const COLS = Math.ceil(Math.sqrt(N * 1.6));
  const ROWS = Math.ceil(N / COLS);
  const TILE     = 1.6;   // building footprint
  const SPACING  = 4.0;   // grid step — wider gap leaves room for streets
  const gridW = COLS * SPACING;
  const gridD = ROWS * SPACING;
  const gridMax = Math.max(gridW, gridD);

  const maxW = Math.max(...buildings.map(b => b.weight)) || 1;
  const MIN_H = 1.5, MAX_H = 9.5;

  buildings.forEach((b, i) => {
    const cx = i % COLS;
    const cz = Math.floor(i / COLS);
    b.x = cx * SPACING - gridW / 2 + SPACING / 2;
    b.z = cz * SPACING - gridD / 2 + SPACING / 2;
    b.height = MIN_H + (b.weight / maxW) * (MAX_H - MIN_H);
    b.seed = i;
    b.animDelay = (i / N) * 0.38;
    b.color = uniqueColor(b.name);
    b.isSignature = (i === 0); // tallest = 1000-de-la-Gauchetière-style spire
  });

  // ── Three.js renderer, scene, camera ───────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(SKY_COLOR, gridMax * 0.6, gridMax * 3.2);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  const camDist = gridMax * 1.15;
  camera.position.set(camDist, camDist * 0.78, camDist);

  // ── Lights ─────────────────────────────────────────────────────
  // Cool overhead like rink lighting, with a warm cyan fill from the cyber side.
  scene.add(new THREE.HemisphereLight(0x9bd6ff, 0x080812, 0.75));
  scene.add(new THREE.AmbientLight(0x1f3550, 0.7));
  const keyLight = new THREE.DirectionalLight(0xe6f1ff, 1.1);
  keyLight.position.set(gridW * 0.6, gridW * 1.2, gridD * 0.4);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x22d3ee, 0.45);
  fillLight.position.set(-gridW, gridW * 0.4, -gridD);
  scene.add(fillLight);
  // A faint red wash from the south — the Bell Centre side.
  const rinkGlow = new THREE.DirectionalLight(0xe63946, 0.22);
  rinkGlow.position.set(0, gridW * 0.3, gridD);
  scene.add(rinkGlow);

  // ── Ground & grid ──────────────────────────────────────────────
  const groundSize = gridMax * 6;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize),
    new THREE.MeshStandardMaterial({ color: 0x162236, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(groundSize, Math.floor(groundSize / SPACING), 0x22d3ee, 0x1a2436);
  gridHelper.position.y = 0.01;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.28;
  scene.add(gridHelper);

  // ── Road network ───────────────────────────────────────────────
  {
    const ROAD_W = 1.8;
    const extent = SPACING; // streets continue one cell past city edge
    const lenX = gridW + 2 * extent;
    const lenZ = gridD + 2 * extent;
    const TILE_LEN = ROAD_W * 1.6; // world-space length covered by one texture tile

    // Painted asphalt: white edge stripes + dashed yellow centerline.
    // `longAxisHorizontal` controls which canvas axis runs down the road's length.
    function makeRoadTexture(longAxisHorizontal) {
      const longDim = 256, shortDim = 64;
      const w = longAxisHorizontal ? longDim : shortDim;
      const h = longAxisHorizontal ? shortDim : longDim;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const cx = c.getContext('2d');
      cx.fillStyle = '#2a3040';
      cx.fillRect(0, 0, w, h);

      const cross = longAxisHorizontal ? h : w;
      const edgePx = Math.max(2, Math.round(cross * 0.07));
      const dashPx = Math.max(3, Math.round(cross * 0.07));
      const centerPos = Math.round((cross - dashPx) / 2);
      const dashOn = 70, dashOff = 186; // one dash per 256-px tile

      cx.fillStyle = 'rgba(220, 226, 235, 0.55)';
      if (longAxisHorizontal) {
        cx.fillRect(0, 0, w, edgePx);
        cx.fillRect(0, h - edgePx, w, edgePx);
      } else {
        cx.fillRect(0, 0, edgePx, h);
        cx.fillRect(w - edgePx, 0, edgePx, h);
      }

      cx.fillStyle = '#e6c34a';
      if (longAxisHorizontal) {
        for (let x = 0; x < w; x += dashOn + dashOff) {
          cx.fillRect(x, centerPos, dashOn, dashPx);
        }
      } else {
        for (let y = 0; y < h; y += dashOn + dashOff) {
          cx.fillRect(centerPos, y, dashPx, dashOn);
        }
      }

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      if (longAxisHorizontal) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
      } else {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.RepeatWrapping;
      }
      tex.anisotropy = 4;
      return tex;
    }

    const roads = new THREE.Group();

    // EW and NS planes are stacked with tiny Y offsets so they don't
    // z-fight in their overlap squares. A plain-asphalt patch then sits
    // on top of each junction, hiding both roads' painted markings —
    // real intersections show bare asphalt, not crossed centerlines.
    const Y_EW = 0.020, Y_NS = 0.021, Y_JCT = 0.022;

    // East-West streets (length along world X → U axis on plane)
    for (let i = 0; i <= ROWS; i++) {
      const tex = makeRoadTexture(true);
      tex.repeat.set(lenX / TILE_LEN, 1);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 });
      const r = new THREE.Mesh(new THREE.PlaneGeometry(lenX, ROAD_W), mat);
      r.rotation.x = -Math.PI / 2;
      r.position.set(0, Y_EW, i * SPACING - gridD / 2);
      roads.add(r);
    }
    // North-South streets (length along world Z → V axis on plane)
    for (let j = 0; j <= COLS; j++) {
      const tex = makeRoadTexture(false);
      tex.repeat.set(1, lenZ / TILE_LEN);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 });
      const r = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, lenZ), mat);
      r.rotation.x = -Math.PI / 2;
      r.position.set(j * SPACING - gridW / 2, Y_NS, 0);
      roads.add(r);
    }

    // Plain-asphalt intersection patches — color matches the road's
    // base asphalt (#2a3040) so the patches blend into the surface.
    const jctGeo = new THREE.PlaneGeometry(ROAD_W, ROAD_W);
    const jctMat = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 1, metalness: 0 });
    for (let i = 0; i <= ROWS; i++) {
      for (let j = 0; j <= COLS; j++) {
        const patch = new THREE.Mesh(jctGeo, jctMat);
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(j * SPACING - gridW / 2, Y_JCT, i * SPACING - gridD / 2);
        roads.add(patch);
      }
    }

    scene.add(roads);
  }

  // ── Stars (dome) ───────────────────────────────────────────────
  {
    const count = 420;
    const pos = new Float32Array(count * 3);
    const r = gridMax * 4;
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

  // ── Mount Royal silhouette + illuminated cross ────────────────
  {
    // Sit the silhouette well north of the city — its footprint must clear the building grid.
    const MOUNT_R = gridMax * 1.4;
    const Y_SCALE = 0.35;

    // Deterministic radial-noise lump — gives an organic silhouette instead of a perfect dome.
    // Displacement falls off to zero at the equator so the mound stays grounded.
    function lumpDome(geo, R, amp, freq) {
      const k = freq / R; // base spatial frequency (a few wavelengths per diameter)
      const pos = geo.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const heightFactor = Math.max(0, v.y / R);
        const n =
            Math.sin(v.x * k)       * Math.cos(v.z * k * 1.3)
          + Math.sin(v.x * k * 2.1 + v.z * k * 0.7) * 0.6
          + Math.cos(v.x * k * 3.4 - v.z * k * 1.7) * 0.35;
        v.multiplyScalar(1 + n * amp * heightFactor);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }

    // Shared mountain material — picks up cool moonlight from the hemisphere/ambient lights
    // instead of rendering as a flat blob. Fog still pulls it toward the sky color at distance.
    const mountMat = new THREE.MeshStandardMaterial({
      color: 0x182438, roughness: 0.95, metalness: 0, fog: true,
    });

    // Main Mount Royal mass
    const mountGeo = new THREE.SphereGeometry(MOUNT_R, 56, 28, 0, Math.PI * 2, 0, Math.PI / 2);
    lumpDome(mountGeo, MOUNT_R, 0.09, 4);
    mountGeo.scale(1, Y_SCALE, 1);
    const mount = new THREE.Mesh(mountGeo, mountMat);
    mount.position.set(-gridMax * 0.5, 0, -gridMax * 2.2);
    scene.add(mount);

    // Outremont — secondary lower peak slightly east-northeast of the main summit
    const outR = MOUNT_R * 0.55;
    const outGeo = new THREE.SphereGeometry(outR, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    lumpDome(outGeo, outR, 0.10, 3.2);
    outGeo.scale(1, Y_SCALE * 0.8, 1);
    const outremont = new THREE.Mesh(outGeo, mountMat);
    outremont.position.set(gridMax * 0.15, 0, -gridMax * 2.45);
    scene.add(outremont);

    // Cross at the main summit (centered on the original dome apex)
    const crossMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4,
    });
    const summitY = MOUNT_R * Y_SCALE;
    const pillarH = 3.2;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.32, pillarH, 0.32), crossMat);
    pillar.position.set(mount.position.x, summitY + pillarH / 2, mount.position.z);
    scene.add(pillar);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 0.32), crossMat);
    arm.position.set(mount.position.x, summitY + pillarH * 0.7, mount.position.z);
    scene.add(arm);
  }

  // ── Bell Centre arena (south of the tower cluster) ────────────
  {
    const bellR = TILE * 1.6;
    const segments = 24;
    const bodyH = 1.7;
    const stripeH = 0.18;
    const capH = 0.42;

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(bellR, bellR, bodyH, segments),
      new THREE.MeshStandardMaterial({ color: 0x4a5660, roughness: 0.55, metalness: 0.35 })
    );
    body.position.y = bodyH / 2;

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(bellR * 1.005, bellR * 1.005, stripeH, segments),
      new THREE.MeshStandardMaterial({ color: 0xe63946, emissive: 0xe63946, emissiveIntensity: 0.75 })
    );
    stripe.position.y = bodyH - stripeH / 2 - 0.12;

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(bellR * 0.95, bellR * 0.92, capH, segments),
      new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.6, metalness: 0.3 })
    );
    cap.position.y = bodyH + capH / 2;

    const bell = new THREE.Group();
    bell.add(body); bell.add(stripe); bell.add(cap);
    bell.scale.set(1.7, 1, 1); // elliptical footprint
    bell.position.set(0, 0, gridD / 2 + TILE * 1.6);
    scene.add(bell);
  }

  // ── Lamp posts at sidewalk corners of each intersection ──────
  {
    const POLE_H = 1.6;
    const HEAD_H = 0.14;
    const ROAD_HALF = 1.8 / 2;                 // mirrors ROAD_W in the road block
    const CORNER_OFFSET = ROAD_HALF + 0.18;    // sit just off the asphalt
    const bellX = 0, bellZ = gridD / 2 + TILE * 1.6;
    const bellExclusion = TILE * 1.6 * 1.7;    // skip lamps inside Bell Centre footprint

    const lampXZ = [];
    for (let gx = 0; gx <= COLS; gx++) {
      for (let gz = 0; gz <= ROWS; gz++) {
        const lx = gx * SPACING - gridW / 2 + CORNER_OFFSET;
        const lz = gz * SPACING - gridD / 2 + CORNER_OFFSET;
        if (Math.hypot(lx - bellX, lz - bellZ) < bellExclusion) continue;
        lampXZ.push(lx, lz);
      }
    }
    const count = lampXZ.length / 2;

    const poleGeo = new THREE.CylinderGeometry(0.035, 0.05, POLE_H, 8);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x3a4250, roughness: 0.6, metalness: 0.4,
    });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, count);

    const headGeo = new THREE.BoxGeometry(0.22, HEAD_H, 0.22);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x2a2418, emissive: 0xffd180, emissiveIntensity: 1.6,
      roughness: 0.5, metalness: 0.2,
    });
    const heads = new THREE.InstancedMesh(headGeo, headMat, count);

    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const lx = lampXZ[i * 2];
      const lz = lampXZ[i * 2 + 1];
      m.makeTranslation(lx, POLE_H / 2, lz);
      poles.setMatrixAt(i, m);
      m.makeTranslation(lx, POLE_H + HEAD_H / 2, lz);
      heads.setMatrixAt(i, m);
    }
    poles.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    scene.add(poles);
    scene.add(heads);
  }

  // ── Deterministic per-repo hash → [0, 1) (used for roof picks) ─
  function rand(seed, n = 0) {
    let h = (Math.imul(seed + 1, 2654435761) ^ Math.imul(n + 1, 40503)) >>> 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    return (h >>> 0) / 0xffffffff;
  }

  // ── Roof variants (children of the building mesh, animate together) ─
  function addRoof(mesh, b, sideMat, topMat, edgeMat) {
    if (b.isSignature) {
      // 1000 de la Gauchetière — copper-green pyramid
      const h = Math.min(1.8, b.height * 0.24);
      const geo = new THREE.ConeGeometry(TILE * 0.62, h, 4);
      geo.rotateY(Math.PI / 4);
      geo.translate(0, b.height + h / 2, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x4a7d6a, emissive: 0x274a3e, emissiveIntensity: 0.25,
        roughness: 0.45, metalness: 0.55,
      });
      mesh.add(new THREE.Mesh(geo, mat));
      return;
    }

    const roll = rand(b.seed, 1);

    if (roll < 0.30) return; // flat — most common

    if (b.height > 6 && roll < 0.35) {
      // setback — smaller box stacked on top (Sun Life Building style)
      const sH = b.height * 0.2, sW = TILE * 0.7;
      const sGeo = new THREE.BoxGeometry(sW, sH, sW);
      sGeo.translate(0, b.height + sH / 2, 0);
      mesh.add(new THREE.Mesh(sGeo, [sideMat, sideMat, topMat, topMat, sideMat, sideMat]));
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(sGeo, 1), edgeMat));
      return;
    }

    if (roll < 0.50) {
      // small pyramid — modernist gray-blue
      const h = Math.min(0.9, b.height * 0.11);
      const geo = new THREE.ConeGeometry(TILE * 0.5, h, 4);
      geo.rotateY(Math.PI / 4);
      geo.translate(0, b.height + h / 2, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x4a5a6a, emissive: 0x202a36, emissiveIntensity: 0.15,
        roughness: 0.6, metalness: 0.3,
      });
      mesh.add(new THREE.Mesh(geo, mat));
      return;
    }

    if (roll < 0.75) {
      // antenna — thin tapered cylinder with red-glow tip
      const h = Math.min(1.6, 0.7 + b.height * 0.12);
      const geo = new THREE.CylinderGeometry(0.018, 0.045, h, 6);
      geo.translate(0, b.height + h / 2, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2e2e2e, emissive: 0xff3322, emissiveIntensity: 0.5,
        roughness: 0.6, metalness: 0.4,
      });
      mesh.add(new THREE.Mesh(geo, mat));
      return;
    }

    // rooftopBox — small mechanical unit
    const rH = 0.22 + rand(b.seed, 2) * 0.18;
    const rW = TILE * (0.32 + rand(b.seed, 3) * 0.22);
    const rD = TILE * (0.32 + rand(b.seed, 4) * 0.22);
    const ox = (rand(b.seed, 5) - 0.5) * (TILE - rW) * 0.7;
    const oz = (rand(b.seed, 6) - 0.5) * (TILE - rD) * 0.7;
    const rGeo = new THREE.BoxGeometry(rW, rH, rD);
    rGeo.translate(ox, b.height + rH / 2, oz);
    mesh.add(new THREE.Mesh(rGeo, topMat));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(rGeo, 1), edgeMat));
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
        cx.fillStyle = lit ? '#ffe88a' : '#2a3850';
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

  // Shared across all buildings — the bottom never shows once anchored to the ground.
  const bottomMat = new THREE.MeshStandardMaterial({ color: 0x05080d, roughness: 1, metalness: 0 });
  const WHITE = new THREE.Color(0xffffff);

  buildings.forEach(b => {
    const floors = Math.max(3, Math.round(b.height / 0.32));
    const winTex = makeWindowTexture(3, floors, b.seed);

    const sideMat = new THREE.MeshStandardMaterial({
      color: b.color.clone().multiplyScalar(0.5),
      map: winTex,
      emissive: 0xffd980,
      emissiveMap: winTex,
      emissiveIntensity: IDLE_EMISSIVE,
      roughness: 0.78,
      metalness: 0.08,
    });
    const topMat = new THREE.MeshStandardMaterial({
      color: b.color.clone(),
      emissive: b.color.clone(),
      emissiveIntensity: IDLE_TOP_EMISSIVE,
      roughness: 0.5,
      metalness: 0.2,
    });

    const geo = new THREE.BoxGeometry(TILE, b.height, TILE);
    geo.translate(0, b.height / 2, 0); // origin at bottom for grow-from-floor scaling
    // BoxGeometry material order: +x, -x, +y (top), -y (bottom), +z, -z
    const mesh = new THREE.Mesh(geo, [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat]);
    mesh.position.set(b.x, 0, b.z);
    mesh.scale.y = 0.001;

    const edgeMat = new THREE.LineBasicMaterial({
      color: b.color.clone().lerp(WHITE, 0.35),
      transparent: true,
      opacity: IDLE_EDGE,
    });
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), edgeMat));

    addRoof(mesh, b, sideMat, topMat, edgeMat);

    mesh.userData = { b, sideMat, topMat, edgeMat };
    buildingsGroup.add(mesh);
    buildingMeshes.push(mesh);
  });

  // ── OrbitControls ──────────────────────────────────────────────
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 1.5, 0);
  controls.minDistance = 6;
  controls.maxDistance = gridMax * 2.6;
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
  function buildTooltipHTML(b, extraHTML = '') {
    return `
      <div class="city__tooltip-name">${b.name.replace(/-/g,'‑')}</div>
      <div class="city__tooltip-row"><span class="city__tooltip-dot" style="background:${colorToCSS(b.color)}"></span>${b.language}</div>
      <div class="city__tooltip-row" style="margin-top:5px;gap:5px">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        <strong style="color:var(--text)">${formatSize(b.sizeKB)}</strong>
      </div>
      <div class="city__tooltip-row" style="margin-top:3px;gap:5px">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Pushed ${formatRelative(b.pushedAt)}
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
      hovered.userData.sideMat.emissiveIntensity = IDLE_EMISSIVE;
      hovered.userData.topMat.emissiveIntensity  = IDLE_TOP_EMISSIVE;
      hovered.userData.edgeMat.opacity           = IDLE_EDGE;
    }
    hovered = mesh;
    if (hovered) {
      hovered.userData.sideMat.emissiveIntensity = HOVER_EMISSIVE;
      hovered.userData.topMat.emissiveIntensity  = HOVER_TOP_EMISSIVE;
      hovered.userData.edgeMat.opacity           = HOVER_EDGE;
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
      showTooltip(buildTooltipHTML(mesh.userData.b), e.clientX, e.clientY);
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

  function clearSelection() {
    lastTouchedMesh = null;
    setHover(null);
    hideTooltip();
  }

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    recentTouch = true;
    setTimeout(() => { recentTouch = false; }, 500);

    if (Math.hypot(dx, dy) > 10) { clearSelection(); return; }

    const mesh = hitTest(t.clientX, t.clientY);
    if (!mesh) { clearSelection(); return; }

    if (lastTouchedMesh === mesh) {
      openRepo(mesh.userData.b.url);
      clearSelection();
    } else {
      lastTouchedMesh = mesh;
      setHover(mesh);
      const extra = '<div style="margin-top:6px;font-size:.72rem;color:var(--accent);opacity:.8">tap again to open →</div>';
      showTooltip(buildTooltipHTML(mesh.userData.b, extra), t.clientX, t.clientY, true);
    }
  }, { passive: true });

  // ── Animation loop ─────────────────────────────────────────────
  const easeOutExpo = (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const BUILDUP_MS = 1800;
  let buildupStart = null;
  let buildupActive = false;
  let cityVisible  = false;

  function tick(now) {
    requestAnimationFrame(tick);
    if (!cityVisible) return;

    controls.update();

    if (buildupActive) {
      const t = Math.min((now - buildupStart) / BUILDUP_MS, 1);
      buildingMeshes.forEach(mesh => {
        const localT = Math.max(0, Math.min(1, (t - mesh.userData.b.animDelay) / 0.68));
        mesh.scale.y = Math.max(0.001, easeOutExpo(localT));
      });
      if (t >= 1) buildupActive = false;
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
        buildupActive = true;
      }
    });
  }, { threshold: 0.12 }).observe(document.getElementById('city'));

  // Kick off the render loop (renders only when section is visible)
  requestAnimationFrame(tick);
}
