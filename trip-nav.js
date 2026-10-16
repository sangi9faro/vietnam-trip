// Shared in-trip navigation for guide.html, index.html, vote.html.
// Phone: top bar (back + title) and a bottom tab bar; ≥768px: left rail (icons, labels from 1440px).
// <script src="trip-nav.js" data-title="工具箱" data-top="1"></script> placed right after <body>.
(function () {
  const s = document.currentScript, HUB = 'https://sangi9faro.github.io/';
  const showTop = s.dataset.top !== '0', title = s.dataset.title || document.title;
  const ITEMS = [['guide', '行程', 'map', 'guide.html'], ['toolbox', '工具箱', 'wallet', './#info'], ['packing', '行李', 'luggage', './#packing'], ['vote', '投票', 'vote', 'vote.html']];
  const current = () => /guide\.html$/.test(location.pathname) ? 'guide' : /vote\.html$/.test(location.pathname) ? 'vote' : (location.hash === '#packing' ? 'packing' : 'toolbox');
  const link = ([id, label, icon, href], cls) => `<a href="${href}" data-tn="${id}" data-tip="${label}" aria-label="${label}"${cls ? ` class="${cls}"` : ''}><i data-lucide="${icon}"></i><span>${label}</span></a>`;
  document.body.classList.add('tn');
  if (showTop) document.body.insertAdjacentHTML('afterbegin', `<header class="tn-top"><a class="tn-back" href="${HUB}"><i data-lucide="chevron-left"></i>我的旅行</a><h1>${title}</h1><span class="tn-spacer"></span></header>`);
  document.body.insertAdjacentHTML('beforeend',
    `<nav class="tn-rail" aria-label="旅行导航"><a class="tn-home" href="${HUB}" data-tip="我的旅行" aria-label="我的旅行"><i data-lucide="chevron-left"></i><span>我的旅行</span></a>${ITEMS.map(i => link(i)).join('')}</nav>` +
    `<nav class="tn-tabs" aria-label="旅行导航">${ITEMS.map(i => link(i)).join('')}</nav>`);
  function update() { const c = current(); document.querySelectorAll('[data-tn]').forEach(a => { if (a.dataset.tn === c) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
  update(); addEventListener('hashchange', update);
  // expose the top bar height so pages can stick their own bars right under it
  const top = document.querySelector('.tn-top');
  const setH = () => document.documentElement.style.setProperty('--tn-top-h', (top ? top.offsetHeight : 0) + 'px');
  setH(); if (top && window.ResizeObserver) new ResizeObserver(setH).observe(top);
  window.tripNav = { update };
  const icons = () => { try { if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 1.75 } }); } catch (e) {} };
  if (window.lucide) icons(); else addEventListener('DOMContentLoaded', icons);
})();
