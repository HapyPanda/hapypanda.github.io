(() => {
  const $ = (query, root = document) => root.querySelector(query);
  const $$ = (query, root = document) => [...root.querySelectorAll(query)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Articles remain static pages. The reader progressively enhances their real links.
  const reader = $('dialog.reader');
  const archive = $('dialog.archive');
  const content = $('[data-reader-content]', reader);
  let originURL = location.href;
  let readerTitle = document.title;
  let requestID = 0;
  let focusReturn = null;
  const pauseMedia = root => $$('video', root).forEach(video => video.pause());
  const syncDialogs = () => {
    document.body.style.overflow = $('dialog[open]') ? 'hidden' : '';
    if ($('dialog[open]')) pauseMedia(document);
  };
  let mathLoader;
  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src;
    script.onload = resolve; script.onerror = reject; document.head.append(script);
  });
  async function enhanceArticle(root) {
    $$('.code-block', root).forEach(block => {
      if ($('.copy-code', block)) return;
      const button = document.createElement('button');
      button.className = 'copy-code'; button.textContent = '复制'; button.type = 'button';
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText($('code', block).textContent);
          button.textContent = '已复制'; setTimeout(() => { button.textContent = '复制'; }, 1800);
        } catch (_) { button.textContent = '请手动复制'; }
      });
      block.append(button);
    });
    if (root.dataset.math !== 'true' || !$('.math-inline, .math-block', root)) return;
    try {
      if (!mathLoader) {
        const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/vendor/katex/katex.min.css'; document.head.append(css);
        mathLoader = loadScript('/vendor/katex/katex.min.js').then(() => loadScript('/vendor/katex/contrib/auto-render.min.js'));
      }
      await mathLoader;
      window.renderMathInElement(root, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    } catch (_) { mathLoader = null; /* Leave the original TeX readable if loading fails. */ }
  }
  const standalone = $('.standalone .reader-article');
  if (standalone) enhanceArticle(standalone);

  async function openArticle(href, push = true) {
    const url = new URL(href, location.href);
    const id = ++requestID;
    try {
      const response = await fetch(url.pathname);
      if (!response.ok) throw new Error('Missing article');
      const html = new DOMParser().parseFromString(await response.text(), 'text/html');
      const article = $('.reader-article', html);
      if (!article) throw new Error('Invalid article');
      if (id !== requestID) return;
      if (!reader.open) {
        if (!history.state?.reader) originURL = location.href;
        readerTitle = document.title;
        focusReturn = document.activeElement;
      }
      archive?.close();
      pauseMedia(content);
      content.replaceChildren(document.importNode(article, true));
      if (!reader.open) reader.showModal();
      reader.scrollTop = 0;
      if (push) history.pushState({ reader: true, origin: originURL }, '', url.pathname + url.hash);
      document.title = html.title;
      syncDialogs();
      enhanceArticle($('.reader-article', content));
      if (url.hash) {
        const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        target?.scrollIntoView();
      }
    } catch (_) { if (id === requestID) location.assign(url.href); }
  }
  function closeDialog(dialog, changeURL = true) {
    ++requestID;
    pauseMedia(dialog);
    dialog.close();
    if (dialog === reader) {
      if (changeURL) history.replaceState(null, '', originURL);
      document.title = readerTitle;
      content.replaceChildren();
    }
    syncDialogs();
    if (focusReturn?.isConnected) focusReturn.focus({ preventScroll: true });
  }
  $$('dialog').forEach(dialog => {
    $('[data-close-modal]', dialog).addEventListener('click', () => closeDialog(dialog));
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
    dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog); });
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-reader]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !reader.showModal) return;
    // A standalone page uses ordinary navigation for its older/newer links.
    if (link.closest('.standalone.reader')) return;
    event.preventDefault(); openArticle(link.href);
  });
  window.addEventListener('popstate', () => {
    if (history.state?.reader) { originURL = history.state.origin; openArticle(location.href, false); }
    else if (reader.open) closeDialog(reader, false);
  });
  $('[data-open-archive]')?.addEventListener('click', event => {
    if (!archive?.showModal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); focusReturn = event.currentTarget;
    archive.showModal(); syncDialogs();
  });
  const legacySlug = new URLSearchParams(location.search).get('post');
  if (legacySlug && /^[\w-]+$/.test(legacySlug)) {
    const clean = new URL(location.href); clean.searchParams.delete('post');
    history.replaceState(null, '', clean); originURL = clean.href;
    openArticle(`/posts/${legacySlug}/`);
  }

  // Search the same rendered list that remains readable without JavaScript.
  $$('.archive').forEach(root => {
    const tools = $('.archive-tools', root);
    if (!tools) return;
    const input = $('input', tools), select = $('select', tools);
    const rows = $$('.archive-list>a', root);
    tools.hidden = false;
    // Real tag links are useful on standalone pages; the dialog uses its select.
    if (root.tagName === 'DIALOG') $('.tag-filters', root).hidden = true;
    else select.hidden = true;
    const filter = () => {
      const query = input.value.trim().toLocaleLowerCase();
      let count = 0;
      rows.forEach(row => {
        row.hidden = !row.textContent.toLocaleLowerCase().includes(query) || (select.value !== 'all' && !row.dataset.tags.split(' ').includes(select.value));
        if (!row.hidden) count++;
      });
      $('.result-count', root).textContent = `${count} 篇文章`;
      $('.empty-state', root).hidden = count !== 0;
    };
    input.addEventListener('input', filter); select.addEventListener('change', filter);
    $('[data-reset-search]', root).addEventListener('click', () => { input.value = ''; select.value = 'all'; filter(); input.focus(); });
  });

  // Native horizontal scrolling works even before this enhancement loads.
  const track = $('.highlight-track');
  if (!track) return;
  const section = track.closest('section');
  const cards = [...track.children];
  const controls = $('.carousel-controls', section);
  const playButton = $('.play-button', controls);
  const dots = $$('.pager-dot', controls);
  controls.hidden = false; $('.carousel-arrows', section).hidden = false;
  let active = 0, playing = !reduced.matches, visible = false, hovered = false, focused = false;
  let progress = 0, previous = null, drag = null, dragged = false;
  const reset = () => { progress = 0; controls.style.setProperty('--progress', '0'); };
  const syncPlay = () => {
    playButton.disabled = reduced.matches;
    playButton.setAttribute('aria-label', playing ? '暂停自动切换' : '播放精选文章');
    playButton.title = reduced.matches ? '已按系统设置减少动态效果' : '';
    $('[data-pause-icon]', controls).hidden = !playing;
    $('[data-play-icon]', controls).hidden = playing;
  };
  function goTo(index, user = true) {
    const next = (index + cards.length) % cards.length;
    const card = cards[next];
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft - (track.clientWidth - card.offsetWidth) / 2, behavior: reduced.matches ? 'instant' : 'smooth' });
    if (user) { playing = false; syncPlay(); }
    reset();
  }
  function pauseInactive() {
    cards.forEach((card, index) => { if (index !== active || !visible || document.hidden || $('dialog[open]')) pauseMedia(card); });
  }
  track.addEventListener('scroll', () => {
    const center = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0, distance = Infinity;
    cards.forEach((card, index) => {
      const delta = Math.abs(card.offsetLeft - track.offsetLeft + card.offsetWidth / 2 - center);
      if (delta < distance) { nearest = index; distance = delta; }
    });
    if (active === nearest) return;
    active = nearest; reset(); pauseInactive();
    dots.forEach((dot, index) => { dot.classList.toggle('active', index === active); dot.setAttribute('aria-current', String(index === active)); });
    $('[data-slide-number]', section).textContent = String(active + 1).padStart(2, '0');
  }, { passive: true });
  dots.forEach((dot, index) => dot.addEventListener('click', () => goTo(index)));
  $('[data-slide-prev]', section).addEventListener('click', () => goTo(active - 1));
  $('[data-slide-next]', section).addEventListener('click', () => goTo(active + 1));
  playButton.addEventListener('click', () => { playing = !playing; focused = false; syncPlay(); });
  track.addEventListener('keydown', event => {
    if (event.target.closest('video')) return;
    if (['ArrowRight', 'ArrowLeft'].includes(event.key)) { event.preventDefault(); goTo(active + (event.key === 'ArrowRight' ? 1 : -1)); }
  });
  track.addEventListener('pointerdown', event => {
    if (event.target.closest('video')) return;
    playing = false; syncPlay(); dragged = false;
    if (event.pointerType === 'mouse') drag = { x: event.clientX, scroll: track.scrollLeft };
  });
  track.addEventListener('pointermove', event => {
    if (!drag) return;
    const delta = event.clientX - drag.x;
    if (Math.abs(delta) > 6) dragged = true;
    if (dragged) track.scrollLeft = drag.scroll - delta;
  });
  const endDrag = () => { drag = null; setTimeout(() => { dragged = false; }, 0); };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointerleave', () => { endDrag(); hovered = false; });
  track.addEventListener('dragstart', event => event.preventDefault());
  track.addEventListener('click', event => { if (dragged) { event.preventDefault(); event.stopPropagation(); } }, true);
  track.addEventListener('mouseenter', () => { hovered = true; });
  track.addEventListener('focusin', () => { focused = true; });
  track.addEventListener('focusout', event => { if (!track.contains(event.relatedTarget)) focused = false; });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; pauseInactive(); }, { threshold: .25 }).observe(section);
  document.addEventListener('visibilitychange', () => { pauseInactive(); if (document.hidden) pauseMedia(document); });
  reduced.addEventListener('change', () => { if (reduced.matches) playing = false; syncPlay(); });
  new ResizeObserver(() => {
    const card = cards[active];
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft - (track.clientWidth - card.offsetWidth) / 2, behavior: 'instant' });
  }).observe(track);
  // A video outside the viewport should stop too, including publication media.
  const mediaObserver = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) entry.target.pause(); }));
  $$('video').forEach(video => mediaObserver.observe(video));
  syncPlay();
  function tick(now) {
    const canPlay = playing && visible && !hovered && !focused && !document.hidden && !reduced.matches && !$('dialog[open]') && !$$('video', track).some(video => !video.paused);
    if (canPlay && previous !== null) {
      progress += Math.min(now - previous, 100) / 7500;
      controls.style.setProperty('--progress', String(Math.min(progress, 1)));
      if (progress >= 1) goTo(active + 1, false);
    }
    previous = now;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
