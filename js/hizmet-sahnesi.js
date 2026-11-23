/* The specimen, its text and the index move together at each scroll stop. */
(() => {
  'use strict';
  const section = document.getElementById('hizmetler');
  if (!section) return;
  const tour = section.querySelector('.service-tour');
  const pin = tour.querySelector('.service-pin');
  const view = tour.querySelector('.service-map');
  const photo = view.querySelector('.assay-table');
  const rail = tour.querySelector('.service-names');
  const panels = [...tour.querySelectorAll('.material-detail')];
  const counter = tour.querySelector('.tour-position');
  const desktop = matchMedia('(min-width:841px) and (min-height:600px)');
  // Bounds of each specimen in the 1536 × 1024 inspection-table photograph.
  const bounds = [
    [225, 42, 747, 315], [52, 291, 510, 572], [196, 529, 742, 889],
    [802, 32, 1371, 323], [1029, 316, 1435, 626], [809, 577, 1232, 878]
  ];
  let active = -1;
  let top = 0;
  let travel = 1;
  let frame = 0;

  function frameSample() {
    if (active < 0) return;
    const [left, upper, right, lower] = bounds[active];
    const width = right - left, height = lower - upper;
    const scale = Math.min(view.clientWidth * .82 / width, view.clientHeight * .73 / height);
    const x = (view.clientWidth - (left + right) * scale) / 2;
    const y = (view.clientHeight - (upper + lower) * scale) / 2;
    photo.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + scale + ')';
    view.style.setProperty('--light-w', width * scale * .60 + 'px');
    view.style.setProperty('--light-h', height * scale * .66 + 'px');
  }

  function select(index) {
    if (index === active) return;
    active = index;
    panels.forEach((panel, i) => {
      const selected = i === index;
      panel.inert = !selected;
      panel.classList.toggle('is-current', selected);
      buttons[i].setAttribute('aria-selected', String(selected));
      buttons[i].tabIndex = selected ? 0 : -1;
    });
    counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(panels.length).padStart(2, '0');
    frameSample();
  }
  function readScroll() {
    frame = 0;
    if (!desktop.matches || tour.querySelector('.material-detail :focus-visible')) return;
    const fraction = (top - tour.getBoundingClientRect().top) / travel;
    select(Math.max(0, Math.min(panels.length - 1, Math.floor(fraction * panels.length))));
  }
  function onScroll() {
    if (!frame && desktop.matches) frame = requestAnimationFrame(readScroll);
  }
  function jumpTo(index) {
    if (!desktop.matches) return;
    // Match the scroll position to the manual choice so the tour continues from it.
    window.scrollTo({
      top:scrollY + tour.getBoundingClientRect().top - top + travel * (index + .5) / panels.length,
      behavior:'instant'
    });
    select(index);
  }

  rail.setAttribute('role', 'tablist');
  const buttons = panels.map((panel, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'service-name';
    button.id = panel.id + '-isim';
    button.setAttribute('role','tab');
    button.setAttribute('aria-controls',panel.id);
    const thumb = document.createElement('span');
    thumb.className = 'service-thumb';
    thumb.setAttribute('aria-hidden','true');
    thumb.style.setProperty('--thumb-at', ((index % 3) * 50) + '% ' + (index < 3 ? 0 : 100) + '%');
    const text = panel.querySelector('h3').cloneNode(true);
    button.append(thumb, ...text.childNodes);
    rail.append(button);
    button.addEventListener('click', () => jumpTo(index));
    return button;
  });
  rail.addEventListener('keydown', event => {
    const index = buttons.indexOf(event.target);
    const count = buttons.length;
    const next = { ArrowRight:(index + 1) % count, ArrowLeft:(index + count - 1) % count,
      Home:0, End:count - 1 }[event.key];
    if (index < 0 || next === undefined) return;
    event.preventDefault();
    jumpTo(next);
    buttons[next].focus({preventScroll:true});
  });
  function measure() {
    if (!desktop.matches) return;
    top = parseFloat(getComputedStyle(pin).top) || 0;
    travel = Math.max(1, tour.offsetHeight - pin.offsetHeight);
    readScroll();
    frameSample();
  }
  function changeLayout() {
    section.classList.toggle('is-exhibit', desktop.matches);
    active = -1;
    for (const [i, panel] of panels.entries()) {
      panel.inert = false;
      panel.classList.remove('is-current');
      if (desktop.matches) {
        panel.setAttribute('role','tabpanel');
        panel.setAttribute('aria-labelledby',buttons[i].id);
      } else {
        panel.removeAttribute('role');
        panel.removeAttribute('aria-labelledby');
      }
    }
    measure();
  }
  const resize = new ResizeObserver(measure);
  resize.observe(pin);
  resize.observe(view);
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      window.addEventListener('scroll',onScroll,{passive:true});
      onScroll();
    } else {
      window.removeEventListener('scroll',onScroll);
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }).observe(tour);
  desktop.addEventListener('change',changeLayout);
  changeLayout();
})();
