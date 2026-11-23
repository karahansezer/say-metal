/* Each chapter gets the same scroll distance. The panorama follows the last
   video frame and has its own playback time. */
(() => {
  'use strict';
  const film = document.querySelector('.film');
  if (!film) return;

  const stage = film.querySelector('.film-stage');
  const video = film.querySelector('.film-footage');
  const ambient = film.querySelector('.film-ambient');
  const scenes = Array.from(film.querySelectorAll('.film-scene'));
  const chapters = Array.from(film.querySelectorAll('.film-ch'));
  const captions = Array.from(film.querySelectorAll('[data-cue]'));
  const playButton = film.querySelector('.film-play');
  const clock = film.querySelector('[data-time]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const starts = scenes.map(scene => Number(scene.dataset.start));
  const frame = 1 / 24;
  const clamp = n => Math.max(0, Math.min(1, n));
  // Tesis sahnesi videonun parçası değildir: fotoğraf panoraması, videonun bir anına (sahnenin data-start'ı)
  // eklenir ve facilityDuration sürer; video o sırada bekler. Sahnelerin ve bölümlerin zamanları panoramayı
  // içeren film zamanıdır; mediaAt / timelineAt film zamanı ile video zamanı arasında çevirir.
  // Masaüstünde tesis SAY GRAM ile logo arasındadır, logo en sondadır. Telefonda tesis yoktur (js/film-mobil.js).
  const facilityIndex = scenes.findIndex(scene => scene.dataset.scene === 'tesis');
  const hasFacility = facilityIndex >= 0;
  const facilityLast = hasFacility && facilityIndex === scenes.length - 1;
  const facilityDuration = hasFacility ? 7.5 : 0;
  const checkpoints = chapters.flatMap(chapter => {
    const times = [chapter.dataset.timecode, ...(chapter.dataset.checkpoints || '').split(' ')];
    return times.map(Number).filter(time => time > 0);
  });
  let mediaDuration = Number(film.dataset.mediaDuration) || 37.791667;
  let facilityAt = !hasFacility ? Infinity : facilityLast ? mediaDuration : starts[facilityIndex];
  let duration = mediaDuration + facilityDuration;
  let panoramaStart = null;
  let facilityDone = false;
  function inPanorama(time) {
    return hasFacility && time >= facilityAt && (facilityLast || time < facilityAt + facilityDuration);
  }
  // Film zamanı → video zamanı. Panorama boyunca video, önce önceki sahnenin son karesinde, sonra bir sonraki
  // sahnenin ilk karesinde bekler; fotoğraflar açılıp kapanırken arkada doğru kare görünür.
  function mediaAt(time) {
    if (!hasFacility || time < facilityAt) return time;
    if (time < facilityAt + facilityDuration) return time < facilityAt + facilityDuration / 2 ? facilityAt - frame : facilityAt;
    return time - facilityDuration;
  }
  // Video zamanı → film zamanı (panoramadan sonraki kısım panorama kadar ileri kayar).
  function timelineAt(media) {
    return hasFacility && !facilityLast && media >= facilityAt ? media + facilityDuration : media;
  }
  let hold = null;
  let lastWheelAt = -Infinity;
  let lastWheelDirection = 0;
  let lastWheelY = 0;
  let pendingNativeWheel = null;
  let fastUntil = 0;
  let top = 0;
  let distance = 1;
  let goal = 0;
  let position = 0;
  let current = -1;
  let cue = -1;
  let seconds = -1;
  let playing = false;
  let previewAllowed = true;
  let visible = true;
  let frameRequest = 0;
  let lastTick = 0;
  let lastAutoY = null;
  let activeAction = '';
  let failed = false;

  function shotAt(time) {
    let index = starts.length - 1;
    while (index > 0 && time < starts[index]) index--;
    return index;
  }

  function shotEnd(index) { return starts[index + 1] ?? duration; }

  function timeAt(progress) {
    const part = clamp(progress) * scenes.length;
    const index = Math.min(scenes.length - 1, Math.floor(part));
    return starts[index] + (part - index) * (shotEnd(index) - starts[index]);
  }

  function progressAt(time) {
    const index = shotAt(time);
    return (index + clamp((time - starts[index]) / (shotEnd(index) - starts[index]))) / scenes.length;
  }

  function render(time) {
    const index = shotAt(time);
    if (index !== current) {
      scenes.forEach((scene, i) => {
        const active = i === index;
        scene.inert = !active;
        scene.setAttribute('aria-hidden', String(!active));
        scene.classList.toggle('is-leaving', i === current);
        scene.classList.toggle('is-current', active);
        scene.classList.toggle('is-entering', active && current >= 0);
        if (active) chapters[i].setAttribute('aria-current', 'step');
        else chapters[i].removeAttribute('aria-current');
        chapters[i].style.setProperty('--progress', i < index ? 1 : 0);
      });
      current = index;
      // The same stills also keep every chapter readable if video is unsupported.
      if (failed) stage.querySelector('.film-picture').style.backgroundImage =
        'url("' + chapters[index].querySelector('img').getAttribute('src') + '")';
    }
    let nextCue = captions.length - 1;
    while (nextCue > 0 && time < Number(captions[nextCue].dataset.cue)) nextCue--;
    if (nextCue !== cue) {
      if (cue >= 0) captions[cue].hidden = true;
      captions[nextCue].hidden = false;
      cue = nextCue;
    }
    const fraction = clamp((time - starts[index]) / (shotEnd(index) - starts[index]));
    chapters[index].style.setProperty('--progress', fraction.toFixed(3));
    film.dispatchEvent(new CustomEvent('film:frame', { detail: { act: scenes[index].dataset.scene, fraction } }));
    // Count the pause from the visible frame, including time spent seeking.
    if (hold && !hold.arrived && Math.abs(time - hold.time) < .09) {
      hold.arrived = true;
      hold.until = performance.now() + (scenes[index].dataset.scene === 'say-metal' ? 1050 : 620);
    }
    const atEnd = time >= duration - frame;
    const sec = atEnd ? Math.round(duration) : Math.floor(time);
    if (sec !== seconds) {
      seconds = sec;
      clock.textContent = '00:' + String(sec).padStart(2, '0');
    }
    const action = playing ? 'pause' : atEnd ? 'replay' : 'play';
    if (action !== activeAction) {
      activeAction = action;
      stage.classList.toggle('is-playing', playing);
      playButton.querySelectorAll('[data-action]').forEach(el => { el.hidden = el.dataset.action !== action; });
    }
  }

  function updatePreview() {
    const show = previewAllowed && visible && !document.hidden && !motion.matches && !playing && goal === 0;
    stage.classList.toggle('is-ambient', show);
    if (!show) { ambient.pause(); return; }
    if (!ambient.hasAttribute('src')) ambient.src = ambient.dataset.src;
    if (!ambient.ended && ambient.paused) ambient.play().catch(() => { stage.classList.remove('is-ambient'); });
  }

  function schedule() {
    if (!frameRequest && visible && !document.hidden) frameRequest = requestAnimationFrame(update);
  }

  function seekVideo(time) {
    if (failed || video.readyState < 1 || video.seeking) return;
    const wanted = Math.min(mediaDuration - frame / 2, Math.round(mediaAt(time) / frame) * frame);
    if (Math.abs(video.currentTime - wanted) > frame / 2) video.currentTime = wanted;
  }

  function renderScrubFrame() {
    const time = timeAt(position);
    if (failed || video.readyState < 2 || inPanorama(time)) { render(time); return; }
    // Metin ekrandaki kareyi izler. Video panoramanın öbür yakasında kalmışsa (henüz atlamadıysa) hedef zaman kullanılır.
    const media = video.currentTime;
    const crossing = hasFacility && !facilityLast && (time < facilityAt) !== (media < facilityAt);
    render(crossing ? time : timelineAt(media));
  }

  function scrollToPosition(progress) {
    lastAutoY = Math.round(top + clamp(progress) * distance);
    window.scrollTo({ top: lastAutoY, behavior: 'instant' });
  }

  function update(now) {
    frameRequest = 0;
    if (!visible || document.hidden) return;
    if (playing) {
      let time;
      if (panoramaStart !== null) {
        // Panorama kendi saatiyle akar; bitince video kaldığı yerden sürer (tesis son sahneyse film biter).
        time = facilityAt + (now - panoramaStart) / 1000;
        if (time >= facilityAt + facilityDuration) {
          panoramaStart = null;
          facilityDone = true;
          if (facilityLast) time = duration;
          else {
            time = facilityAt + facilityDuration;
            video.currentTime = facilityAt;
            video.play().catch(() => { if (video.paused) stopPlayback(); });
          }
        }
      } else if (hasFacility && !facilityDone && video.currentTime >= facilityAt - frame / 2) {
        video.pause();
        panoramaStart = now;
        time = facilityAt;
      } else {
        time = video.ended && (facilityDone || !hasFacility) ? duration : timelineAt(video.currentTime);
      }
      position = goal = progressAt(time);
      scrollToPosition(position);
      if (time >= duration) stopPlayback();
      else render(time);
      if (playing) schedule();
      return;
    }
    const elapsed = lastTick ? Math.min(now - lastTick, 64) : 16;
    lastTick = now;
    const delta = goal - position;
    position = motion.matches || Math.abs(delta) < .00015
      ? goal : position + delta * (1 - Math.exp(-elapsed / 82));
    const time = timeAt(position);
    seekVideo(time);
    if (failed || video.readyState < 2 || inPanorama(time)) render(time);
    if (goal !== position) schedule();
    else lastTick = 0;
  }

  function stopPlayback() {
    if (!playing) return;
    playing = false;
    video.pause();
    panoramaStart = null;
    lastAutoY = null;
    render(timeAt(position));
  }

  function readScroll() {
    const y = window.scrollY;
    if (pendingNativeWheel !== null) {
      const from = pendingNativeWheel;
      pendingNativeWheel = null;
      if (y !== from && stopAtCheckpoint(from, y, performance.now() < fastUntil)) return;
    }
    if (hold && Math.abs(y - (top + progressAt(hold.time) * distance)) > 2) hold = null;
    const pinned = y >= top - 1 && y <= top + distance + 1;
    document.documentElement.classList.toggle('film-on', pinned);
    if (playing && lastAutoY !== null && Math.abs(y - lastAutoY) <= 2) return;
    if (playing) stopPlayback();
    goal = clamp((y - top) / distance);
    updatePreview();
    schedule();
  }

  function measure() {
    hold = null;
    const bounds = film.getBoundingClientRect();
    top = bounds.top + window.scrollY;
    distance = Math.max(1, film.offsetHeight - stage.offsetHeight);
    readScroll();
  }

  function clearGesture() {
    hold = null;
    pendingNativeWheel = null;
    lastWheelAt = -Infinity;
    fastUntil = 0;
  }

  function jumpTo(progress) {
    clearGesture();
    stopPlayback();
    previewAllowed = false;
    position = goal = clamp(progress);
    scrollToPosition(position);
    updatePreview();
    seekVideo(timeAt(position));
    renderScrubFrame();
    schedule();
  }

  chapters.forEach(chapter => {
    chapter.addEventListener('click', () => {
      jumpTo(progressAt(Number(chapter.dataset.timecode)));
    });
  });
  playButton.addEventListener('click', () => {
    clearGesture();
    if (playing) { stopPlayback(); return; }
    if (timeAt(position) >= duration - frame) jumpTo(0);
    const time = timeAt(position);
    previewAllowed = false;
    playing = true;
    lastAutoY = window.scrollY;
    updatePreview();
    render(time);
    facilityDone = hasFacility && !facilityLast && time >= facilityAt + facilityDuration;
    if (inPanorama(time)) {
      panoramaStart = performance.now() - (time - facilityAt) * 1000;
      schedule();
    } else {
      const media = mediaAt(time);
      if (Math.abs(video.currentTime - media) > frame) video.currentTime = media;
      video.play().then(schedule).catch(() => { if (video.paused) stopPlayback(); });
    }
  });
  // Video bitince ya da panoramaya gelince update() karar verir.
  video.addEventListener('ended', () => { if (playing) schedule(); });
  function syncDuration() {
    mediaDuration = video.duration;
    if (facilityLast) { starts[starts.length - 1] = mediaDuration; facilityAt = mediaDuration; }
    duration = mediaDuration + facilityDuration;
    film.querySelector('[data-duration]').textContent = '00:' + Math.round(duration);
    schedule();
  }
  video.addEventListener('loadedmetadata', syncDuration);
  video.addEventListener('loadeddata', () => { if (!playing) renderScrubFrame(); schedule(); });
  video.addEventListener('seeked', () => {
    // A newer wheel event may have arrived while the decoder was busy.
    if (!playing) { renderScrubFrame(); schedule(); }
  });
  function onVideoError() {
    failed = true;
    stopPlayback();
    video.hidden = true;
    playButton.disabled = true;
    current = -1;
    render(timeAt(position));
  }
  video.addEventListener('error', onVideoError);
  if (video.error) onVideoError();

  // A fast gesture can travel up to the next marked frame. Ignore its residual
  // momentum briefly there. A reversal, a chapter link or an exit acts immediately.
  function stopAtCheckpoint(from, target, fast) {
    if (from < top - 1 || from > top + distance + 1) return false;
    const direction = Math.sign(target - from);
    const now = performance.now();
    if (hold) {
      if (hold.direction === direction && now < hold.until) {
        const pinned = progressAt(hold.time);
        if (Math.abs(window.scrollY - (top + pinned * distance)) > 1) scrollToPosition(pinned);
        return true;
      }
      hold = null;
    }
    if (!fast) return false;
    const order = direction > 0 ? checkpoints : checkpoints.slice().reverse();
    const next = order.find(time => {
      const mark = top + progressAt(time) * distance;
      return (mark - from) * direction > 1 && (target - mark) * direction >= 0;
    });
    if (next === undefined) return false;
    // Bound the wait even if the decoder stalls. render() starts the normal
    // dwell once it actually presents the marked shot.
    hold = { time: next, direction, arrived: false, until: now + 1600 };
    goal = progressAt(next);
    scrollToPosition(goal);
    updatePreview();
    schedule();
    return true;
  }

  film.addEventListener('film:inspect', () => { clearGesture(); stopPlayback(); });
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('wheel', event => {
    if (event.defaultPrevented || event.ctrlKey || event.shiftKey ||
        !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        document.body.style.overflow === 'hidden') return;
    stopPlayback();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.offsetHeight : 1;
    const delta = event.deltaY * unit;
    const now = performance.now();
    const gap = now - lastWheelAt;
    const direction = Math.sign(delta);
    if (direction !== lastWheelDirection) fastUntil = 0;
    const burst = direction === lastWheelDirection && gap < 120 && Math.abs(delta) / Math.max(8, gap) > .5;
    // Include the first small delta once the next sample identifies a fast
    // trackpad gesture. Its first event may already have crossed the frame.
    const from = burst && now >= fastUntil ? lastWheelY : window.scrollY;
    lastWheelY = window.scrollY;
    if (burst || Math.abs(delta) >= stage.offsetHeight * .12) fastUntil = now + 140;
    lastWheelAt = now;
    lastWheelDirection = direction;
    if (!event.cancelable) {
      if (hold || now < fastUntil) pendingNativeWheel ??= from;
      return;
    }
    if (stopAtCheckpoint(from, window.scrollY + delta, now < fastUntil)) event.preventDefault();
  }, { passive: false });
  window.addEventListener('touchstart', () => { clearGesture(); stopPlayback(); }, { passive: true });
  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey ||
        document.body.style.overflow === 'hidden' ||
        event.target.closest('input,select,textarea,[contenteditable="true"]')) return;
    const space = event.code === 'Space' && !event.target.closest('button,a,summary');
    if (space || event.key === 'PageDown' || event.key === 'PageUp') {
      stopPlayback();
      const up = event.key === 'PageUp' || (space && event.shiftKey);
      const y = window.scrollY;
      if (y < top - 1 || y > top + distance + 1) return;
      const target = y + stage.offsetHeight * .88 * (up ? -1 : 1);
      if (stopAtCheckpoint(y, target, true)) event.preventDefault();
      else if (target >= top && target <= top + distance) {
        event.preventDefault();
        scrollToPosition((target - top) / distance);
      }
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      clearGesture();
      stopPlayback();
    }
  });
  film.querySelector('.film-skip').addEventListener('click', event => {
    event.preventDefault();
    clearGesture();
    stopPlayback();
    // Ana sayfada filmden sonra dünya bölümü gelir (tanıtım Tarihçe sayfasına taşındı).
    const next = document.getElementById('dunya') || document.getElementById('tanitim');
    next.scrollIntoView({ behavior: 'instant' });
    next.focus({ preventScroll: true });
  });
  window.addEventListener('resize', measure);
  window.addEventListener('pageshow', measure);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPlayback();
    updatePreview();
    schedule();
  });
  motion.addEventListener('change', () => { updatePreview(); schedule(); });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) stopPlayback();
    updatePreview();
    schedule();
  }).observe(film);

  film.classList.add('is-ready');
  if (video.readyState >= 1) syncDuration();
  for (const time of checkpoints) {
    const index = shotAt(time);
    const tick = document.createElement('i');
    tick.className = 'film-stop';
    tick.setAttribute('aria-hidden', 'true');
    tick.style.setProperty('--at', 100 * (time - starts[index]) / (shotEnd(index) - starts[index]) + '%');
    chapters[index].append(tick);
  }
  measure();
  position = goal;
  render(timeAt(position));
  // Retain the existing preview hook and keep its position in sync with native scrolling.
  film.seek = jumpTo;
  const requested = new URLSearchParams(location.search).get('sahne');
  const entry = scenes.findIndex(scene => scene.dataset.scene === requested);
  if (entry >= 0) jumpTo(progressAt(Number(chapters[entry].dataset.timecode)));
})();
