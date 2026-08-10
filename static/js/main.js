/* Progressive enhancement only. With JS disabled every page is still complete:
   the TOC is a plain open <details>,
   code is readable without highlighting, and math shows as raw TeX. */

(function () {
  'use strict';

  // --- KaTeX ---------------------------------------------------------------
  if (window.renderMathInElement) {
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
      throwOnError: false,
      errorColor: '#B4232A',
    });
  }

  // --- code highlighting + copy button -------------------------------------
  const blocks = document.querySelectorAll('.code-block');
  blocks.forEach((block) => {
    const code = block.querySelector('code');
    if (!code) return;

    if (window.hljs) {
      try { window.hljs.highlightElement(code); } catch (e) { /* unknown language */ }
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'copy';
    btn.setAttribute('aria-label', '复制代码');
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent.replace(/\n$/, ''));
        btn.textContent = 'copied';
      } catch (e) {
        btn.textContent = 'failed';
      }
      setTimeout(() => { btn.textContent = 'copy'; }, 1400);
    });
    block.appendChild(btn);
  });

  // --- 元宝：在毛玻璃舞台上往返、休息，再去右侧写代码 ---------------------
  const yuanbao = document.querySelector('.yuanbao-pet');
  if (yuanbao) animateYuanbao(yuanbao);

  // Blog cards are one large hit target; their nested links keep their own jobs.
  document.querySelectorAll('.post-card[data-href]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button, input, textarea, select')) return;
      window.location.href = card.dataset.href;
    });
  });

  // Keep publication previews quiet for people who prefer less motion.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.media-tile video').forEach((video) => {
      video.autoplay = false;
      video.pause();
    });
  }

  function animateYuanbao(pet) {
    const image = pet.querySelector('.yuanbao-frame');
    const track = pet.parentElement;
    const root = pet.dataset.assetRoot;
    if (!image || !track || !root) return;

    const paths = {
      left: Array.from({ length: 8 }, (_, i) => `${root}/walk-left-${String(i).padStart(2, '0')}.png`),
      sleep: Array.from({ length: 6 }, (_, i) => `${root}/sleep-${String(i).padStart(2, '0')}.png`),
      right: Array.from({ length: 8 }, (_, i) => `${root}/walk-right-${String(i).padStart(2, '0')}.png`),
      code: Array.from({ length: 6 }, (_, i) => `${root}/code-${String(i).padStart(2, '0')}.png`),
    };

    Object.values(paths).flat().forEach((src) => {
      const preload = new Image();
      preload.src = src;
    });

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const positions = () => {
      const width = track.getBoundingClientRect().width;
      const petWidth = pet.getBoundingClientRect().width;
      const limit = Math.max(0, width - petWidth);
      return {
        left: Math.min(limit, width * .27),
        right: Math.min(limit, width * .55),
      };
    };

    if (reducedMotion.matches) {
      const { left } = positions();
      image.src = paths.sleep[5];
      pet.style.transform = `translate3d(${left}px, 0, 0)`;
      return;
    }

    const scenes = [
      { frames: paths.left, duration: 3100, frameMs: 118, from: 'right', to: 'left' },
      { frames: paths.sleep, duration: 5000, frameMs: 420, from: 'left', to: 'left' },
      { frames: paths.right, duration: 3300, frameMs: 118, from: 'left', to: 'right' },
      { frames: paths.code, duration: 6200, frameMs: 190, from: 'right', to: 'right' },
    ];
    const cycle = scenes.reduce((sum, scene) => sum + scene.duration, 0);
    let startedAt;
    let currentSrc = '';

    const ease = (value) => value * value * (3 - 2 * value);
    const draw = (now) => {
      if (startedAt === undefined) startedAt = now;
      let elapsed = (now - startedAt) % cycle;
      let scene = scenes[0];

      for (const candidate of scenes) {
        if (elapsed < candidate.duration) {
          scene = candidate;
          break;
        }
        elapsed -= candidate.duration;
      }

      const anchors = positions();
      const progress = Math.min(1, elapsed / scene.duration);
      const from = anchors[scene.from];
      const to = anchors[scene.to];
      const x = from + (to - from) * ease(progress);
      const src = scene.frames[Math.floor(elapsed / scene.frameMs) % scene.frames.length];

      if (src !== currentSrc) {
        image.src = src;
        currentSrc = src;
      }
      pet.style.transform = `translate3d(${x}px, 0, 0)`;
      window.requestAnimationFrame(draw);
    };

    window.requestAnimationFrame(draw);
  }

  // --- TOC / rail: mark the section currently on screen ----------------------
  spy('.rail-toc a[href^="#"]');
  spy('.rail-nav a[href^="#"]');

  function spy(selector) {
    const links = Array.from(document.querySelectorAll(selector));
    if (!links.length) return;

    const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const targets = Array.from(byId.keys())
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const pageTargets = targets.filter((target) => !target.closest('.rail'));
    let frame = 0;

    const paint = () => {
      frame = 0;
      let active = null;
      let hashPinned = false;
      const nearTop = window.scrollY <= 24;
      const topHash = decodeURIComponent(window.location.hash.slice(1));

      // The home-page "about" card lives inside the sticky rail, so its own
      // viewport position cannot be used as a scroll signal.
      if (nearTop && byId.has('about') && topHash !== 'blog') active = 'about';

      const hashTarget = pageTargets.find((target) => target.id === topHash);
      if (!active && hashTarget) {
        const hashTop = hashTarget.getBoundingClientRect().top;
        if (hashTop >= 0 && hashTop < window.innerHeight) {
          active = hashTarget.id;
          hashPinned = true;
        }
      }

      if (!active) {
        const threshold = Math.min(420, window.innerHeight * .45);
        for (const target of pageTargets) {
          if (target.getBoundingClientRect().top <= threshold) active = target.id;
        }
      }

      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (atBottom && !hashPinned && pageTargets.length) active = pageTargets[pageTargets.length - 1].id;
      if (!active) active = pageTargets[0]?.id || targets[0]?.id || null;

      links.forEach((a) => a.classList.remove('is-current'));
      if (active && byId.has(active)) byId.get(active).classList.add('is-current');
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('hashchange', schedule);
    paint();
  }
})();
