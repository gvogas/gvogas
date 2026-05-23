import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeCommitCounter } from './gh-commits.js';

const GH_USER = 'gvogas';

// ── Tuning ─────────────────────────────────────────────────────
// Grouped so the visual feel of the skyline is configured in one place
// rather than scattered as magic numbers across the module.
const CONFIG = {
  // Sky / scene
  SKY_COLOR:        0x0d1a30,         // arena-night blue
  // Grid layout — tile is the building footprint, spacing is the per-cell stride
  TILE:             1.6,
  SPACING:          4.0,
  COLS_OVERSHOOT:   1.6,              // sqrt(N * this) → grid columns
  MIN_H:            1.5,
  MAX_H:            9.5,
  // City fill — grid is sized larger than the repo count; leftover cells
  // become parks so the map reads full and towers aren't packed side-by-side.
  PARK_RATIO:       0.3,              // target fraction of cells that are green space
  TREES_PER_PARK:   3,               // max trees per park (deterministic count)
  // Weighting
  RECENCY_W:        1.5,              // additive bump for repos pushed within RECENCY_DAYS
  RECENCY_DAYS:     365,
  // Roads
  ROAD_W:           1.8,
  // Mount Royal
  MOUNT_R_MUL:      1.15,             // multiplier of gridMax (smaller footprint = sits closer)
  MOUNT_Y_SCALE:    0.5,              // taller, loomier profile
  // Lamps / arena
  LAMP_POLE_H:      1.6,
  LAMP_HEAD_H:      0.14,
  // Hover / idle emissive intensities — building materials swap between
  // these two sets on mouseover.
  IDLE_EMISSIVE:      0.7,
  HOVER_EMISSIVE:     1.1,
  IDLE_TOP_EMISSIVE:  0.35,
  HOVER_TOP_EMISSIVE: 0.6,
  IDLE_EDGE:          0.6,
  HOVER_EDGE:         0.95,
  // Animation
  BUILDUP_MS:       1800,
  ANIM_DELAY_RANGE: 0.38,             // building anim offset spread (0..this)
};

