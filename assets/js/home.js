/* Home page: orbit hero, marquee, poster-wall deal, "Would you tap?" game.
   Runs after site.js (which sets up Lenis, GSAP + ScrollTrigger and window.ywLenis). */
document.addEventListener('DOMContentLoaded', () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = !reduce && typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const PL = document.documentElement.lang === 'pl', t = (en, pl) => PL ? pl : en;
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------------- "Would you tap?" (works without GSAP) ---------------- */
  const deck = document.querySelector('[data-tap]');
  if (deck) {
    const cards = [...deck.querySelectorAll('.tap-card')];
    const res = deck.querySelector('.tap-result'), end = deck.querySelector('.tap-end');
    const nOut = document.querySelector('[data-tap-n]'), sOut = document.querySelector('[data-tap-score]');
    let i = 0, score = 0, busy = false;
    const layout = () => cards.forEach((c, k) => {
      c.classList.remove('is-top', 'is-next', 'is-later');
      if (k === i) c.classList.add('is-top'); else if (k === i + 1) c.classList.add('is-next'); else if (k > i) c.classList.add('is-later');
      c.setAttribute('aria-hidden', k !== i);
    });
    const answer = choice => {
      if (busy || i >= cards.length) return; busy = true;
      const c = cards[i], right = choice === c.dataset.answer;
      if (right) score++;
      sOut.textContent = score;
      c.classList.add(choice === 'scam' ? 'out-scam' : 'out-safe');
      res.className = 'tap-result ' + (right ? 'is-right' : 'is-wrong');
      res.querySelector('.tap-verdict').textContent = (right ? t('Right! ', 'Dobrze! ') : t('Careful! ', 'Uwaga! ')) + (c.dataset.answer === 'scam' ? t('It’s a scam.', 'To oszustwo.') : t('It’s safe.', 'To bezpieczne.'));
      res.querySelector('.tap-why').textContent = c.dataset.why;
      res.querySelector('.tap-learn').href = c.dataset.topic;
      res.querySelector('[data-tap-next]').textContent = i === cards.length - 1 ? t('See my score', 'Pokaż mój wynik') : t('Next message', 'Następna wiadomość');
      setTimeout(() => { res.hidden = false; res.querySelector('[data-tap-next]').focus({ preventScroll: true }); }, 250);
    };
    deck.querySelectorAll('.tap-btn').forEach(b => b.addEventListener('click', () => answer(b.dataset.choice)));
    res.querySelector('[data-tap-next]').addEventListener('click', () => {
      res.hidden = true; busy = false; i++;
      if (i >= cards.length) {
        end.hidden = false; deck.classList.add('is-over');
        end.querySelector('.tap-end-score').textContent = t(`You spotted ${score} of ${cards.length}!`, `Twój wynik: ${score} z ${cards.length}!`);
      } else { nOut.textContent = i + 1; layout(); }
    });
    deck.querySelector('[data-tap-reset]').addEventListener('click', () => {
      i = 0; score = 0; busy = false; sOut.textContent = 0; nOut.textContent = 1;
      cards.forEach(c => c.classList.remove('out-scam', 'out-safe'));
      end.hidden = true; deck.classList.remove('is-over'); layout();
    });
    // keyboard + swipe
    deck.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') answer('scam'); if (e.key === 'ArrowRight') answer('safe'); });
    let sx = null;
    deck.addEventListener('pointerdown', e => { if (e.target.closest('.tap-card.is-top')) sx = e.clientX; });
    deck.addEventListener('pointerup', e => { if (sx !== null) { const dx = e.clientX - sx; if (Math.abs(dx) > 70) answer(dx < 0 ? 'scam' : 'safe'); } sx = null; });
    layout();
  }

  /* ---------------- matrix rain behind the hero (paused off-screen, static if reduced motion) ---------------- */
  const cv = document.querySelector('.matrix');
  if (cv) {
    const ctx = cv.getContext('2d'), glyphs = '01<>/{}[]#$%&*=+アカサタナハマヤラワ01ABCDEF'.split('');
    let cols = [], fs = 16, W = 0, H = 0, visible = true, last = 0;
    const size = () => {
      const r = Math.min(devicePixelRatio || 1, 1.5);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * r; cv.height = H * r; ctx.setTransform(r, 0, 0, r, 0, 0);
      fs = W < 600 ? 13 : 16; cols = Array.from({ length: Math.ceil(W / fs) }, () => Math.random() * -H / fs);
      ctx.fillStyle = '#030605'; ctx.fillRect(0, 0, W, H);
    };
    const draw = () => {
      ctx.fillStyle = 'rgba(3,6,5,.12)'; ctx.fillRect(0, 0, W, H);
      ctx.font = fs + 'px "JetBrains Mono", monospace';
      cols.forEach((y, i) => {
        const ch = glyphs[(Math.random() * glyphs.length) | 0];
        ctx.fillStyle = Math.random() > .975 ? '#d9fff0' : (i % 7 === 0 ? '#00e5ff' : '#00ff9c');
        ctx.fillText(ch, i * fs, y * fs);
        cols[i] = (y * fs > H && Math.random() > .975) ? 0 : y + 1;
      });
    };
    size(); addEventListener('resize', size);
    if (reduce) { for (let k = 0; k < 60; k++) draw(); }
    else {
      new IntersectionObserver(([en]) => visible = en.isIntersecting).observe(cv);
      const loop = t => { requestAnimationFrame(loop); if (!visible || document.hidden || t - last < 55) return; last = t; draw(); };
      requestAnimationFrame(loop);
    }
  }

  const track = document.querySelector('.marquee-track');
  if (!motion) { if (track && !reduce) track.classList.add('css-anim'); return; }

  /* ---------------- orbit hero ---------------- */
  const ring = document.querySelector('.ring'), copy = document.querySelector('.orbit-copy');
  if (ring) {
    gsap.fromTo('.ring-ic', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.1, ease: 'back.out(1.6)', stagger: .06, delay: .3 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.orbit', start: 'top top', end: 'bottom top', scrub: true } });
    tl.to(ring, { rotateX: 58, scale: 1.55, ease: 'none' }, 0)
      .to(copy, { yPercent: 35, opacity: 0, scale: .92, ease: 'none' }, 0)
      .to('.orbit-grid', { yPercent: 20, ease: 'none' }, 0)
      .to('.ob1', { xPercent: 25, ease: 'none' }, 0).to('.ob2', { xPercent: -25, ease: 'none' }, 0);
    if (fine) {
      const qx = gsap.quickTo(ring, 'rotateZ', { duration: 1, ease: 'power3.out' });
      const qy = gsap.quickTo('.orbit-copy', 'x', { duration: 1, ease: 'power3.out' });
      document.querySelector('.orbit').addEventListener('pointermove', e => {
        const x = e.clientX / innerWidth - .5; qx(x * -8); qy(x * -14);
      });
    }
  }

  /* ---------------- marquee: constant, independent of scrolling ---------------- */
  if (track) track.classList.add('css-anim');

  /* ---------------- poster wall ---------------- */
  const wall = document.querySelector('.pwall'), cards = gsap.utils.toArray('.pitem'), countEl = document.querySelector('[data-wall-count]');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1000px) and (min-height: 620px)', () => {
    // desktop: the 12 posters start as a stack and are dealt onto the wall while you scroll
    wall.classList.add('is-deal');
    ScrollTrigger.refresh();
    const stage = wall.querySelector('.wall-grid').getBoundingClientRect();
    const cx = stage.left + stage.width / 2, cy = stage.top + stage.height / 2;
    cards.forEach((c, k) => {
      const r = c.getBoundingClientRect();
      gsap.set(c, { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2) + 40, rotation: gsap.utils.random(-18, 18), rotationY: -25,
        scale: 1.25, zIndex: 20 - k, transformPerspective: 1200 });
    });
    const tl = gsap.timeline({ scrollTrigger: { trigger: wall, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: self => { if (countEl) countEl.textContent = Math.max(0, Math.min(12, Math.round(self.progress * 13 - .3))); } } });
    tl.from(cards, { opacity: 0, y: '+=200', duration: .6, stagger: .02, ease: 'power2.out' }, 0)
      .to(cards, { x: 0, y: 0, rotation: 0, rotationY: 0, scale: 1, duration: 1, ease: 'power3.inOut', stagger: .45 }, .7)
      .to({}, { duration: .6 });
    return () => { wall.classList.remove('is-deal'); gsap.set(cards, { clearProps: 'all' }); };
  });
  mm.add('(max-width: 999.98px), (max-height: 619.98px)', () => {
    // tablet / phone: posters flip up into place as they enter, columns drift at different speeds
    ScrollTrigger.batch(cards, { start: 'top 95%', once: true, onEnter: b =>
      gsap.fromTo(b, { opacity: 0, y: 60, rotateX: 25, transformPerspective: 900 }, { opacity: 1, y: 0, rotateX: 0, duration: .9, ease: 'power3.out', stagger: .08 }) });
    if (countEl) countEl.textContent = 12;
  });

  /* ---------------- topic cards rise in a wave ---------------- */
  /* (tcards already use the shared data-reveal flip-up + tilt from site.js) */

});
