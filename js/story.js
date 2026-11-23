/* Hikâye bölümleri (eskiden ana sayfada, şimdi iç sayfalarda): film karelerine dönüş bağlantıları,
   periyodik tablodaki seçili metalden karta uzanan ışık çizgisi ve malzeme örneklerinden metale geçiş.
   Her parça yalnız kendi öğeleri sayfada varsa çalışır. */
(() => {
  'use strict';
  const story = document.querySelector('.home-story');
  if (!story) return;
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'tr';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const film = document.querySelector('.film');

  // Film kareleri: film bu sayfadaysa ilgili sahneye atlar, değilse ana sayfadaki filmin o sahnesini açar.
  const shots = [...story.querySelectorAll('.shot-link')];
  function syncShotLinks() {
    for (const link of shots) {
      const url = new URL(link.href);
      url.searchParams.set('lang', language());
      link.href = (film ? '' : 'index.html') + url.search;
    }
  }
  syncShotLinks();
  for (const link of shots) {
    link.addEventListener('click', event => {
      if (!film || !film.seek || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const name = new URL(link.href).searchParams.get('sahne');
      const index = [...film.querySelectorAll('[data-scene]')].findIndex(scene => scene.dataset.scene === name);
      const chapter = film.querySelector('[data-go="' + index + '"]');
      if (!chapter) return;
      event.preventDefault();
      chapter.focus({ preventScroll: true });
      chapter.click();
    });
  }

  // Seçili metalden karta uzanan ışık: üst hücre kenarını boşluğa kadar izler, çizgi hiçbir sembolü kesmez.
  const lab = story.querySelector('.metal-lab');
  const table = lab && lab.querySelector('.pt');
  if (lab) {
    const trace = lab.querySelector('.metal-trace');
    const card = lab.querySelector('.assay-card');
    let traceFrame = 0;
    function drawTrace(animate = false) {
      cancelAnimationFrame(traceFrame);
      const cell = table.querySelector('[aria-pressed="true"]');
      if (!cell || !trace.clientWidth || !table.offsetWidth) return;
      const box = lab.getBoundingClientRect();
      const source = cell.getBoundingClientRect();
      const dest = card.getBoundingClientRect();
      const x = source.right - box.left;
      const y = source.top - box.top - 2;
      const endX = dest.left - box.left - 1;
      const emblem = card.querySelector('.assay-emblem').getBoundingClientRect();
      const endY = emblem.top - box.top + emblem.height / 2;
      const gutter = table.getBoundingClientRect().right - box.left + 5;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      trace.width = Math.round(box.width * scale);
      trace.height = Math.round(box.height * scale);
      const ctx = trace.getContext('2d');
      ctx.scale(scale, scale);
      const tone = cell.style.getPropertyValue('--tone');
      const path = new Path2D();
      path.moveTo(x, y);
      path.lineTo(gutter, y);
      path.lineTo(endX - 9, endY);
      path.lineTo(endX, endY);
      const length = gutter - x + Math.hypot(endX - 9 - gutter, endY - y) + 9;
      const start = performance.now();
      const moving = animate && !motion.matches && box.top < innerHeight && box.bottom > 0;
      function paint(now) {
        ctx.clearRect(0, 0, box.width, box.height);
        ctx.strokeStyle = ctx.fillStyle = ctx.shadowColor = tone;
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1;
        ctx.stroke(path);
        for (const [cx, cy] of [[x, y], [endX, endY]]) {
          ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.fill();
        }
        const progress = (now - start) / 570;
        if (!moving || progress >= 1) return;
        ctx.save();
        ctx.strokeStyle = '#fff6dd';
        ctx.shadowBlur = 7;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([13, length + 14]);
        ctx.lineDashOffset = 13 - (length + 13) * progress;
        ctx.stroke(path);
        ctx.restore();
        traceFrame = requestAnimationFrame(paint);
      }
      paint(start);
    }
    card.addEventListener('say:metal', () => drawTrace(true));
    const layout = new ResizeObserver(() => drawTrace());
    for (const el of [lab, table, card]) layout.observe(el);
  }

  // Malzeme örnekleri (Cu, Au, Pt…): tablo bu sayfadaysa o metali seçer, değilse Ürünler sayfasında açar.
  const sampleLinks = [...story.querySelectorAll('[data-open-metal]')];
  function syncSampleLinks() {
    for (const link of sampleLinks) {
      const symbol = link.dataset.openMetal;
      const lang = language();
      const name = window.SAY_METALS?.[symbol]?.[lang]?.ad || symbol;
      link.href = table ? '?lang=' + lang + '&metal=' + symbol + '#metaller' : 'urunler.html?lang=' + lang + '#' + symbol;
      link.title = lang === 'tr' ? name + ' · Periyodik tabloda gör' : name + ' · View on the periodic table';
      const sample = link.querySelector('[data-l="' + lang + '"]').textContent;
      link.setAttribute('aria-label', sample + ' · ' + link.title);
    }
  }
  syncSampleLinks();
  if (table) {
    for (const link of sampleLinks) {
      link.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const button = table.querySelector('[data-s="' + link.dataset.openMetal + '"]');
        if (!button) return;
        event.preventDefault();
        button.click();
        const target = table.offsetWidth ? button : lab.querySelector('#picker [aria-pressed="true"]');
        target.focus({ preventScroll: true });
        story.querySelector('#metaller').scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth' });
      });
    }
  }
  document.addEventListener('say:lang', () => { syncShotLinks(); syncSampleLinks(); });
})();
