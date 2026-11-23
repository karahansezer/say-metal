/* Ürünler sayfası: periyodik tablo (masaüstü) + sembol kutuları (mobil) + ortak metal kartı */
(function () {
  'use strict';
  var E = window.SAY_ELEMENTS, M = window.SAY_METALS;
  var pt = document.getElementById('pt'), picker = document.getElementById('picker'), card = document.getElementById('mcard');
  if (!E || !M || !card) return;

  var root = document.documentElement;
  var embedded = card.hasAttribute('data-embedded');
  var detailLink = card.querySelector('[data-metal-detail]');
  var byS = {}; E.forEach(function (e) { byS[e[1]] = e; });
  var GROUPS = {
    degerli: { tr: 'Değerli metal', en: 'Precious metal' },
    pgm: { tr: 'Platin grubu metal', en: 'Platinum group metal' },
    baz: { tr: 'Baz metal', en: 'Base metal' }
  };
  var sel = null, filter = 'all';
  function lang() { return root.getAttribute('data-lang') === 'en' ? 'en' : 'tr'; }
  function bi(tr, en) { return '<span data-l="tr">' + tr + '</span><span data-l="en">' + en + '</span>'; }

  /* ---- Periyodik tablo ---- */
  if (pt) {
    var h = '<span></span>';
    for (var g = 1; g <= 18; g++) h += '<span class="gn" style="grid-column:' + (g + 1) + ';grid-row:1">' + g + '</span>';
    for (var p = 1; p <= 7; p++) h += '<span class="pn" style="grid-column:1;grid-row:' + (p + 1) + '">' + p + '</span>';
    h += '<span class="gap-row" style="grid-row:9"></span>';
    h += '<span class="el series" style="grid-column:4;grid-row:7" aria-hidden="true">57–71</span><span class="el series" style="grid-column:4;grid-row:8" aria-hidden="true">89–103</span>';
    var i = 0;
    E.forEach(function (e) {
      var z = e[0], s = e[1], x = e[5], y = e[6], row = y <= 7 ? y + 1 : y + 1; // y=9→10, y=10→11
      var pos = 'grid-column:' + (x + 1) + ';grid-row:' + row;
      if (M[s]) {
        h += '<button type="button" class="el lit" data-s="' + s + '" data-g="' + M[s].grup + '" style="' + pos + ';--tone:' + M[s].ton + ';--delay:' + (-(i++ * 0.46)).toFixed(2) + 's" aria-label="' + e[2] + ' / ' + e[3] + ' (' + s + ', ' + z + ')"><span class="z">' + z + '</span>' + s + '</button>';
      } else {
        h += '<span class="el" aria-hidden="true" style="' + pos + '" data-tr="' + e[2] + '" data-en="' + e[3] + '" title="' + z + ' · ' + e[2] + '">' + s + '</span>';
      }
    });
    pt.insertAdjacentHTML('beforeend', h);
    pt.addEventListener('click', function (ev) { var b = ev.target.closest('.lit'); if (b) select(b.getAttribute('data-s'), true); });
    // Ok tuşlarıyla ışıklı kutular arasında gezinme
    pt.addEventListener('keydown', function (ev) {
      var k = ev.key; if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].indexOf(k) < 0) return;
      var b = ev.target.closest('.lit'); if (!b) return;
      var idx = M.order.indexOf(b.getAttribute('data-s'));
      idx = (idx + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1) + M.order.length) % M.order.length;
      var nb = pt.querySelector('.lit[data-s="' + M.order[idx] + '"]'); if (nb) { nb.focus(); select(M.order[idx], false); }
      ev.preventDefault();
    });
  }

  /* ---- Mobil kutular ---- */
  if (picker) {
    picker.innerHTML = M.order.map(function (s) {
      var m = M[s], e = byS[s];
      return '<button type="button" data-s="' + s + '" data-g="' + m.grup + '" style="--tone:' + m.ton + '" aria-label="' + m.tr.ad + ' / ' + m.en.ad + '"><span class="z">' + e[0] + '</span><span class="s">' + s + '</span><span class="nm">' + bi(m.tr.ad, m.en.ad) + '</span></button>';
    }).join('');
    picker.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      select(b.getAttribute('data-s'), true);
      if (window.matchMedia('(max-width: 1199px)').matches) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // The line work is decorative guilloché, drawn at the actual size of the plate.
  const seal = card.querySelector('.die-engraving');
  const source = pt.querySelector('.table-source');
  const section = card.closest('section');
  const sourceSamples = {
    Au:[0,0], Ag:[0,0], Pt:[0,3], Pd:[0,3], Rh:[0,3],
    Ru:[2,0], Ir:[3,2], Cu:[2,2], Zn:[2,4], Pb:[3,4]
  };
  function engrave() {
    if (!sel || !seal.clientWidth) return;
    const width = Math.ceil(seal.clientWidth * Math.min(window.devicePixelRatio || 1, 2));
    seal.width = seal.height = width;
    const pen = seal.getContext('2d');
    pen.scale(width / 300, width / 300);
    pen.translate(150, 150);
    pen.strokeStyle = M[sel].ton;
    const lobes = 9 + M.order.indexOf(sel) % 5;
    const turn = Math.PI * 2;
    pen.lineWidth = .65;
    pen.globalAlpha = .68;
    for (let band = 0; band < 26; band++) {
      pen.beginPath();
      for (let step = 0; step <= 540; step++) {
        const theta = step / 540 * turn;
        const radius = 104 + band * .37 + 21 * Math.cos(lobes * theta + band * turn / 26);
        const x = Math.cos(theta) * radius, y = Math.sin(theta) * radius;
        if (step === 0) pen.moveTo(x, y);
        else pen.lineTo(x, y);
      }
      pen.stroke();
    }
    pen.globalAlpha = .76;
    for (const r of [79, 82, 136, 140]) {
      pen.beginPath(); pen.arc(0, 0, r, 0, turn); pen.stroke();
    }
    pen.beginPath();
    for (let tick = 0; tick < 72; tick++) {
      const theta = tick * turn / 72;
      const end = tick % 6 === 0 ? 147 : 144;
      pen.moveTo(141 * Math.cos(theta), 141 * Math.sin(theta));
      pen.lineTo(end * Math.cos(theta), end * Math.sin(theta));
    }
    pen.stroke();
  }
  new ResizeObserver(engrave).observe(seal);
  const sheen = matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)');
  card.addEventListener('pointermove', function (event) {
    if (!sheen.matches) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--shine', (event.clientX - box.left) / box.width * 100 + '%');
  });
  card.addEventListener('pointerleave', function () { card.style.removeProperty('--shine'); });

  /* ---- Kart ---- */
  function render() {
    var s = sel, m = M[s], e = byS[s], L = lang(), d = m[L];
    section.style.setProperty('--metal-tone', m.ton);
    card.style.setProperty('--metal-tone', m.ton);
    card.dataset.metal = s;
    card.querySelector('[data-f="no"]').innerHTML = '<span>' + m.no + ' / 10 · ' + bi(GROUPS[m.grup].tr, GROUPS[m.grup].en) + '</span>';
    card.querySelector('[data-f="ad"]').innerHTML = bi(m.tr.ad, m.en.ad);
    card.querySelector('[data-f=symbol]').textContent = s;
    var img = card.querySelector('[data-f="img"]');
    img.src = m.kart; img.alt = (L === 'en' ? m.en.ad : m.tr.ad) + ' · SAY METAL';
    var description = card.querySelector('[data-f="metin"]');
    if (embedded) {
      // The full material profile opens from the compact homepage card.
      description.textContent = d.metin.match(/^[^.]+\./)?.[0] || d.metin;
      detailLink.href = 'urunler.html?lang=' + L + '#' + s;
    } else {
      description.innerHTML = bi(m.tr.metin, m.en.metin);
    }
    card.querySelector('[data-f="z"]').textContent = e[0];
    card.querySelector('[data-f="m"]').textContent = L === 'tr' ? String(e[4]).replace('.', ',') : e[4];
    card.querySelector('[data-f=coords]').textContent = e[5] + ' · ' + e[6];
    pt.querySelectorAll('.gn, .pn').forEach(function (axis) {
      axis.classList.toggle('on-axis', Number(axis.textContent) === (axis.classList.contains('gn') ? e[5] : e[6]));
    });
    pt.querySelectorAll('.el:not(.series)').forEach(function (cell) {
      const row = Number(cell.style.gridRow);
      const inGroup = row <= 8 && Number(cell.style.gridColumn) === e[5] + 1;
      cell.classList.toggle('track', row === e[6] + 1 || inGroup);
    });
    const [sourceIndex, sample] = sourceSamples[s];
    source.querySelector('[data-f=feed]').innerHTML = bi(m.tr.kaynak[sourceIndex], m.en.kaynak[sourceIndex]);
    source.style.setProperty('--sx', (sample % 3) * 50 + '%');
    source.style.setProperty('--sy', Math.floor(sample / 3) * 100 + '%');
    engrave();
    var sp = document.querySelector('.src-panel');
    if (sp) {
      sp.style.setProperty('--tone', m.ton);
      sp.querySelector('[data-f="sym"]').textContent = s;
      sp.querySelector('[data-f="ad2"]').innerHTML = bi(m.tr.ad, m.en.ad);
      sp.querySelector('[data-f="kaynak"]').innerHTML =
        m.tr.kaynak.map(function (k, i) { return '<li data-l="tr"><i>' + (i < 9 ? '0' : '') + (i + 1) + '</i>' + k + '</li>'; }).join('') +
        m.en.kaynak.map(function (k, i) { return '<li data-l="en"><i>' + (i < 9 ? '0' : '') + (i + 1) + '</i>' + k + '</li>'; }).join('');
      sp.classList.remove('is-swap'); void sp.offsetWidth; sp.classList.add('is-swap');
    }
  }
  function select(s, pushHash) {
    if (!byS[s] || !M[s]) return;
    sel = s;
    document.querySelectorAll('[data-s]').forEach(function (b) {
      var on = b.getAttribute('data-s') === s;
      b.classList.toggle('is-sel', on);
      if (b.classList.contains('lit') || b.parentNode === picker) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    render();
    card.classList.remove('is-swap'); void card.offsetWidth; card.classList.add('is-swap');
    // Seçili metalden karta uzanan ışık çizgisi (js/story.js) her iki modda da bu olayı dinler.
    card.dispatchEvent(new CustomEvent('say:metal', { detail: s }));
    if (!embedded && pushHash && history.replaceState) history.replaceState(null, '', '#' + s);
  }
  function step(d) { var i = M.order.indexOf(sel); select(M.order[(i + d + M.order.length) % M.order.length], true); }
  card.querySelector('[data-prev]').addEventListener('click', function () { step(-1); });
  card.querySelector('[data-next]').addEventListener('click', function () { step(1); });

  /* ---- Süzgeç ---- */
  document.querySelectorAll('.filters').forEach(function (bar) {
    bar.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      filter = b.getAttribute('data-filter');
      document.querySelectorAll('.filters button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-filter') === filter ? 'true' : 'false'); });
      document.querySelectorAll('.lit, .picker button').forEach(function (x) { x.classList.toggle('is-off', filter !== 'all' && x.getAttribute('data-g') !== filter); });
      if (filter !== 'all' && M[sel].grup !== filter) { var first = M.order.filter(function (s) { return M[s].grup === filter; })[0]; if (first) select(first, true); }
    });
  });

  document.addEventListener('say:lang', function (ev) {
    if (sel) render();
    document.querySelectorAll('.pt .el[data-tr]').forEach(function (x) { x.title = x.getAttribute('data-' + (ev.detail === 'en' ? 'en' : 'tr')); });
  });
  if (!embedded) window.addEventListener('hashchange', function () { var s = location.hash.slice(1); if (M[s]) select(s, false); });

  var start = embedded ? new URLSearchParams(location.search).get('metal') : location.hash.slice(1);
  select(byS[start] && M[start] ? start : 'Au', false);
})();
