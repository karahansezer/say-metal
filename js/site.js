/* SAY METAL demo v3 — ortak üst menü, alt bilgi, dil geçişi, küçük etkileşimler */
(function () {
  'use strict';
  var GRAM_URL = 'https://xn--sayaltn-wfb.yez.info/'; // sayaltın.yez.info

  var NAV = [
    { tr: 'Hakkımızda', en: 'About Us', href: 'tarihce.html', pages: ['tarihce.html', 'degerlerimiz.html', 'sertifikalar.html'], sub: [
      { tr: 'Tarihçe', en: 'Our History', href: 'tarihce.html' },
      { tr: 'Değerlerimiz', en: 'Our Values', href: 'degerlerimiz.html' },
      { tr: 'Sertifikalar & Kalite', en: 'Certification & Quality', href: 'sertifikalar.html' }
    ] },
    { tr: 'Hizmetlerimiz', en: 'Services', href: 'hizmetler.html', pages: ['hizmetler.html'], sub: [
      { tr: 'Elektronik Atık', en: 'Electronic Waste', href: 'hizmetler.html#elektronik-atik' },
      { tr: 'Maden Atıkları', en: 'Mining Waste', href: 'hizmetler.html#maden-atiklari' },
      { tr: 'Endüstriyel Atıklar', en: 'Industrial Waste', href: 'hizmetler.html#endustriyel-atiklar' },
      { tr: 'Katalizörler', en: 'Catalyst', href: 'hizmetler.html#katalizorler' },
      { tr: 'Tehlikeli ve Tehlikesiz Atıklar', en: 'Hazardous & Non-Hazardous Waste', href: 'hizmetler.html#tehlikeli-tehlikesiz' },
      { tr: 'PGM Geri Kazanımı', en: 'PGM Recovery', href: 'hizmetler.html#pgm' }
    ] },
    { tr: 'Ürünler', en: 'Products', href: 'urunler.html', pages: ['urunler.html'] },
    { tr: 'Sürdürülebilirlik', en: 'Sustainability', href: 'surdurulebilirlik.html', pages: ['surdurulebilirlik.html'] },
    { tr: 'Medya', en: 'Media', href: 'medya.html', pages: ['medya.html'], sub: [
      { tr: 'Basın', en: 'Press', href: 'medya.html#basin' },
      { tr: 'Kataloglar', en: 'Catalogs', href: 'medya.html#kataloglar' }
    ] },
    { tr: 'İletişim', en: 'Contact', href: 'iletisim.html', pages: ['iletisim.html'] }
  ];

  var doc = document, root = doc.documentElement;
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function bi(o) { return '<span data-l="tr">' + o.tr + '</span><span data-l="en">' + o.en + '</span>'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---- Üst menü ---- */
  var headerHost = doc.getElementById('site-header');
  if (headerHost) {
    var items = NAV.map(function (it) {
      var cur = it.pages.indexOf(here) > -1 ? ' aria-current="page"' : '';
      if (!it.sub) return '<div class="nav-item"><a class="nav-link" href="' + it.href + '"' + cur + '>' + bi(it) + '</a></div>';
      var sub = it.sub.map(function (s, i) { return '<a href="' + s.href + '"><i>' + pad(i + 1) + '</i>' + bi(s) + '</a>'; }).join('');
      return '<div class="nav-item has-sub"><a class="nav-link" href="' + it.href + '"' + cur + ' aria-haspopup="true" aria-expanded="false">' + bi(it) + '<span class="caret" aria-hidden="true"></span></a><div class="sub">' + sub + '</div></div>';
    }).join('');
    headerHost.className = 'site-header';
    headerHost.innerHTML =
      '<div class="wrap">' +
        '<a class="brand" href="index.html" aria-label="SAY METAL"><img src="assets/logo/say-yatay-koyu.png" alt="SAY" width="150" height="50"></a>' +
        '<nav class="nav" id="nav" aria-label="Ana menü / Main menu">' + items + '<div class="lang lang--menu" role="group" aria-label="Menü dil seçimi / Menu language"><button type="button" data-set-lang="tr">Türkçe</button><button type="button" data-set-lang="en">English</button></div></nav>' +
        '<div class="header-tools">' +
          '<div class="lang" role="group" aria-label="Dil / Language"><button type="button" data-set-lang="tr">TR</button><button type="button" data-set-lang="en">EN</button></div>' +
          '<a class="btn-gram" href="' + GRAM_URL + '" target="_blank" rel="noopener" title="SAY GRAM"><span class="bar" aria-hidden="true"></span>SAY GRAM <span class="ext" aria-hidden="true">↗</span></a>' +
          '<button class="menu-toggle" type="button" aria-controls="nav" aria-expanded="false" aria-label="Menü / Menu"><span></span><span></span></button>' +
        '</div>' +
      '</div>';

    var toggle = headerHost.querySelector('.menu-toggle');
    toggle.addEventListener('click', function () {
      var open = headerHost.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      doc.body.style.overflow = open ? 'hidden' : '';
    });
    var mq = window.matchMedia('(max-width: 1120px)');
    headerHost.querySelectorAll('.has-sub > .nav-link').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (!mq.matches) return;
        var item = a.parentNode;
        if (!item.classList.contains('is-expanded')) { e.preventDefault(); item.classList.add('is-expanded'); a.setAttribute('aria-expanded', 'true'); }
      });
    });
    headerHost.querySelectorAll('.sub a, .nav-item:not(.has-sub) .nav-link').forEach(function (a) {
      a.addEventListener('click', function () { headerHost.classList.remove('is-open'); doc.body.style.overflow = ''; toggle.setAttribute('aria-expanded', 'false'); });
    });
    var solidAlways = headerHost.hasAttribute('data-solid');
    var onScroll = function () { headerHost.classList.toggle('is-solid', solidAlways || window.scrollY > 24); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Alt bilgi ---- */
  var footerHost = doc.getElementById('site-footer');
  if (footerHost) {
    var col = function (it) { return '<li><a href="' + it.href + '">' + bi(it) + '</a></li>'; };
    var signature = footerHost.querySelector('.say-finale');
    footerHost.className = 'site-footer';
    // Ana sayfada (SAY kapanışının olduğu sayfa) logo, adres ve menü sütunları yok: film, dünya bölümü ve kapanış.
    footerHost.innerHTML =
      '<div class="wrap">' +
        (signature ? '' : '<div class="footer-grid">' +
          '<div><a class="brand" href="index.html" aria-label="SAY METAL"><img src="assets/logo/say-yatay-koyu.png" alt="SAY" width="150" height="50" style="height:40px;width:auto"></a>' +
            '<address>SAY METAL A.Ş.<br>Orhangazi Mah. 15. Yol Sk. Isıso San. Sit. No:5<br>34538 Esenyurt / İstanbul</address></div>' +
          '<div><h2>' + bi({ tr: 'Kurumsal', en: 'Company' }) + '</h2><ul>' + NAV[0].sub.map(col).join('') + col(NAV[3]) + col(NAV[4]) + '</ul></div>' +
          '<div><h2>' + bi({ tr: 'Hizmetler', en: 'Services' }) + '</h2><ul>' + NAV[1].sub.map(col).join('') + '</ul></div>' +
          '<div><h2>' + bi({ tr: 'İletişim', en: 'Contact' }) + '</h2><ul>' +
            '<li><a href="tel:+902126230030">+90 (212) 623 00 30</a></li>' +
            '<li><a href="mailto:info@saymetal.com.tr">info@saymetal.com.tr</a></li>' +
            '<li><a href="https://www.linkedin.com/company/say-metal-as" target="_blank" rel="noopener">LinkedIn ↗</a></li>' +
            col(NAV[2]) + col(NAV[5]) +
            '<li style="margin-top:18px"><a class="btn-gram" href="' + GRAM_URL + '" target="_blank" rel="noopener"><span class="bar" aria-hidden="true"></span>SAY GRAM <span class="ext" aria-hidden="true">↗</span></a></li>' +
          '</ul></div>' +
        '</div>') +
        '<p class="footer-word">' + bi({ tr: 'Çevrede değer, değerli metalde <b><img src="assets/logo/say-yatay-koyu.png" alt="SAY" width="150" height="50"></b>', en: 'Value for the environment, <b><img src="assets/logo/say-yatay-koyu.png" alt="SAY" width="150" height="50"></b> for precious metals' }) + '</p>' +
        '<div class="footer-bottom"><span>© 2026 SAY METAL A.Ş.</span></div>' +
      '</div>';
    if (signature) footerHost.querySelector('.footer-word').replaceWith(signature);
  }

  /* ---- Dil ---- */
  function setLang(l, save) {
    root.setAttribute('data-lang', l); root.lang = l;
    doc.querySelectorAll('[data-set-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === l ? 'true' : 'false'); });
    var t = doc.querySelector('meta[name="title-' + l + '"]'); if (t) doc.title = t.content;
    doc.querySelectorAll('[data-ph-' + l + ']').forEach(function (el) { el.placeholder = el.getAttribute('data-ph-' + l); });
    if (save) { try { localStorage.setItem('say-lang', l); } catch (e) {} }
    doc.dispatchEvent(new CustomEvent('say:lang', { detail: l }));
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-set-lang]');
    if (b) setLang(b.getAttribute('data-set-lang'), true);
  });
  setLang(root.getAttribute('data-lang') || 'tr', false);

  /* ---- İnceleme notları (taslak / bekleniyor etiketleri) ---- */
  function setReview(on, save) {
    root.classList.toggle('review', on);
    var b = doc.getElementById('review-toggle'); if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (save) { try { localStorage.setItem('say-review', on ? '1' : '0'); } catch (e) {} }
  }
  // Yayındaki sitede notlar kapalı ve açma düğmesi yok; ekip adrese ?notlar=1 ekleyerek görebilir.
  setReview(new URLSearchParams(location.search).get('notlar') === '1', false);

  /* ---- İletişim formu: ?konu=atik gibi bir bağlantıyla gelindiyse konuyu seç ---- */
  var konu = new URLSearchParams(location.search).get('konu'), konuSel = doc.getElementById('f-konu');
  if (konu && konuSel) { [].forEach.call(konuSel.options, function (o) { if (o.value === konu) konuSel.value = konu; }); }

  /* ---- Devamını oku ---- */
  doc.querySelectorAll('.more').forEach(function (m) {
    var btn = m.querySelector('.more-toggle'); if (!btn) return;
    btn.addEventListener('click', function () {
      var open = m.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      var a = btn.querySelector('[data-open]'), c = btn.querySelector('[data-close]');
      if (a && c) { a.hidden = open; c.hidden = !open; }
    });
  });

  /* ---- Alt menüde etkin bölüm ---- */
  var subnav = doc.querySelector('.subnav');
  if (subnav && 'IntersectionObserver' in window) {
    var links = {}; subnav.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].classList.toggle('is-active', k === en.target.id); });
        var act = links[en.target.id]; if (act && subnav.querySelector('.wrap').scrollTo) { var w = subnav.querySelector('.wrap'); w.scrollTo({ left: act.offsetLeft - 24, behavior: 'smooth' }); }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    Object.keys(links).forEach(function (k) { var s = doc.getElementById(k); if (s) io2.observe(s); });
    var firstSec = doc.getElementById(Object.keys(links)[0]);
    window.addEventListener('scroll', function () { if (firstSec && window.scrollY + window.innerHeight * .35 < firstSec.offsetTop) Object.keys(links).forEach(function (k) { links[k].classList.remove('is-active'); }); }, { passive: true });
  }

  /* ---- Görünme animasyonu ---- */
  var rev = doc.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && rev.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .05 });
    rev.forEach(function (el) { io.observe(el); });
  } else { rev.forEach(function (el) { el.classList.add('is-in'); }); }
})();
