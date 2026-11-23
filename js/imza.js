/* SAY imzası, fabriquet.com'daki kapanışla aynı dilde: binlerce metal atomu bir girdapta döner, her harfin
   atomları dönerek yerine oturur, logo atomların hemen ardından soldan sağa bir dalgayla belirir ve atomlar
   yerleştikleri anda erir. Arkada hızlanıp duran bir yıldız akışı, ince ışık şeritleri ve tek bir ışık
   halkası. Renkler logodaki gibi altın ve gümüş. Önceki "iki akıntı" sürümü yedekte duruyor. */
(() => {
  'use strict';
  const figure = document.getElementById('imza');
  if (!figure || !('IntersectionObserver' in window)) return;
  const stage = figure.querySelector('.signature-stage');
  const mark = figure.querySelector('.signature-mark');
  const canvas = stage.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!ctx || !('ResizeObserver' in window)) return;

  const DURATION = 4.2;          // saniye, sahne bir kez görünür olunca kendi saatiyle akar
  const LETTER_GAP = .05;        // S, Λ, Y sırayla oturur; her harf bir öncekinden bu kadar sonra
  const START_RATIO = .55;       // sahnenin bu kadarı göründüğünde başlar
  const clamp = v => Math.max(0, Math.min(1, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const seed = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const stars = Array.from({length:54}, (_, i) => ({angle:seed(i) * Math.PI * 2, depth:seed(i + 230), size:.5 + seed(i + 340) * 1.1, hue:i % 3}));

  let pixels = null, width = 1, height = 1, dpr = 1, mobile = false, letter = null, word = null, points = [];
  let nearby = false, inView = false, started = null, frame = 0, maskFailed = false;
  let pointerX = 0, pointerY = 0, driftX = 0, driftY = 0;

  // Atomların hedefi, işaretin CSS kalıbıyla aynı harf görseli (logo setinin vektörel PDF'inden üretildi).
  const TW = 472, TH = 320;
  function loadMask() {
    const logo = new Image();
    logo.onload = () => {
      const tile = document.createElement('canvas');
      tile.width = TW; tile.height = TH;
      const mask = tile.getContext('2d', {willReadFrequently:true});
      if (!mask) { useStaticMark(); return; }
      mask.drawImage(logo, 0, 0, TW, TH);
      pixels = mask.getImageData(0, 0, TW, TH).data;
      rebuild();
    };
    logo.onerror = useStaticMark;
    logo.src = 'assets/logo/say-harfler.png';
  }

  // Harfleri ince bir ızgarayla atomlara böler; kare başına iş az kalsın diye her sabit burada hesaplanır.
  function rebuild() {
    if (!pixels || !nearby || reduced.matches || maskFailed) return;
    const box = stage.getBoundingClientRect(), m = mark.getBoundingClientRect();
    if (!box.width || !box.height || !m.width || !m.height) return;
    width = box.width; height = box.height; mobile = width <= 760;
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    letter = {left:m.left - box.left, top:m.top - box.top, width:m.width, height:m.height};
    const step = mobile ? 1.25 : 1.35;
    const sums = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], raw = [];
    for (let y = 0; y < letter.height; y += step) {
      for (let x = 0; x < letter.width; x += step) {
        const u = x / letter.width, v = y / letter.height;
        if (pixels[(Math.floor(v * TH) * TW + Math.floor(u * TW)) * 4 + 3] <= 95) continue;
        const glyph = u < .27 ? 0 : u < .71 ? 1 : 2;
        const px = letter.left + x, py = letter.top + y;
        sums[glyph][0] += px; sums[glyph][1] += py; sums[glyph][2]++;
        raw.push([px, py, glyph]);
      }
    }
    const centers = sums.map(([sx, sy, n]) => n ? [sx / n, sy / n] : [letter.left + letter.width / 2, letter.top + letter.height / 2]);
    // Logo, harflerin oturma cephesinin hemen arkasından açılır: harf i yaklaşık u = .645 + i × LETTER_GAP'te oturur.
    word = {cx0:centers[0][0], slope:(centers[2][0] - centers[0][0]) / (2 * LETTER_GAP), feather:letter.width * .22};
    points = raw.map(([x0, y0, glyph], id) => {
      const s = seed(id + 500);
      const x = x0 + (seed(id + 2500) - .5) * step * .7, y = y0 + (seed(id + 3500) - .5) * step * .7;
      const [cx, cy] = centers[glyph];
      return {
        x, y, cx, cy, dx:x - cx, dy:y - cy,
        g0:.10 + glyph * .04 + s * .04, g1:.61 + glyph * LETTER_GAP + s * .07,
        angle:seed(id + 1500) * Math.PI * 2, radius:width * (.055 + s * .09),
        size:(mobile ? .6 : .75) + s * .55, alpha:.28 + s * .45, gold:s > .6, trail:seed(id + 4500) < .3
      };
    });
    const limit = mobile ? 3200 : 16000;
    if (points.length > limit) {
      const all = points;
      points = Array.from({length:limit}, (_, i) => all[Math.floor(i * all.length / limit)]);
      // Çok geniş ekranlarda seyreltilen atomlar büyür, harfler aynı dolulukta kalır.
      const grow = Math.sqrt(all.length / limit);
      for (const point of points) point.size *= grow;
    }
    draw(performance.now() / 1000);
    play();
  }

  function draw(time) {
    const u = started === null ? 0 : clamp((time - started) / DURATION);
    const reveal = smooth(.50, .60, u), afterglow = smooth(.84, 1, u);
    figure.style.setProperty('--body-light', reveal.toFixed(3));
    figure.style.setProperty('--caption-light', afterglow.toFixed(3));
    figure.style.setProperty('--glint-position', (-105 + 310 * smooth(.78, .98, u)).toFixed(1) + '%');
    figure.style.setProperty('--sheen', (50 + Math.sin(time * .27) * 45).toFixed(1) + '%');
    if (word && u > .5 && u < .84) {
      // Dalga, sahneyi kaplayan sarmalayıcının kalıbıdır; konum sahne koordinatında.
      const front = word.cx0 + (u - .645) * word.slope, half = word.feather * .5;
      figure.style.setProperty('--wave', `linear-gradient(90deg,#000 ${(front - half).toFixed(1)}px,transparent ${(front + half).toFixed(1)}px)`);
    } else figure.style.removeProperty('--wave');

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!letter || u <= 0) return;
    ctx.globalCompositeOperation = 'lighter';
    const midX = letter.left + letter.width / 2, midY = letter.top + letter.height / 2;
    const floor = Math.min(letter.top + letter.height + height * .035, height * .8);
    const arrive = smooth(0, .22, u);
    const cx = mix(width * .74, midX, smooth(0, .35, u)) + driftX * 13;
    const cy = midY + driftY * 9;
    const warp = Math.sin(smooth(.02, .73, u) * Math.PI);
    const glow = smooth(.17, .65, u) * (.75 + Math.sin(time * .3) * .10);

    // Logonun altında yayvan, sıcak bir ışık havuzu
    ctx.save(); ctx.translate(midX, floor); ctx.scale(1, .2);
    const reach = width * .43, bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, reach);
    bloom.addColorStop(0, `rgba(240,214,176,${glow * .12})`);
    bloom.addColorStop(.28, `rgba(196,150,96,${glow * .07})`);
    bloom.addColorStop(1, 'rgba(160,120,80,0)');
    ctx.fillStyle = bloom; ctx.fillRect(-reach, -reach, reach * 2, reach * 2); ctx.restore();

    // Derin bir ışık alanı imzaya doğru hızlanır, sonra durulur.
    for (let i = 0; i < (mobile ? 28 : stars.length); i++) {
      const star = stars[i];
      const travel = (star.depth + time * .032) % 1;
      const distance = (.05 + travel * travel * 1.1) * width;
      const angle = star.angle + Math.sin(time * .025) * .12;
      const x = cx + Math.cos(angle) * distance, y = cy + Math.sin(angle) * distance * .63;
      const tail = distance * (.004 + warp * .13);
      const alpha = arrive * (.07 + warp * .17 + travel * .1) * Math.sin(travel * Math.PI);
      ctx.strokeStyle = star.hue === 0 ? `rgba(244,226,196,${alpha})` : `rgba(214,174,118,${alpha})`;
      ctx.lineWidth = star.size * (mobile ? .65 : 1);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(angle) * tail, y - Math.sin(angle) * tail * .63); ctx.stroke();
    }

    // Ufuk çizgisi: logonun altında incecik açılan bir ışık
    const horizon = smooth(.22, .64, u) * (.33 + Math.sin(time * .42) * .09);
    if (horizon > .002) {
      const span = width * (mobile ? .9 : .76) * mix(.02, 1, smooth(.12, .72, u));
      const line = ctx.createLinearGradient(midX - span / 2, 0, midX + span / 2, 0);
      line.addColorStop(0, 'rgba(214,170,110,0)');
      line.addColorStop(.3, `rgba(214,170,110,${horizon * .3})`);
      line.addColorStop(.5, `rgba(250,228,196,${horizon * .9})`);
      line.addColorStop(.7, `rgba(214,170,110,${horizon * .3})`);
      line.addColorStop(1, 'rgba(214,170,110,0)');
      ctx.fillStyle = line; ctx.fillRect(midX - span / 2, floor - height * .012, span, 1);
    }

    // İnce ışık şeritleri
    const ribbons = smooth(.25, .86, u);
    if (ribbons > 0) {
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, `rgba(150,110,70,${ribbons * .02})`);
      gradient.addColorStop(.3, `rgba(196,150,96,${ribbons * .26})`);
      gradient.addColorStop(.58, `rgba(246,222,180,${ribbons * .39})`);
      gradient.addColorStop(.78, `rgba(205,160,104,${ribbons * .22})`);
      gradient.addColorStop(1, 'rgba(150,110,70,0)');
      ctx.strokeStyle = gradient; ctx.lineWidth = .65;
      for (let strand = 0; strand < 26; strand++) {
        const band = strand / 25 - .5;
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const s = i / 120;
          const x = (s - .5) * width * 1.18 + width * .5;
          const y = floor + height * .02 + Math.sin(s * 7.4 + time * .18 + band * .75) * height * .056 +
            Math.sin(s * 13 - time * .12) * height * .013 + band * height * .065;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // Atomlar: iki renk (altın, gümüş) × on iki parlaklık; binlercesi birkaç yolda tek seferde çizilir.
    const dust = u < .9 ? smooth(.01, .1, u) : 0;
    if (dust > .002 && points.length) {
      const levels = 12, paths = Array.from({length:levels * 2}, () => new Path2D()), trails = new Path2D();
      const spin = u * Math.PI * 2.1, settle = smooth(.02, .48, u), turn = Math.PI * 2;
      for (const point of points) {
        const fade = 1 - smooth(point.g1, point.g1 + .08, u);
        if (fade <= 0) continue;
        const gather = smooth(point.g0, point.g1, u);
        const rotation = (1 - gather) * turn, angle = point.angle + spin;
        const centerX = mix(cx, point.cx, settle), centerY = mix(cy, point.cy, settle);
        const ox = centerX + Math.cos(angle) * point.radius, oy = centerY + Math.sin(angle) * point.radius * .65;
        const cr = Math.cos(rotation), sr = Math.sin(rotation);
        const tx = point.cx + point.dx * cr - point.dy * sr, ty = point.cy + point.dx * sr + point.dy * cr;
        const x = mix(ox, tx, gather), y = mix(oy, ty, gather);
        if (point.trail && gather < .86) {
          const drift = 1 - gather;
          trails.moveTo(x, y);
          trails.lineTo(x + Math.sin(angle) * point.radius * .09 * drift, y - Math.cos(angle) * point.radius * .06 * drift);
        }
        const level = Math.min(levels - 1, Math.floor(point.alpha * fade / .73 * levels));
        paths[(point.gold ? levels : 0) + level].rect(x, y, point.size, point.size);
      }
      ctx.strokeStyle = `rgba(232,214,186,${dust * .19})`; ctx.lineWidth = .65; ctx.stroke(trails);
      for (let b = 0; b < levels * 2; b++) {
        const alpha = dust * ((b % levels) + .5) / levels * .73;
        ctx.fillStyle = b >= levels ? `rgba(246,206,146,${alpha})` : `rgba(226,230,236,${alpha})`;
        ctx.fill(paths[b]);
      }
    }

    // Harfler toplanırken tek bir ışık halkası genişler.
    const pulse = smooth(.25, .72, u), pulseAlpha = Math.sin(pulse * Math.PI) * .19;
    if (pulseAlpha > .001) {
      ctx.strokeStyle = `rgba(240,214,170,${pulseAlpha})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, width * (.025 + pulse * .62), height * (.012 + pulse * .29), -.22, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function tick(now) {
    frame = 0;
    driftX = mix(driftX, pointerX, .06); driftY = mix(driftY, pointerY, .06);
    draw(now / 1000);
    play();
  }
  function play() {
    if (!frame && inView && letter && !document.hidden && !reduced.matches && !maskFailed) frame = requestAnimationFrame(tick);
  }
  function stopFrame() { cancelAnimationFrame(frame); frame = 0; }
  function reset() {
    stopFrame(); started = null;
    if (letter && !reduced.matches && !maskFailed) draw(performance.now() / 1000);
  }
  function useStaticMark() {
    maskFailed = true; stopFrame();
    figure.classList.remove('animated-signature');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  function syncMotion() {
    stopFrame();
    figure.classList.toggle('animated-signature', !reduced.matches && !maskFailed);
    if (reduced.matches) ctx.clearRect(0, 0, canvas.width, canvas.height);
    else rebuild();
  }

  // İlk kare altbilgi gelmeden hazırlanır; sahne yeterince görününce kapanış kendi saatiyle baştan sona akar.
  new IntersectionObserver(([entry]) => {
    nearby = entry.isIntersecting;
    if (nearby) rebuild();
  }, {rootMargin:'1000px 0px'}).observe(figure);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (!inView) { reset(); return; }
    if (started === null && entry.intersectionRatio >= START_RATIO) started = performance.now() / 1000;
    play();
  }, {threshold:[0, START_RATIO]}).observe(stage);
  figure.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const box = figure.getBoundingClientRect();
    pointerX = (event.clientX - box.left) / box.width - .5;
    pointerY = (event.clientY - box.top) / box.height - .5;
  }, {passive:true});
  figure.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
  const size = new ResizeObserver(rebuild);
  size.observe(stage);
  size.observe(mark);
  reduced.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopFrame(); else play(); });
  syncMotion();
  loadMask();
})();
