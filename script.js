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

  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      updateProgress();
      updateNav();
      updateActiveLink();
    });
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

  // ── Theme toggle ──────────────────────────────────────────────
  // The <head> boot script has already set documentElement.dataset.theme;
  // this wires the button, persists explicit choices, and follows the OS
  // again when the choice matches the system preference.
  const themeToggle = document.getElementById('theme-toggle');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
      themeToggle.setAttribute('aria-label',
        theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
      meta.setAttribute('content', theme === 'dark' ? '#0b1220' : '#f4f8fc');
    });
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  if (themeToggle) {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

    themeToggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try {
        if ((darkQuery.matches ? 'dark' : 'light') === next) {
          localStorage.removeItem('theme');
        } else {
          localStorage.setItem('theme', next);
        }
      } catch (e) {}
      if (prefersReducedMotion || !document.startViewTransition) {
        applyTheme(next);
        return;
      }
      const r = themeToggle.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const root = document.documentElement;
      root.style.setProperty('--vt-x', `${x}px`);
      root.style.setProperty('--vt-y', `${y}px`);
      root.style.setProperty('--vt-r', `${radius}px`);
      root.classList.add('theme-transition');
      const vt = document.startViewTransition(() => applyTheme(next));
      vt.finished.finally(() => root.classList.remove('theme-transition'));
    });

    darkQuery.addEventListener('change', (e) => {
      let stored = null;
      try { stored = localStorage.getItem('theme'); } catch (err) {}
      if (!stored) applyTheme(e.matches ? 'dark' : 'light');
    });
  }

  // ── Active nav link on scroll ─────────────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav__links a[href^="#"]');
  const NAV_OFFSET = 80;

  const navPill = document.querySelector('.nav__pill');
  let activeId = null;

  // The pill slides under whichever plain link is current. The Contact
  // button and sections without a nav entry have no pill.
  function movePill() {
    if (!navPill) return;
    const active = navLinks.querySelector('a.active:not(.nav__cta)');
    if (!active || getComputedStyle(navPill).display === 'none') {
      navPill.classList.remove('is-on');
      return;
    }
    navPill.style.width = `${active.offsetWidth}px`;
    navPill.style.transform = `translateX(${active.offsetLeft}px)`;
    navPill.classList.add('is-on');
  }

  function updateActiveLink() {
    let current = '';
    sections.forEach(section => {
      if (window.scrollY >= section.offsetTop - NAV_OFFSET) current = section.id;
    });
    // A short last section never reaches the top of the viewport.
    const doc = document.documentElement;
    if (window.scrollY > 0 && window.innerHeight + window.scrollY >= doc.scrollHeight - 2) {
      current = sections[sections.length - 1].id;
    }
    if (current === activeId) return;
    activeId = current;
    navAnchors.forEach(a => {
      const on = a.getAttribute('href') === `#${current}`;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    movePill();
  }
  updateActiveLink();
  window.addEventListener('resize', movePill, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);

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
  document.querySelectorAll([
    '.projects__grid > .card',
    '.about__text > p',
    '.about__callout',
    '.github-stats__subtitle',
    '.github-graph',
    '.city__dashboard',
    '.sphere__subtitle',
    '.sphere',
    '.study-explorer',
    '.study__divider',
    '.study__list--personal > .study__item',
    '.photography__heading',
    '.photography__featured > .photography__photo',
    '.photography__more',
    '.contact__inner > *',
  ].join(',')).forEach(el => el.classList.add('reveal'));

  const reveals = document.querySelectorAll('.reveal');
  if (prefersReducedMotion) {
    reveals.forEach(el => el.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = Array.from(el.parentElement.querySelectorAll('.reveal:not(.visible)'));
        const delay = Math.min(Math.max(siblings.indexOf(el), 0) * 80, 320);
        setTimeout(() => el.classList.add('visible'), delay);
        observer.unobserve(el);
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -48px 0px' });

    reveals.forEach(el => observer.observe(el));
  }

  // ── Lazy-load the 3D skyline ──────────────────────────────────
  // Three.js (~600KB) and the city scene are imported only when the
  // section nears the viewport. The rootMargin warms the import a bit
  // before the user reaches the section so the spinner can swap out
  // for the rendered scene without a perceptible gap.
  const citySection = document.getElementById('city');
  if (citySection) {
    const cityLoader = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry || !entry.isIntersecting) return;
      cityLoader.disconnect();
      import('./city.js')
        .then(({ initCity }) => initCity())
        .catch(err => {
          console.error('initCity failed:', err);
          const loading = document.getElementById('city-loading');
          if (loading) loading.innerHTML = '<span style="color:var(--text-dim);font-size:.85rem">Could not load the 3D skyline.</span>';
        });
    }, { rootMargin: '400px 0px' });
    cityLoader.observe(citySection);
  }

  // ── Hero card clock (Montréal local time) ────────────────────
  const heroClock = document.getElementById('hero-clock');
  if (heroClock && typeof Intl !== 'undefined') {
    try {
      const fmt = new Intl.DateTimeFormat('en-CA', {
        hour: 'numeric', minute: '2-digit', hour12: false, timeZone: 'America/Toronto'
      });
      const tickClock = () => { heroClock.textContent = fmt.format(new Date()); };
      tickClock();
      setInterval(tickClock, 30 * 1000);
    } catch (e) {}
  }

  // ── Hero live GitHub numbers ──────────────────────────────────
  // The hero stats line is always visible on first paint, so kick the fetch
  // shortly after load (idle if available) — the shimmer placeholder covers
  // the brief gap before the API responds.
  const heroStatsGrid = document.getElementById('github-stats-grid');
  if (heroStatsGrid) {
    const kickStats = () => {
      import('./github-stats.js')
        .then(({ initGithubStats }) => initGithubStats())
        .catch(err => {
          console.error('initGithubStats failed:', err);
          heroStatsGrid.hidden = true;
        });
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(kickStats, { timeout: 1500 });
    } else {
      setTimeout(kickStats, 200);
    }
  }

  // ── Lazy-load the contribution heatmap ────────────────────────
  // Only fires when the user scrolls near #github.
  const ghSection = document.getElementById('github');
  if (ghSection) {
    const ghLoader = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry || !entry.isIntersecting) return;
      ghLoader.disconnect();
      import('./github-graph.js')
        .then(({ initGithubGraph }) => initGithubGraph())
        .catch(err => {
          console.error('initGithubGraph failed:', err);
          const graph = document.getElementById('github-graph');
          if (graph) graph.innerHTML = '<span class="github-stats__error">Contribution graph unavailable.</span>';
        });
    }, { rootMargin: '400px 0px' });
    ghLoader.observe(ghSection);
  }

  // ── Lazy-load the skills tech sphere ──────────────────────────
  // Enhances #stack into a rotating 3D icon cloud. On failure (or
  // reduced motion / no JS) the original pill grid remains as the fallback.
  const stackSection = document.getElementById('stack');
  if (stackSection && !prefersReducedMotion) {
    const stackLoader = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry || !entry.isIntersecting) return;
      stackLoader.disconnect();
      import('./skill-sphere.js')
        .then(({ initSkillSphere }) => initSkillSphere())
        .catch(err => console.error('initSkillSphere failed:', err));
    }, { rootMargin: '400px 0px' });
    stackLoader.observe(stackSection);
  }

  // ── "Inside the build": animated open and close ───────────────
  // <details> snaps by default. Animate the element's height between
  // its closed (summary only) and open sizes instead.
  if (!prefersReducedMotion && 'animate' in Element.prototype) {
    document.querySelectorAll('.project__details').forEach(details => {
      const summary = details.querySelector('summary');
      if (!summary) return;
      let anim = null;
      const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';

      function run(from, to, done) {
        if (anim) anim.cancel();
        details.style.overflow = 'hidden';
        anim = details.animate({ height: [`${from}px`, `${to}px`] }, { duration: 380, easing: ease });
        anim.onfinish = () => {
          anim = null;
          details.style.overflow = '';
          details.classList.remove('is-closing');
          done();
        };
        anim.oncancel = () => { anim = null; };
      }

      summary.addEventListener('click', (e) => {
        e.preventDefault();
        const from = details.offsetHeight;
        if (details.open && !details.classList.contains('is-closing')) {
          details.classList.add('is-closing');
          const cs = getComputedStyle(details);
          const closed = summary.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
          run(from, closed, () => { details.open = false; });
        } else {
          details.classList.remove('is-closing');
          details.open = true;
          run(from, details.scrollHeight + parseFloat(getComputedStyle(details).borderTopWidth), () => {});
        }
      });
    });
  }

  // ── Hero circuit board ────────────────────────────────────────
  // The drawing-in is CSS. Here: lean the board toward the pointer, and
  // stop the travelling pulses while the hero is off screen.
  const circuit = document.getElementById('hero-circuit');
  const hero = document.getElementById('hero');
  if (circuit && hero) {
    new IntersectionObserver((entries) => {
      circuit.classList.toggle('is-paused', !entries[0].isIntersecting);
    }).observe(circuit);

    if (!prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      const step = () => {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        circuit.style.setProperty('--px', cx.toFixed(3));
        circuit.style.setProperty('--py', cy.toFixed(3));
        raf = (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) ? requestAnimationFrame(step) : 0;
      };
      const aim = (x, y) => { tx = x; ty = y; if (!raf) raf = requestAnimationFrame(step); };
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        aim(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2);
      });
      hero.addEventListener('pointerleave', () => aim(0, 0));
    }
  }
})();
