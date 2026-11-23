/* Telefonda (dikey ya da yatay) süreç filmi logo sahnesiyle biter ve tesis sahnesi yoktur: sahne, bölüm düğmesi
   ve tesis fotoğrafları film betiklerinden önce sayfadan çıkarılır. Tesis panoraması film zamanında 7,5 sn yer
   kaplar; ondan sonraki sahnelerin, bölümlerin ve altyazıların zamanları bu kadar geri çekilir. film.js tesis
   olmadığında filmi videonun sonunda bitirir; mobil.css filmin kaydırma boyunu bir sahne kısaltır.
   Masaüstü ve tablet aynı kalır. */
(() => {
  'use strict';
  const film = document.querySelector('.film');
  if (!film || !matchMedia('(max-width: 760px), (pointer: coarse) and (max-height: 500px)').matches) return;
  const scene = film.querySelector('.film-scene[data-scene="tesis"]');
  if (!scene) return;
  const PANORAMA = 7.5;
  const at = Number(scene.dataset.start);
  const shift = value => String(+(Number(value) - PANORAMA).toFixed(6));
  const scenes = [...film.querySelectorAll('.film-scene')];
  const chapters = [...film.querySelectorAll('.film-ch')];
  const index = scenes.indexOf(scene);
  scenes.slice(index + 1).forEach(next => { next.dataset.start = shift(next.dataset.start); });
  chapters.slice(index + 1).forEach(chapter => {
    chapter.dataset.timecode = shift(chapter.dataset.timecode);
    if (chapter.dataset.checkpoints) chapter.dataset.checkpoints = chapter.dataset.checkpoints.split(' ').map(shift).join(' ');
    // Düğmeler sıralı numaralanır: tesis çıkınca sonrakiler bir öne gelir.
    const number = chapter.querySelector('small');
    if (number) number.textContent = String(Number(number.textContent) - 1).padStart(2, '0');
    chapter.dataset.go = String(Number(chapter.dataset.go) - 1);
  });
  film.querySelectorAll('[data-cue]').forEach(cue => {
    if (Number(cue.dataset.cue) >= at + PANORAMA) cue.dataset.cue = shift(cue.dataset.cue);
  });
  chapters[index]?.remove();
  film.querySelector('.visit-landscape')?.remove();
  scene.remove();
  film.classList.add('film--no-facility');
})();
