/* About page: cyber-style map of Poronin (Leaflet + OpenStreetMap tiles, recoloured in CSS). */
document.addEventListener('DOMContentLoaded', () => {
  const box = document.querySelector('[data-cybermap]');
  if (!box || typeof L === 'undefined') return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PORONIN = [49.3333, 20.0167], KRAKOW = [50.0614, 19.9366];
  const PL = document.documentElement.lang === 'pl', t = (en, pl) => PL ? pl : en;
  const status = box.querySelector('[data-cm-status]');

  const map = L.map('cm-map', {
    zoomControl: false, attributionControl: false, scrollWheelZoom: false,
    dragging: !L.Browser.mobile, tap: false, keyboard: false, doubleClickZoom: true
  }).setView([50.5, 15], 4);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);

  const pin = (cls, label) => L.divIcon({ className: 'cm-pin ' + cls, iconSize: [18, 18], iconAnchor: [9, 9],
    html: '<i></i><i></i><i></i><span>' + label + '</span>' });
  const route = L.polyline([KRAKOW, PORONIN], { className: 'cm-route', weight: 2 });
  const mk = L.marker(KRAKOW, { icon: pin('cm-pin--city', 'Kraków'), interactive: false, keyboard: false });
  const mp = L.marker(PORONIN, { icon: pin('cm-pin--target', 'Poronin'), interactive: false, keyboard: false });

  const lock = () => {
    route.addTo(map); mk.addTo(map); mp.addTo(map);
    box.classList.add('is-locked');
    status.textContent = t('Poronin, Poland · ~100 km from Kraków', 'Poronin, Polska · ok. 100 km od Krakowa');
  };
  const go = () => {
    const bounds = L.latLngBounds([KRAKOW, PORONIN]);
    const small = box.clientWidth < 600;
    const opts = { paddingTopLeft: [60, 80], paddingBottomRight: [small ? 60 : 260, small ? 190 : 60] };
    if (reduce) { map.fitBounds(bounds, opts); lock(); return; }
    status.textContent = t('Locating…', 'Szukam…');
    setTimeout(() => { status.textContent = t('Zooming in on southern Poland…', 'Przybliżam południe Polski…'); }, 900);
    map.flyToBounds(bounds, Object.assign({ duration: 3.2, easeLinearity: 0.2 }, opts));
    map.once('moveend', lock);
  };
  // start the fly-in when the map scrolls into view
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); setTimeout(go, 300); } }, { threshold: 0.4 });
    io.observe(box);
  } else go();
  addEventListener('resize', () => map.invalidateSize());
});