// ── Deterministic seed → uint32 (FNV-1a-ish + final scramble). Used for
// both per-repo colour choice and per-building roof picks. `salt` lets us
// pull multiple independent rolls from the same seed.
function hash32(seed, salt = 0) {
  let h = (Math.imul(seed + 1, 2654435761) ^ Math.imul(salt + 1, 40503)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

function hashString(name) {
  let h = 2166136261 >>> 0;
  for (let k = 0; k < name.length; k++) {
    h = Math.imul(h ^ name.charCodeAt(k), 16777619) >>> 0;
  }
  return h >>> 0;
}

// Same repo name → same colour across reloads.
function uniqueColor(name) {
  return new THREE.Color().setHSL(hashString(name) / 0xffffffff, 0.7, 0.58);
}

// 0..1 deterministic random per (seed, salt).
const rand = (seed, salt = 0) => hash32(seed, salt) / 0xffffffff;

export async function initCity() {
  const canvas  = document.getElementById('city-canvas');
  const loading = document.getElementById('city-loading');
  const tooltip = document.getElementById('city-tooltip');
  if (!canvas) return;

  // Lazy commit-count fetch — one request per repo, only when hovered.
  // Shared with the GitHub Status panel so cross-section duplicate fetches
  // are coalesced through gh-commits.js.
  const commitCounter = makeCommitCounter(GH_USER);
  function ensureCommits(b) {
    if (b.commits !== undefined) return null;
    return commitCounter.ensure(b.name)
      .catch(() => null)
      .then(n => { b.commits = n; return n; });
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

  // Tower weight from data /repos already returned:
  //   sizeScore   — log-damped KB of code, so one asset-heavy repo
  //                 doesn't flatten the rest of the skyline.
  //   recencyBoost — additive bump for repos pushed inside RECENCY_DAYS,
  //                 scaled linearly toward zero across that window.
  const now = Date.now();
  const buildings = repos.map(r => {
    const sizeKB    = r.size || 0;
    const pushedAt  = r.pushed_at || null;
    const sizeScore = Math.log1p(sizeKB);
    const days      = pushedAt
      ? (now - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;
    const recencyBoost = Math.max(0, 1 - days / CONFIG.RECENCY_DAYS) * CONFIG.RECENCY_W;
    return {
      name:     r.name,
      url:      r.html_url,
      language: r.language || 'Other',
      weight:   sizeScore + recencyBoost,
    };
  });
  buildings.sort((a, b) => b.weight - a.weight);

  // ── Layout (centered grid in world space, Y is up) ─────────────
  // The grid is sized for MORE cells than buildings: buildings fill ~(1-PARK_RATIO)
  // of the cells and every leftover cell becomes a park. That fills the whole map
  // (no blank cells), scatters greenery between the towers, and — because roads and
  // lamps are generated per grid line — adds more streets for free.
  const N    = buildings.length;
  const totalCells = Math.max(N, Math.ceil(N / (1 - CONFIG.PARK_RATIO)));
  const COLS = Math.ceil(Math.sqrt(totalCells * CONFIG.COLS_OVERSHOOT));
  const ROWS = Math.ceil(totalCells / COLS);
  const { TILE, SPACING } = CONFIG;
  const gridW = COLS * SPACING;
  const gridD = ROWS * SPACING;
  const gridMax = Math.max(gridW, gridD);

  const cellX = cx => cx * SPACING - gridW / 2 + SPACING / 2;
  const cellZ = cz => cz * SPACING - gridD / 2 + SPACING / 2;

  const maxW = Math.max(...buildings.map(b => b.weight)) || 1;

  // Deterministically choose which cells are parks: score every cell, then take
  // the highest-scoring `parkCount` as parks. Scoring by hash gives a stable,
  // well-spread scatter rather than a clustered block of green.
  const cellCount = COLS * ROWS;
  const parkCount = cellCount - N;
  const allCells = [];
  for (let cz = 0; cz < ROWS; cz++) {
    for (let cx = 0; cx < COLS; cx++) {
      allCells.push({ cx, cz, score: rand(cx * 73856093 ^ cz * 19349663) });
    }
  }
  const parkIds = new Set(
    [...allCells].sort((a, b) => b.score - a.score)
      .slice(0, parkCount)
      .map(c => c.cz * COLS + c.cx)
  );

  // Walk cells row-major: park cells go to `parks`, the rest receive buildings in
  // weight order (tallest first → still lands in an early/core cell as the signature).
  const parks = [];
  let bi = 0;
  for (let cz = 0; cz < ROWS; cz++) {
    for (let cx = 0; cx < COLS; cx++) {
      const id = cz * COLS + cx;
      if (parkIds.has(id)) {
        parks.push({ x: cellX(cx), z: cellZ(cz), seed: id });
        continue;
      }
      if (bi >= N) continue;
      const b = buildings[bi];
      b.x = cellX(cx);
      b.z = cellZ(cz);
      b.height = CONFIG.MIN_H + (b.weight / maxW) * (CONFIG.MAX_H - CONFIG.MIN_H);
      b.seed = bi;
      b.animDelay = (bi / N) * CONFIG.ANIM_DELAY_RANGE;
      b.color = uniqueColor(b.name);
      b.isSignature = (bi === 0); // tallest = 1000-de-la-Gauchetière-style spire
      bi++;
    }
  }

  // ── Three.js renderer, scene, camera ───────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;

  const scene = new THREE.Scene();

  // Vertical-gradient night sky: deep navy at the zenith easing to a faint
  // teal horizon glow. Stretched to fill the frame, so the top of the canvas
  // is the top of the sky. The fog colour is matched to the horizon band so
  // towers melt into the skyline rather than into a hard seam.
  const HORIZON = 0x123047;
  {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    const cx = c.getContext('2d');
    const g = cx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.00, '#070d1a'); // zenith
    g.addColorStop(0.55, '#0c1c30');
    g.addColorStop(0.82, '#123047'); // horizon glow band
    g.addColorStop(1.00, '#0a1828'); // ground haze just below horizon
    cx.fillStyle = g;
    cx.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
  }
  scene.fog = new THREE.Fog(HORIZON, gridMax * 0.9, gridMax * 5.0);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, Math.max(200, gridMax * 7));
  const camDist = gridMax * 1.15;
  camera.position.set(camDist, camDist * 0.55, camDist); // lower, more skyline-like — opens up the sky

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
  // Cool moonlight rim from the north-west, where the moon hangs — gives the
  // mountain a soft edge and silvers the rooftops.
  const moonLight = new THREE.DirectionalLight(0xaecbff, 0.5);
  moonLight.position.set(-gridMax * 0.6, gridMax * 1.0, -gridMax * 2.2); // aligned with the moon sprite
  scene.add(moonLight);

  // Scene-scoped handles the animation loop reads from (assigned in the
  // blocks below). Declared here so the tick closure can see them.
  let starUniforms = null;
  let crossMat = null, crossLight = null;
  const beacons = [];
  let meteors = null;

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
    const ROAD_W = CONFIG.ROAD_W;
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
  // Custom point shader rather than PointsMaterial: it lets every star carry
  // its own size, colour and twinkle phase, draws a soft glowing disc instead
  // of a hard square, and — critically — is NOT fog-affected, so the stars
  // stay crisp instead of washing out into the sky the way the old dome did.
  {
    const count = 1100;
    const pos    = new Float32Array(count * 3);
    const aSize  = new Float32Array(count);
    const aColor = new Float32Array(count * 3);
    const aPhase = new Float32Array(count);
    const aSpeed = new Float32Array(count);
    const r = gridMax * 2.6;

    // Three star tints: cool white (most), warm amber, and icy blue.
    const tints = [
      [0.90, 0.93, 1.00], [0.90, 0.93, 1.00], [0.90, 0.93, 1.00],
      [1.00, 0.87, 0.68],
      [0.72, 0.82, 1.00],
    ];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.46 + 0.02; // stay above the horizon
      pos[i*3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3 + 1] = r * Math.cos(phi);
      pos[i*3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Mostly modest stars with a sprinkling of bright "hero" stars.
      const hero = Math.random() < 0.12;
      aSize[i]  = hero ? 6.0 + Math.random() * 6.0 : 2.2 + Math.random() * 2.6;
      const t   = tints[(Math.random() * tints.length) | 0];
      const b   = 0.9 + Math.random() * 0.1;
      aColor[i*3] = t[0]*b; aColor[i*3+1] = t[1]*b; aColor[i*3+2] = t[2]*b;
      aPhase[i] = Math.random() * Math.PI * 2;
      aSpeed[i] = 0.6 + Math.random() * 1.8;     // smaller = lazier twinkle
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(aColor, 3));
    geo.setAttribute('aPhase',   new THREE.BufferAttribute(aPhase, 1));
    geo.setAttribute('aSpeed',   new THREE.BufferAttribute(aSpeed, 1));

    starUniforms = {
      uTime:       { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: starUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float aSize;
        attribute float aPhase;
        attribute float aSpeed;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          vColor = aColor;
          vTw = 0.6 + 0.4 * (0.5 + 0.5 * sin(uTime * aSpeed + aPhase));
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * (0.5 + 0.5 * uPixelRatio) * (0.85 + 0.25 * vTw);
        }`,
      fragmentShader: `
        precision mediump float;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float glow = pow(core, 3.0);
          float a = (0.45 * core + 0.55 * glow) * vTw;
          gl_FragColor = vec4(vColor * (0.85 + 0.7 * glow), a);
        }`,
    });
    scene.add(new THREE.Points(geo, mat));
  }

  // ── Moon (halo + disc) + faint horizon glow ───────────────────
  // Two additive sprites so the moon always faces the camera: a big soft halo
  // and a crisper disc with subtle maria. fog:false keeps it luminous.
  {
    const MOON_POS = new THREE.Vector3(-gridMax * 0.6, gridMax * 1.0, -gridMax * 2.2);

    function radialSprite(draw, size, order) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const cx = c.getContext('2d');
      draw(cx);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false, depthTest: false,
        blending: THREE.AdditiveBlending, fog: false,
      });
      const s = new THREE.Sprite(mat);
      s.scale.set(size, size, 1);
      s.position.copy(MOON_POS);
      s.renderOrder = order; // sky element — draw on top of the mountain silhouette
      return s;
    }

    // Soft outer halo
    const halo = radialSprite((cx) => {
      const g = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0.0, 'rgba(200, 220, 255, 0.55)');
      g.addColorStop(0.3, 'rgba(160, 195, 255, 0.22)');
      g.addColorStop(1.0, 'rgba(120, 160, 255, 0.0)');
      cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
    }, gridMax * 0.95, 1);
    scene.add(halo);

    // Moon disc with a faint terminator and a couple of maria
    const disc = radialSprite((cx) => {
      const g = cx.createRadialGradient(56, 52, 6, 64, 64, 52);
      g.addColorStop(0.0, 'rgba(255, 255, 250, 1.0)');
      g.addColorStop(0.7, 'rgba(226, 236, 255, 0.96)');
      g.addColorStop(0.96, 'rgba(150, 178, 224, 0.55)');
      g.addColorStop(1.0, 'rgba(120, 150, 200, 0.0)');
      cx.fillStyle = g;
      cx.beginPath(); cx.arc(64, 64, 52, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = 'rgba(150, 170, 205, 0.18)';
      cx.beginPath(); cx.arc(50, 54, 11, 0, Math.PI * 2); cx.fill();
      cx.beginPath(); cx.arc(78, 74, 8,  0, Math.PI * 2); cx.fill();
      cx.beginPath(); cx.arc(70, 46, 5,  0, Math.PI * 2); cx.fill();
    }, gridMax * 0.34, 2);
    scene.add(disc);
  }

  // ── Shooting stars (occasional meteors) ────────────────────────
  // One reusable streak rendered as overlapping glow points (WebGL caps line
  // width at 1px, so a Line would be invisible) — a big bright head fading to
  // a fine tail. It rests off-screen and re-arms on a randomised timer.
  {
    const SEGMENTS = 30;
    const positions = new Float32Array(SEGMENTS * 3);
    const alphas    = new Float32Array(SEGMENTS);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aAlpha',   new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor:      { value: new THREE.Color(0xdcecff) },
        uOpacity:    { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uPixelRatio;
        attribute float aAlpha;
        varying float vA;
        void main() {
          vA = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (2.0 + 9.0 * aAlpha) * (0.5 + 0.5 * uPixelRatio);
        }`,
      fragmentShader: `
        precision mediump float;
        uniform vec3 uColor; uniform float uOpacity;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float g = pow(smoothstep(0.5, 0.0, d), 2.0);
          gl_FragColor = vec4(uColor, g * vA * uOpacity);
        }`,
    });

    const line = new THREE.Points(geo, mat);
    line.frustumCulled = false;
    line.renderOrder = 3;
    line.visible = false;
    scene.add(line);

    const R = gridMax * 2.5;
    const tmp = new THREE.Vector3();

    meteors = {
      active: false,
      t: 0,
      duration: 1.1,
      nextIn: 2.5 + Math.random() * 5,
      head: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      length: gridMax * 1.2,
      _arm() {
        // Start in the low visible sky band, biased toward where the camera is
        // currently looking, and skim across it drifting down — so meteors land
        // in view instead of streaking across sky that's off-screen.
        const camAz = Math.atan2(-camera.position.z, -camera.position.x);
        const theta = camAz + (Math.random() - 0.5) * 1.5;
        const phi   = Math.PI * (0.40 + Math.random() * 0.07); // low sky, near the stars
        this.head.set(
          R * Math.sin(phi) * Math.cos(theta),
          R * Math.cos(phi),
          R * Math.sin(phi) * Math.sin(theta)
        );
        this.dir.set((Math.random() - 0.5) * 1.8, -0.18 - Math.random() * 0.22, (Math.random() - 0.5) * 1.8).normalize();
        this.duration = 0.9 + Math.random() * 0.7;
        this.length   = gridMax * (0.9 + Math.random() * 0.8);
        this.t = 0;
        this.active = true;
        line.visible = true;
      },
      update(dt) {
        if (!this.active) {
          this.nextIn -= dt;
          if (this.nextIn <= 0) { this._arm(); this.nextIn = 6 + Math.random() * 10; }
          return;
        }
        this.t += dt / this.duration;
        if (this.t >= 1) { this.active = false; line.visible = false; mat.uniforms.uOpacity.value = 0; return; }
        // Head slides along dir from the start point; the streak trails behind it.
        const travel = this.length * 2.4 * this.t;
        for (let i = 0; i < SEGMENTS; i++) {
          const f = i / (SEGMENTS - 1);             // 0 = head, 1 = tail end
          tmp.copy(this.head).addScaledVector(this.dir, travel - this.length * f);
          positions[i*3] = tmp.x; positions[i*3+1] = tmp.y; positions[i*3+2] = tmp.z;
          alphas[i] = (1 - f) * (1 - f);            // bright head, fading tail
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aAlpha.needsUpdate = true;
        mat.uniforms.uOpacity.value = Math.sin(this.t * Math.PI); // fade in then out
      },
    };
  }

  // ── Mount Royal silhouette + illuminated cross ────────────────
  {
    // Sit the silhouette well north of the city — its footprint must clear the building grid.
    const MOUNT_R = gridMax * CONFIG.MOUNT_R_MUL;
    const Y_SCALE = CONFIG.MOUNT_Y_SCALE;

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

    const mountMat = new THREE.MeshStandardMaterial({
      color: 0x182438, roughness: 0.95, metalness: 0, fog: true,
    });

    // Main Mount Royal mass
    const mountGeo = new THREE.SphereGeometry(MOUNT_R, 56, 28, 0, Math.PI * 2, 0, Math.PI / 2);
    lumpDome(mountGeo, MOUNT_R, 0.09, 4);
    mountGeo.scale(1, Y_SCALE, 1);
    const mount = new THREE.Mesh(mountGeo, mountMat);
    mount.position.set(-gridMax * 0.5, 0, -gridMax * 1.7);
    scene.add(mount);

    // Outremont — secondary lower peak slightly east-northeast of the main summit
    const outR = MOUNT_R * 0.55;
    const outGeo = new THREE.SphereGeometry(outR, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    lumpDome(outGeo, outR, 0.10, 3.2);
    outGeo.scale(1, Y_SCALE * 0.8, 1);
    const outremont = new THREE.Mesh(outGeo, mountMat);
    outremont.position.set(gridMax * 0.15, 0, -gridMax * 1.9);
    scene.add(outremont);

    // Cross at the main summit — emissive, gently pulsing (animated in tick).
    crossMat = new THREE.MeshStandardMaterial({
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

    // A small point light at the cross so its glow actually spills onto the
    // summit instead of the cross just looking like a flat white decal.
    crossLight = new THREE.PointLight(0xeaf2ff, 6, gridMax * 1.2, 2);
    crossLight.position.set(mount.position.x, summitY + pillarH * 0.7, mount.position.z);
    scene.add(crossLight);
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
    const POLE_H = CONFIG.LAMP_POLE_H;
    const HEAD_H = CONFIG.LAMP_HEAD_H;
    const ROAD_HALF = CONFIG.ROAD_W / 2;
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

  // ── Roof variants ──────────────────────────────────────────────
  // Each entry consumes `roll` budget in order; the first whose
  // `requires` (if any) passes and whose `budget` covers the roll wins.
  // Order matters — flat is most common (top-of-list).
  function addSetback(mesh, b, sideMat, topMat, edgeMat) {
    const sH = b.height * 0.2, sW = TILE * 0.7;
    const sGeo = new THREE.BoxGeometry(sW, sH, sW);
    sGeo.translate(0, b.height + sH / 2, 0);
    mesh.add(new THREE.Mesh(sGeo, [sideMat, sideMat, topMat, topMat, sideMat, sideMat]));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(sGeo, 1), edgeMat));
  }
  function addPyramid(mesh, b) {
    const h = Math.min(0.9, b.height * 0.11);
    const geo = new THREE.ConeGeometry(TILE * 0.5, h, 4);
    geo.rotateY(Math.PI / 4);
    geo.translate(0, b.height + h / 2, 0);
    mesh.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x4a5a6a, emissive: 0x202a36, emissiveIntensity: 0.15,
      roughness: 0.6, metalness: 0.3,
    })));
  }
  function addAntenna(mesh, b) {
    const h = Math.min(1.6, 0.7 + b.height * 0.12);
    const geo = new THREE.CylinderGeometry(0.018, 0.045, h, 6);
    geo.translate(0, b.height + h / 2, 0);
    mesh.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x2e2e2e, roughness: 0.6, metalness: 0.4,
    })));
    // Aviation warning beacon at the tip — blinks in the tick loop.
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0x3a0a06, emissive: 0xff2a1a, emissiveIntensity: 1.6,
    });
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), tipMat);
    tip.position.set(0, b.height + h, 0);
    mesh.add(tip);
    beacons.push({ mat: tipMat, phase: rand(b.seed, 7) * Math.PI * 2 });
  }
  function addRoofBox(mesh, b, sideMat, topMat, edgeMat) {
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
  // Cumulative roll thresholds. Sorted ascending; first entry whose
  // `requires` passes and whose threshold the roll falls under wins.
  // When `requires` fails the slice still occupies the range — the roll
  // continues past it — so taller-only roofs don't inflate other types'
  // probabilities for shorter buildings.
  const ROOFS = [
    { threshold: 0.30, build: null },                                           // flat (most common)
    { threshold: 0.35, build: addSetback, requires: b => b.height > 6 },        // SunLife-style setback
    { threshold: 0.50, build: addPyramid },
    { threshold: 0.75, build: addAntenna },
    { threshold: 1.00, build: addRoofBox },                                     // catch-all
  ];
  function addRoof(mesh, b, sideMat, topMat, edgeMat) {
    if (b.isSignature) {
      // 1000 de la Gauchetière — copper-green pyramid spire
      const h = Math.min(1.8, b.height * 0.24);
      const geo = new THREE.ConeGeometry(TILE * 0.62, h, 4);
      geo.rotateY(Math.PI / 4);
      geo.translate(0, b.height + h / 2, 0);
      mesh.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: 0x4a7d6a, emissive: 0x274a3e, emissiveIntensity: 0.25,
        roughness: 0.45, metalness: 0.55,
      })));
      return;
    }
    const roll = rand(b.seed, 1);
    for (const r of ROOFS) {
      if (roll >= r.threshold) continue;
      if (r.requires && !r.requires(b)) continue;
      r.build && r.build(mesh, b, sideMat, topMat, edgeMat);
      return;
    }
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

  // Shared across all buildings — bottom face never shows once anchored to the ground.
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
      emissiveIntensity: CONFIG.IDLE_EMISSIVE,
      roughness: 0.78,
      metalness: 0.08,
    });
    const topMat = new THREE.MeshStandardMaterial({
      color: b.color.clone(),
      emissive: b.color.clone(),
      emissiveIntensity: CONFIG.IDLE_TOP_EMISSIVE,
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
      opacity: CONFIG.IDLE_EDGE,
    });
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), edgeMat));

    addRoof(mesh, b, sideMat, topMat, edgeMat);

    mesh.userData = { b, sideMat, topMat, edgeMat };
    buildingsGroup.add(mesh);
    buildingMeshes.push(mesh);
  });

  // ── Parks (green blocks between the towers) ────────────────────
  // Leftover cells from the layout pass. Each is a grass lawn with a few
  // low-poly trees, lit by the surrounding street lamps. Parks are decorative
  // only — they're never added to `buildingMeshes`, so they don't intercept
  // the hover/click raycast.
  if (parks.length) {
    const parksGroup = new THREE.Group();
    scene.add(parksGroup);

    const LAWN = SPACING - CONFIG.ROAD_W - 0.3;   // fill the block, leave a sidewalk
    const lawnGeo = new THREE.PlaneGeometry(LAWN, LAWN);
    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x1d3a28, emissive: 0x0f2417, emissiveIntensity: 0.3,
      roughness: 1, metalness: 0,
    });

    // First pass: lay out grass and collect tree transforms so the trunk and
    // foliage instanced meshes can be allocated at the right size.
    const treePos = [];                 // [x, y, z, scale, rotY] per tree
    for (const p of parks) {
      const lawn = new THREE.Mesh(lawnGeo, lawnMat);
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(p.x, 0.018, p.z);
      parksGroup.add(lawn);

      const n = 1 + Math.floor(rand(p.seed, 1) * CONFIG.TREES_PER_PARK);
      const spread = LAWN * 0.32;
      for (let t = 0; t < n; t++) {
        treePos.push(
          p.x + (rand(p.seed, t * 4 + 2) - 0.5) * 2 * spread,
          0.018,
          p.z + (rand(p.seed, t * 4 + 3) - 0.5) * 2 * spread,
          0.8 + rand(p.seed, t * 4 + 4) * 0.5,
          rand(p.seed, t * 4 + 5) * Math.PI * 2
        );
      }
    }
    const treeCount = treePos.length / 5;

    if (treeCount) {
      const TRUNK_H = 0.5, FOLIAGE_H = 0.95;
      const trunkGeo = new THREE.CylinderGeometry(0.05, 0.075, TRUNK_H, 6);
      trunkGeo.translate(0, TRUNK_H / 2, 0);      // base at origin → grows up from ground
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 0.9, metalness: 0 });
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);

      const foliageGeo = new THREE.ConeGeometry(0.42, FOLIAGE_H, 7);
      foliageGeo.translate(0, TRUNK_H * 0.85 + FOLIAGE_H / 2, 0);
      const foliageMat = new THREE.MeshStandardMaterial({
        color: 0x224e2f, emissive: 0x0e2a16, emissiveIntensity: 0.35,
        roughness: 0.85, metalness: 0,
      });
      const foliage = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);

      const m = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      const yAxis = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < treeCount; i++) {
        pos.set(treePos[i*5], treePos[i*5 + 1], treePos[i*5 + 2]);
        const s = treePos[i*5 + 3];
        scl.set(s, s, s);
        quat.setFromAxisAngle(yAxis, treePos[i*5 + 4]);
        m.compose(pos, quat, scl);
        trunks.setMatrixAt(i, m);
        foliage.setMatrixAt(i, m);
      }
      trunks.instanceMatrix.needsUpdate = true;
      foliage.instanceMatrix.needsUpdate = true;
      parksGroup.add(trunks);
      parksGroup.add(foliage);
    }
  }

  // ── OrbitControls ──────────────────────────────────────────────
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 3.0, 0);
  controls.minDistance = 6;
  controls.maxDistance = gridMax * 2.6;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minPolarAngle = Math.PI * 0.08;
  controls.zoomSpeed = 0.8;
  controls.rotateSpeed = 0.9;
  controls.autoRotate = true;        // slow show-off spin on load…
  controls.autoRotateSpeed = 0.5;
  controls.update();

  let isDragging = false;
  controls.addEventListener('start', () => {
    isDragging = true;
    controls.autoRotate = false;     // …stops for good the moment you grab it
    hideTooltip();
  });
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

  // ── Tooltip helpers ────────────────────────────────────────────
  function buildTooltipHTML(b, extraHTML = '') {
    let commitsCell;
    if (typeof b.commits === 'number') {
      commitsCell = `<strong style="color:var(--text)">${b.commits.toLocaleString()}</strong> commits`;
    } else {
      // undefined → not fetched yet (…); null → fetch failed / rate-limited (—)
      const glyph = b.commits === null ? '—' : '…';
      commitsCell = `<span style="opacity:.6">${glyph} commits</span>`;
    }
    return `
      <div class="city__tooltip-name">${b.name.replace(/-/g,'‑')}</div>
      <div class="city__tooltip-row"><span class="city__tooltip-dot" style="background:#${b.color.getHexString()}"></span>${b.language}</div>
      <div class="city__tooltip-row" style="margin-top:5px;gap:5px">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        ${commitsCell}
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

  // Render a building tooltip and, if the commit count hasn't been
  // fetched yet, refresh just the innerHTML when it arrives — but only
  // if the same building is still the active target. Layout doesn't
  // shift because the placeholder row occupies the same line as the
  // resolved row.
  function showBuildingTooltip(mesh, x, y, opts = {}) {
    const { above = false, extra = '', isCurrent = () => true } = opts;
    const b = mesh.userData.b;
    showTooltip(buildTooltipHTML(b, extra), x, y, above);
    const p = ensureCommits(b);
    if (p) {
      p.then(() => {
        if (!tooltip.classList.contains('visible')) return;
        if (!isCurrent()) return;
        tooltip.innerHTML = buildTooltipHTML(b, extra);
      });
    }
  }

  // ── Hover & raycasting ─────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null;

  function setHover(mesh) {
    if (hovered === mesh) return;
    if (hovered) {
      hovered.userData.sideMat.emissiveIntensity = CONFIG.IDLE_EMISSIVE;
      hovered.userData.topMat.emissiveIntensity  = CONFIG.IDLE_TOP_EMISSIVE;
      hovered.userData.edgeMat.opacity           = CONFIG.IDLE_EDGE;
    }
    hovered = mesh;
    if (hovered) {
      hovered.userData.sideMat.emissiveIntensity = CONFIG.HOVER_EMISSIVE;
      hovered.userData.topMat.emissiveIntensity  = CONFIG.HOVER_TOP_EMISSIVE;
      hovered.userData.edgeMat.opacity           = CONFIG.HOVER_EDGE;
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

  // Open a repo in a new tab. The anchor must be attached to the DOM
  // for click() to navigate reliably in Chrome — a detached <a> can
  // silently open a blank tab instead of following the href.
  function openRepo(url) {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ── Mouse interaction ──────────────────────────────────────────
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (isDragging) { setHover(null); hideTooltip(); return; }
    const mesh = hitTest(e.clientX, e.clientY);
    setHover(mesh);
    if (mesh) {
      canvas.style.cursor = 'pointer';
      showBuildingTooltip(mesh, e.clientX, e.clientY, {
        isCurrent: () => hovered === mesh,
      });
    } else {
      canvas.style.cursor = 'grab';
      hideTooltip();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    setHover(null);
    hideTooltip();
  });

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
      showBuildingTooltip(mesh, t.clientX, t.clientY, {
        above: true,
        extra,
        isCurrent: () => lastTouchedMesh === mesh,
      });
    }
  }, { passive: true });

  // ── Animation loop ─────────────────────────────────────────────
  const easeOutExpo = (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  let buildupStart = null;
  let buildupActive = false;
  let cityVisible  = false;
  let lastNow = null;

  function tick(now) {
    requestAnimationFrame(tick);
    if (!cityVisible) { lastNow = now; return; }

    const dt = lastNow == null ? 0 : Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    const time = now / 1000;

    controls.update();

    // Twinkling stars
    if (starUniforms) starUniforms.uTime.value = time;

    // Cross: slow breathing glow
    if (crossMat) {
      const pulse = 1.15 + 0.35 * (0.5 + 0.5 * Math.sin(time * 1.3));
      crossMat.emissiveIntensity = pulse;
      if (crossLight) crossLight.intensity = 4 + pulse * 2;
    }

    // Rooftop aviation beacons — slow red blink, each on its own phase
    for (let i = 0; i < beacons.length; i++) {
      const s = Math.sin(time * 2.2 + beacons[i].phase);
      beacons[i].mat.emissiveIntensity = s > 0.55 ? 2.6 : 0.25;
    }

    // Occasional shooting star
    if (meteors) meteors.update(dt);

    if (buildupActive) {
      const t = Math.min((now - buildupStart) / CONFIG.BUILDUP_MS, 1);
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
