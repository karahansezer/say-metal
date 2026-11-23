/* Ana sayfa: intro videosu bölüm şeridi + dünya scroll yuvası */
(function () {
  'use strict';

  /* ---------- Intro videosu ---------- */
  var hero = document.querySelector('.hero');
  if (hero) {
    var v = hero.querySelector('video');
    var chapters = [].slice.call(hero.querySelectorAll('.chapter'));
    var LOGO_AT = 27.6; // kapanış: amblem ve SAY yazısı; başlık bu bölümde çekilir
    var tick = function () {
      var t = v.currentTime || 0;
      chapters.forEach(function (c, i) {
        var a = parseFloat(c.getAttribute('data-t'));
        var b = i + 1 < chapters.length ? parseFloat(chapters[i + 1].getAttribute('data-t')) : (v.duration || 38.4);
        var p = t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a);
        c.style.setProperty('--p', p.toFixed(3));
        c.classList.toggle('is-on', t >= a && t < b);
      });
      hero.classList.toggle('is-logo', t >= LOGO_AT);
      if (!v.paused) requestAnimationFrame(tick);
    };
    v.addEventListener('play', function () { hero.classList.remove('is-paused'); requestAnimationFrame(tick); });
    v.addEventListener('pause', function () { hero.classList.add('is-paused'); });
    v.addEventListener('seeked', tick);
    chapters.forEach(function (c) {
      c.addEventListener('click', function () { v.currentTime = parseFloat(c.getAttribute('data-t')) + 0.05; if (v.paused) v.play().catch(function () {}); });
    });
    var ctrl = hero.querySelector('[data-toggle-video]');
    if (ctrl) ctrl.addEventListener('click', function () { if (v.paused) v.play().catch(function () {}); else v.pause(); });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { v.removeAttribute('autoplay'); v.pause(); hero.classList.add('is-paused'); }
    else { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { hero.classList.add('is-paused'); }); }
    // Görünmüyorken oynatma (pil ve işlemci)
    if ('IntersectionObserver' in window) {
      var userPaused = false;
      if (ctrl) ctrl.addEventListener('click', function () { userPaused = v.paused; });
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { if (!userPaused && v.paused) v.play().catch(function () {}); } else if (!v.paused) { v.pause(); } });
      }, { threshold: .15 }).observe(hero);
    }
    tick();
  }

  /* Scroll-driven phone sequence. The browser decodes the film directly into its video layer. */
  const world = document.querySelector('.world');
  if (!world) return;
  const config = window.SAY_SCROLL || { type:'none' };
  const lines = Array.from(world.querySelectorAll('.world-line'));
  const video = world.querySelector('.world-media video');
  const stills = world.querySelector('.world-stills');
  const count = world.querySelector('.world-count');
  const counter = count.querySelector('[data-line-no]');
  const arc = world.querySelector('.arc');
  const meter = world.querySelector('[data-pct]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const frameRate = config.fps || 24;
  const frames = config.frames;
  const clamp = value => Math.max(0, Math.min(1, value));
  const twoDigits = number => String(number).padStart(2, '0');
  count.querySelector('[data-line-total]').textContent = twoDigits(lines.length);
  const arcLength = arc.getTotalLength();
  arc.style.strokeDasharray = arcLength;

  let near = false, visible = false, mode = 'none', chapter = -1, lastPercent = -1;
  let source = '', videoFailed = false, preferSmall = false;
  let frameId = 0, previousTick = 0, target = 0, position = null, readScroll = true;
  let wantedStill = -1, shownStill = -1, pendingStill = false;
  let seekStart = 0, slowSeeks = 0;

  function progress() {
    const box = world.getBoundingClientRect();
    return clamp(-box.top / Math.max(1, box.height - innerHeight));
  }
  function updateCaption(p) {
    const next = Math.min(lines.length - 1, Math.floor(p * lines.length));
    if (chapter !== next) {
      lines.forEach((line, index) => {
        line.classList.toggle('is-on', index === next);
        line.classList.toggle('is-past', index < next);
        line.setAttribute('aria-hidden', String(index !== next));
      });
      chapter = next;
      counter.textContent = twoDigits(next + 1);
    }
    const percent = Math.round(p * 100);
    if (percent === lastPercent) return;
    lastPercent = percent;
    count.style.setProperty('--p', percent / 100);
    if (mode === 'none') {
      arc.style.strokeDashoffset = arcLength * (1 - p);
      meter.textContent = percent;
    }
  }

  // Only one still decodes at a time. A fling replaces its destination, never queues intervening frames.
  async function loadStill() {
    if (!frames || !near || document.hidden || pendingStill || shownStill === wantedStill || wantedStill < 0) return;
    const index = wantedStill;
    const image = new Image();
    image.alt = ''; image.decoding = 'async';
    image.src = frames.path.replace(/\{0+\}/, mask => String(index + 1).padStart(mask.length - 2, '0'));
    pendingStill = true;
    try {
      await image.decode();
      if (near && !document.hidden && (index === wantedStill || shownStill < 0)) {
        stills.replaceChildren(image);
        shownStill = index;
      }
    } catch { /* Keep the last good still if an individual frame is unavailable. */ }
    finally {
      pendingStill = false;
      if (index !== wantedStill) loadStill();
    }
  }
  function showStill(p) {
    if (!frames) return;
    wantedStill = Math.round(clamp(p) * (frames.count - 1));
    loadStill();
  }
  function compactSource() {
    const connection = navigator.connection;
    return preferSmall || (navigator.hardwareConcurrency || 8) <= 4 ||
      (navigator.deviceMemory || 8) <= 4 || innerWidth < 850 ||
      connection?.saveData || /(^|-)2g$|^3g$/.test(connection?.effectiveType || '');
  }
  function prepare() {
    if (!near || document.hidden) return;
    const useVideo = config.type === 'video' && config.video && !videoFailed &&
      (!reduced.matches || !frames) && video.canPlayType('video/mp4');
    mode = useVideo ? 'video' : frames && config.type !== 'none' ? 'frames' : 'none';
    world.dataset.mode = mode;
    target = progress();
    updateCaption(target);
    if (useVideo) {
      const next = compactSource() && config.compact ? config.compact : config.video;
      if (next !== source) {
        world.classList.remove('has-scrub-frame');
        showStill(chapter / Math.max(1, lines.length - 1));
        source = next; position = target; slowSeeks = 0; seekStart = 0;
        video.preload = 'auto'; video.src = source;
      }
    } else {
      world.classList.remove('has-scrub-frame');
      if (source) { source = ''; video.removeAttribute('src'); video.load(); }
      position = target;
      if (mode === 'frames') showStill(reduced.matches || config.type === 'video' ? chapter / Math.max(1, lines.length - 1) : target);
    }
    requestTick();
  }
  function requestTick() {
    if (!frameId && visible && !document.hidden) frameId = requestAnimationFrame(render);
  }
  function onScroll() { readScroll = true; requestTick(); }
  function render(now) {
    frameId = 0;
    if (!visible || document.hidden) return;
    if (readScroll) { target = progress(); readScroll = false; updateCaption(target); }
    if (mode === 'frames') {
      showStill(reduced.matches || config.type === 'video' ? chapter / Math.max(1, lines.length - 1) : target);
      return;
    }
    if (mode !== 'video' || !Number.isFinite(video.duration) || video.readyState < 2 || video.seeking) return;
    const elapsed = previousTick ? Math.min(now - previousTick, 100) : 16;
    previousTick = now;
    const delta = target - position;
    if (Math.abs(delta) > .25 || Math.abs(delta) < .002 || reduced.matches) position = target;
    else position += delta * (1 - Math.exp(-elapsed / 55));
    const finalFrame = Math.max(0, Math.round(video.duration * frameRate) - 1);
    const wanted = Math.round(position * finalFrame) / frameRate;
    if (Math.abs(video.currentTime - wanted) > .45 / frameRate) {
      seekStart = performance.now();
      video.currentTime = wanted;
      // The seeked event consumes the latest scroll position. Never interrupt an in-flight seek.
      return;
    }
    world.classList.add('has-scrub-frame');
    if (position !== target) requestTick();
    else previousTick = 0;
  }
  video.addEventListener('loadeddata', requestTick);
  video.addEventListener('canplay', requestTick);
  video.addEventListener('seeked', () => {
    if (mode !== 'video' || !source || !near || document.hidden) return;
    if (visible && seekStart) {
      const ms = performance.now() - seekStart;
      slowSeeks = ms > 95 ? slowSeeks + 1 : Math.max(0,slowSeeks - 1);
      if (slowSeeks >= 4 && config.compact && source !== config.compact) {
        preferSmall = true; prepare(); return;
      }
    }
    seekStart = 0;
    world.classList.add('has-scrub-frame');
    requestTick();
  });
  video.addEventListener('error', () => {
    if (!source) return;
    if (source !== config.compact && config.compact) preferSmall = true;
    else videoFailed = true;
    prepare();
  });

  function stop() {
    cancelAnimationFrame(frameId);
    frameId = 0; previousTick = 0; position = null; seekStart = 0;
  }
  new IntersectionObserver(([entry]) => {
    near = entry.isIntersecting;
    if (near) prepare();
  }, { rootMargin:'650px 0px' }).observe(world);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      near = true; readScroll = true; position = progress();
      window.addEventListener('scroll', onScroll, { passive:true });
      prepare();
    } else {
      window.removeEventListener('scroll', onScroll); stop();
    }
  }).observe(world);
  window.addEventListener('resize', onScroll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (near) { readScroll = true; position = progress(); prepare(); }
  });
  reduced.addEventListener('change', prepare);
  updateCaption(0);
})();
