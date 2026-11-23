/* Dikey ekranlarda (telefon, dikey tablet) videoların görünen kısmını öznenin üstüne getirir.
   16:9 video dikey ekrana "cover" ile sığdırılınca karenin yalnızca üçte biri görünür; tam ortadan
   kırpmak döküm akışını, külçeyi ya da presi kadraj dışında bırakabiliyordu.
   Yatay ekranda hiçbir şey yapmaz: satır içi stil kaldırılır, masaüstü CSS'i olduğu gibi geçerli kalır.

   Odak değerleri [saniye, yatay konum 0–1]. Kareler tek tek telefon kadrajıyla kırpılıp kontrol edildi.
   Logo sahnesi kırpılmaz; mobil.css onu tam genişlikte gösterir. */
(() => {
  'use strict';
  const portrait = matchMedia('(orientation: portrait)');

  // Süreç filmi (process-scrub.mp4): döner fırın, pota, kalıp, külçe ve maşa, pres
  const FILM = [[0, .47], [4.6, .47], [5.1, .5], [9.5, .5], [13, .49], [14, .45], [14.4, .56], [18.7, .56], [19.2, .49], [27.6, .49]];
  // Giriş döngüsü (furnace-loop.mp4): döner fırından döküm
  const AMBIENT = [[0, .47]];
  // E-atık sahnesi (e-atik-720/432.mp4): dünya ortada, sonra parçalanan telefon, en sonda ortada asılı altın külçe
  const WORLD = [[0, .5], [.3, .5], [.75, .57], [1.5, .59], [2.06, .597], [2.35, .54], [2.6, .53], [2.98, .5]];

  function focusAt(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, x1] = keys[i];
      if (t <= t1) { const [t0, x0] = keys[i - 1]; return x0 + (x1 - x0) * (t - t0) / (t1 - t0); }
    }
    return keys[keys.length - 1][1];
  }

  function place(video, focus) {
    if (!portrait.matches) { if (video.style.objectPosition) video.style.objectPosition = ''; return; }
    const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
    const bw = video.clientWidth, bh = video.clientHeight;
    if (!bw || !bh || getComputedStyle(video).objectFit !== 'cover') { if (video.style.objectPosition) video.style.objectPosition = ''; return; }
    const drawn = vw * Math.max(bw / vw, bh / vh);
    if (drawn - bw < 1) { if (video.style.objectPosition) video.style.objectPosition = ''; return; }
    // object-position yüzdesi: kaynağın o noktası kutunun aynı noktasına hizalanır
    const p = Math.max(0, Math.min(1, (bw / 2 - focus * drawn) / (bw - drawn)));
    const value = (p * 100).toFixed(2) + '% 50%';
    if (video.style.objectPosition !== value) video.style.objectPosition = value;
  }

  const updates = [];
  function watch(video, keys) {
    if (!video) return;
    const update = () => place(video, focusAt(keys, video.currentTime || 0));
    let looping = false;
    // Her sunulan karede güncelle (kaydırırken yapılan atlamalar dahil); destek yoksa olaylara düş.
    const loop = () => { update(); if (portrait.matches) video.requestVideoFrameCallback(loop); else looping = false; };
    const start = () => {
      update();
      if (!looping && portrait.matches && 'requestVideoFrameCallback' in video) { looping = true; video.requestVideoFrameCallback(loop); }
    };
    ['loadedmetadata', 'loadeddata', 'seeked', 'timeupdate', 'play'].forEach(type => video.addEventListener(type, update));
    updates.push(start);
  }

  watch(document.querySelector('.film-footage'), FILM);
  watch(document.querySelector('.film-ambient'), AMBIENT);
  watch(document.querySelector('.world-media video'), WORLD);

  const refresh = () => updates.forEach(start => start());
  portrait.addEventListener('change', refresh);
  window.addEventListener('resize', refresh, { passive: true });
  // Logo sahnesine girip çıkarken object-fit değişir; sahne değişiminde yeniden hesapla.
  const stage = document.querySelector('.film-stage');
  if (stage && 'MutationObserver' in window) new MutationObserver(refresh).observe(stage, { attributes: true, attributeFilter: ['data-act'] });
  refresh();
})();
