/* Typesetting follows the actual cut. The film and its browser-native
   scroll/playback controls share the clock provided by film.js. */
(() => {
  'use strict';
  const film = document.querySelector('.film');
  if (!film) return;
  const stage = film.querySelector('.film-stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const video = film.querySelector('.film-footage');
  const ambient = film.querySelector('.film-ambient');
  const notes = [...film.querySelectorAll('.verse-detail')];
  const metals = window.SAY_METALS;
  const elements = new Map(window.SAY_ELEMENTS.map(element => [element[1], element]));
  const notation = film.querySelector('.metal-notation');
  const specimen = film.querySelector('.metal-specimen');
  const metalSymbol = specimen.querySelector('[data-metal-symbol]');
  const metalNumber = specimen.querySelector('[data-metal-number]');
  const metalMass = specimen.querySelector('[data-metal-mass]');
  const metalName = specimen.querySelector('[data-metal-name]');
  const metalSource = film.querySelector('[data-metal-source]');
  const metalLink = film.querySelector('[data-metal-link]');
  const viewButtons = [...film.querySelectorAll('[data-options="facility"] button')];
  const viewPhotos = [...film.querySelectorAll('[data-facility-photo]')];
  const facilityLast = [...film.querySelectorAll('.film-scene')].at(-1)?.dataset.scene === 'tesis';
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'tr';
  const clamp = value => Math.max(0, Math.min(1, value));
  let act = 'kaynak';
  let fraction = 0;
  let pickedMetal = null;
  let pickedView = null;
  let displayedMetal = '';
  let displayedView = -1;

  // Sample the light in the actual pour only inside the italic word. Text
  // remains native HTML for selection, accessibility and reduced motion.
  const inkLayers = [...film.querySelectorAll('.liquid-type')].map(word => {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const letters = word.textContent;
    word.append(canvas);
    return { word, letters, canvas, context: canvas.getContext('2d') };
  });
  function paintInk(source) {
    if (act !== 'kaynak' || reduced.matches || source.readyState < 2 || document.hidden) return;
    const layer = inkLayers.find(item => item.word.parentElement.dataset.l === language());
    const { word, letters, canvas, context } = layer;
    if (!context || !word.offsetWidth) return;
    const style = getComputedStyle(word);
    const padding = 12;
    const w = word.offsetWidth + 2 * padding;
    const h = word.offsetHeight + 2 * padding;
    const scale = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * scale) || canvas.height !== Math.round(h * scale)) {
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = '#b87a47';
    context.fillRect(0, 0, w, h);
    context.globalCompositeOperation = 'screen';
    const vw = source.videoWidth, vh = source.videoHeight;
    context.drawImage(source, vw * .23, vh * .22, vw * .45, vh * .49, 0, 0, w, h);
    context.globalCompositeOperation = 'destination-in';
    context.font = style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    context.letterSpacing = style.letterSpacing;
    const metrics = context.measureText(letters);
    const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .8;
    const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .2;
    context.fillStyle = '#fff';
    context.fillText(letters, padding, padding + (word.offsetHeight + ascent - descent) / 2);
    word.classList.add('has-ink');
  }
  function displayedVideo() {
    return stage.classList.contains('is-ambient') && ambient.readyState >= 2 ? ambient : video;
  }
  function observeVideo(source) {
    if (!source.requestVideoFrameCallback) return;
    source.requestVideoFrameCallback(() => {
      if (source === displayedVideo()) paintInk(source);
      observeVideo(source);
    });
  }
  observeVideo(video);
  observeVideo(ambient);
  document.fonts.ready.then(() => paintInk(displayedVideo()));

  const cells = new Map();
  // Groups 8–14 and periods 4–6 contain all ten recovered metals.
  // Their neighbours give the fragment the shape of the periodic table.
  function axis(value, row, column) {
    const label = document.createElement('small');
    label.className = 'notation-axis';
    label.textContent = value;
    label.style.gridArea = row + ' / ' + column;
    label.setAttribute('aria-hidden', 'true');
    notation.append(label);
  }
  for (let group = 8; group <= 14; group++) axis(group, 1, group - 6);
  for (let period = 4; period <= 6; period++) axis(period, period - 2, 1);

  for (const [number, symbol, , , , group, period] of elements.values()) {
    if (group < 8 || group > 14 || period < 4 || period > 6) continue;
    const metal = metals[symbol];
    const cell = document.createElement(metal ? 'button' : 'span');
    cell.style.gridArea = (period - 2) + ' / ' + (group - 6);
    if (metal) {
      const atomicNumber = document.createElement('small');
      atomicNumber.textContent = number;
      cell.type = 'button';
      cell.dataset.metal = symbol;
      cell.style.setProperty('--tone', metal.ton);
      cell.append(atomicNumber, symbol);
      cell.addEventListener('click', () => {
        film.dispatchEvent(new Event('film:inspect'));
        pickedMetal = symbol;
        showMetal(symbol);
      });
      cells.set(symbol, cell);
    } else {
      cell.className = 'notation-neighbour';
      cell.textContent = symbol;
      cell.setAttribute('aria-hidden', 'true');
    }
    notation.append(cell);
  }
  const cursor = document.createElement('span');
  cursor.className = 'notation-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  notation.append(cursor);

  function showMetal(symbol, force = false) {
    if (symbol === displayedMetal && !force) return;
    const metal = metals[symbol], lang = language();
    const [number, , , , mass, group, period] = elements.get(symbol);
    cursor.style.transform = 'translate(' + (group - 8) * 100 + '%, ' + (period - 4) * 100 + '%)';
    cursor.style.borderColor = metal.ton;
    metalSymbol.textContent = symbol;
    metalNumber.textContent = number;
    metalMass.textContent = (lang === 'tr' ? mass.replace('.', ',') : mass) + ' u';
    metalMass.title = lang === 'tr' ? 'Atom kütlesi' : 'Atomic mass';
    metalName.textContent = metal[lang].ad;
    metalSource.textContent = metal[lang].kaynak[0];
    metalLink.href = 'urunler.html#' + symbol;
    specimen.style.setProperty('--ore', metal.ton);
    notation.setAttribute('aria-label', lang === 'tr' ? 'Geri kazanılan elementler' : 'Recovered elements');
    for (const [key, button] of cells) {
      button.setAttribute('aria-pressed', String(key === symbol));
      button.setAttribute('aria-label', key + ' · ' + metals[key][lang].ad);
    }
    if (displayedMetal && displayedMetal !== symbol && !reduced.matches) {
      specimen.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    }
    displayedMetal = symbol;
  }
  function showView(index, force) {
    if (index === displayedView && !force) return;
    viewPhotos.forEach((photo, i) => photo.classList.toggle('is-shown', i === index));
    viewButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    film.querySelector('[data-view-index]').textContent = '0' + (index + 1) + ' / 03';
    displayedView = index;
  }
  viewButtons.forEach((button, index) => button.addEventListener('click', () => {
    film.dispatchEvent(new Event('film:inspect'));
    pickedView = index;
    paint();
  }));
  notes.forEach(note => note.addEventListener('toggle', () => {
    if (note.open) film.dispatchEvent(new Event('film:inspect'));
  }));

  function paint(force = false) {
    const p = reduced.matches ? .35 : fraction;
    if (act === 'kaynak') {
      paintInk(displayedVideo());
    } else if (act === 'ergitme') {
      stage.style.setProperty('--melt', (16 + p * 72).toFixed(1) + '%');
    } else if (act === 'elementler') {
      const feature = fraction < .38 ? 'Au' : fraction < .72 ? 'Ag' : 'Cu';
      showMetal(pickedMetal ?? feature, force);
    } else if (act === 'belgeler') {
      stage.style.setProperty('--lift', ((1 - p) * 8).toFixed(2) + 'px');
    } else if (act === 'say-gram') {
      // The lettering catches the gold light as the die retracts.
      const strike = reduced.matches ? 1 : clamp((fraction - .36) / .2);
      const light = [155 + 92 * strike, 140 + 68 * strike, 118 + 24 * strike];
      stage.style.setProperty('--strike-color', 'rgb(' + light.map(Math.round).join(' ') + ')');
      stage.style.setProperty('--strike-tracking', (.018 - strike * .055).toFixed(3) + 'em');
    } else if (act === 'tesis') {
      stage.style.setProperty('--beat', p.toFixed(4));
      showView(pickedView ?? Math.min(2, Math.floor(fraction * 3)), force);
      // Tesis logodan önce geliyorsa sahnenin sonunda fotoğraflar kaybolur ve logo arkadan açılır.
      const fadeIn = reduced.matches || pickedView !== null ? 1 : clamp(fraction / .2);
      const fade = facilityLast ? fadeIn : Math.min(fadeIn, clamp((1 - fraction) / .18));
      stage.style.setProperty('--visit-reveal', (fade * fade * (3 - 2 * fade)).toFixed(4));
    }
  }
  film.addEventListener('film:frame', ({ detail }) => {
    if (detail.act !== act) {
      act = detail.act;
      pickedMetal = null;
      pickedView = null;
      notes.forEach(note => { note.open = false; });
    }
    stage.dataset.act = act;
    fraction = detail.fraction;
    paint();
  });
  document.addEventListener('say:lang', () => paint(true));
  reduced.addEventListener('change', () => {
    inkLayers.forEach(({ word }) => word.classList.remove('has-ink'));
    paint(true);
  });
  new ResizeObserver(() => paintInk(displayedVideo())).observe(film.querySelector('.opening-line'));
  stage.dataset.act = act;
  showMetal('Au');
})();
