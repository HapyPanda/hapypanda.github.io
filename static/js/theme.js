// Use the approved preview's preference after migration; accept the older site key too.
(() => {
  try {
    const saved = localStorage.getItem('personal-site-preview-theme') || localStorage.getItem('theme');
    document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
  } catch (_) { /* The light theme remains usable without storage. */ }
})();
