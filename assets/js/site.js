/* Youth Work in Digital Era: site behaviour (works without it; this only adds motion + extras) */
(function () {
  const root = document.documentElement;
  const PL = document.documentElement.lang === 'pl', t = (en, pl) => PL ? pl : en;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = !reduce && typeof window.gsap !== 'undefined';
  if (motion) root.classList.add('motion');
  const store = (k, v) => { try { v === undefined ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} };

  /* ---------------- preloader (first page of a visit only) + incoming transition ---------------- */
  const pre = document.querySelector('.pre');
  let readyFired = false;
  const ready = () => {
    if (readyFired) return; readyFired = true;
    store('yw-seen', '1');
    if (pre && !root.classList.contains('seen')) {
      if (motion) gsap.to(pre, { autoAlpha: 0, duration: .5, ease: 'power2.out', onComplete: () => pre.remove() });
      else pre.remove();
    } else if (pre) pre.remove();
    if (root.classList.contains('pt-in')) {
      requestAnimationFrame(() => root.classList.add('pt-out'));
      setTimeout(() => root.classList.remove('pt-in', 'pt-out'), 700);
    }
    document.dispatchEvent(new Event('yw:ready'));
  };
  const firstVisit = !root.classList.contains('seen');
  window.addEventListener('load', () => setTimeout(ready, firstVisit && motion ? 450 : 0));
  setTimeout(ready, 2500); // safety net
  window.addEventListener('pageshow', e => { if (e.persisted) { root.classList.remove('pt-in', 'pt-out'); document.querySelectorAll('.app-open').forEach(n => n.remove()); const pt = document.querySelector('.pt'); if (pt) pt.classList.remove('cover'); } });

  /* ---------------- outgoing page transition ---------------- */
  const pt = document.querySelector('.pt');
  function go(url, colour) {
    if (reduce) { location.href = url; return; }
    store('yw-pt', colour || 'linear-gradient(135deg,#f2549b,#b03fe3 30%,#5a2bd8 55%,#2167f0 78%,#19cfef)');
    if (pt) { pt.style.setProperty('--pt', colour || ''); pt.style.transition = 'opacity .28s ease'; pt.classList.add('cover'); }
    setTimeout(() => { location.href = url; }, 280);
  }
  function isInternalPage(a, e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download') || a.origin !== location.origin) return false;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#') || a.hasAttribute('data-placeholder-link') || a.hasAttribute('data-lightbox')) return false;
    if (a.pathname === location.pathname && a.hash) return false; // same page anchor
    return true;
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a || !isInternalPage(a, e)) return;
    e.preventDefault();
    const ic = a.matches('[data-app]') && a.querySelector('.app-ic');
    const colour = (a.style.getPropertyValue('--c') || '').trim();
    if (ic && motion) { // "open the app": zoom the icon to full screen
      const r = ic.getBoundingClientRect(), o = document.createElement('div');
      o.className = 'app-open';
      Object.assign(o.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', background: colour });
      document.body.appendChild(o);
      store('yw-pt', colour);
      gsap.to(o, { left: 0, top: 0, width: innerWidth, height: innerHeight, borderRadius: 0, duration: .5, ease: 'expo.inOut', onComplete: () => { location.href = a.href; } });
    } else go(a.href, colour);
  });
  document.querySelectorAll('a[data-placeholder-link]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  /* ---------------- header: transparent over the hero, solid after ---------------- */
  const hdr = document.querySelector('.hdr'), hero = document.querySelector('[data-hero]');
  if (hdr && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => hdr.classList.toggle('solid', !en.isIntersecting), { rootMargin: '-64px 0px 0px 0px' }).observe(hero);
  } else if (hdr) hdr.classList.add('solid');

  /* ---------------- status-bar clock ---------------- */
  const ck = document.querySelector('.hdr .clock');
  if (ck) { const t = () => { const d = new Date(); ck.textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }; t(); setInterval(t, 15000); }

  /* ---------------- mobile menu ---------------- */
  const mb = document.querySelector('.menu-btn'), mn = document.querySelector('.mnav');
  const closeMenu = () => { if (!mn) return; mn.classList.remove('open'); document.body.classList.remove('menu-open'); mb.setAttribute('aria-expanded', 'false'); mb.textContent = mb.dataset.open || 'Menu'; };
  if (mb && mn) {
    mb.addEventListener('click', () => {
      const open = mn.classList.toggle('open');
      document.body.classList.toggle('menu-open', open);
      mb.setAttribute('aria-expanded', open); mb.textContent = open ? (mb.dataset.close || 'Close') : (mb.dataset.open || 'Menu');
      if (open) mn.querySelector('a').focus();
    });
    mn.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------------- home: notification banner ---------------- */
  const b = document.getElementById('banner');
  if (b) {
    let shown = false;
    const show = () => { if (shown || scrollY > 80) return; shown = true; b.classList.add('show'); setTimeout(() => b.classList.remove('show'), 7500); };
    b.querySelector('button').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); b.classList.remove('show'); });
    document.addEventListener('yw:ready', () => setTimeout(show, 2200));
    addEventListener('scroll', () => { if (scrollY > 80) b.classList.remove('show'); }, { passive: true });
  }

  /* ---------------- quiz ---------------- */
  document.querySelectorAll('[data-quiz] .q').forEach(q => {
    const fb = q.querySelector('.q-fb');
    q.querySelectorAll('[data-choice]').forEach(btn => {
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        const right = btn.dataset.choice === q.dataset.answer;
        q.querySelectorAll('[data-choice]').forEach(x => { x.setAttribute('aria-pressed', 'false'); x.classList.remove('right', 'wrong'); });
        btn.setAttribute('aria-pressed', 'true'); btn.classList.add(right ? 'right' : 'wrong');
        if (fb) {
          fb.hidden = false;
          let head = fb.querySelector('b.q-res');
          if (!head) { head = document.createElement('b'); head.className = 'q-res'; fb.prepend(head); }
          head.textContent = right ? t('Correct!', 'Dobrze!') : t('Not quite.', 'Niezupełnie.');
          fb.setAttribute('role', 'status');
        }
      });
    });
  });

  /* ---------------- game: two lies, one fact (one or more rounds) ---------------- */
  // colour the card backs: true statements green, lies red (works for "find the fact" and "find the lie")
  document.querySelectorAll('[data-game] .round').forEach(r => {
    const g = r.closest('[data-game]'), mode = r.dataset.find || g.dataset.find || 'fact';
    r.querySelectorAll('.gcard').forEach(c => {
      const isAnswer = c.dataset.choice === r.dataset.answer;
      c.classList.toggle('gcard--good', mode === 'lie' ? !isAnswer : isAnswer);
    });
  });
  document.querySelectorAll('[data-game]').forEach(g => {
    const rounds = [...g.querySelectorAll('.round')], res = g.querySelector('.game-result');
    const verdict = g.querySelector('.game-verdict'), explain = g.querySelector('.game-explain');
    const next = g.querySelector('[data-game-next]'), reset = g.querySelector('[data-game-reset]');
    const rn = g.querySelector('[data-round-n]'), sc = g.querySelector('[data-score]');
    let cur = 0, score = 0;
    const show = i => {
      rounds.forEach((r, k) => r.hidden = k !== i);
      cur = i; res.hidden = true; g.classList.remove('done');
      if (rn) rn.textContent = i + 1;
      if (window.gsap && !reduce && i > 0) gsap.from(rounds[i].querySelectorAll('.gcard'), { y: 30, opacity: 0, duration: .6, ease: 'power3.out', stagger: .08 });
    };
    rounds.forEach((r, ri) => r.querySelectorAll('.gcard').forEach(c => c.addEventListener('click', () => {
      if (ri !== cur || g.classList.contains('done')) return;
      const cards = [...r.querySelectorAll('.gcard')], right = c.dataset.choice === r.dataset.answer;
      g.classList.add('done'); c.classList.add('picked');
      if (right) score++;
      if (sc) sc.textContent = score;
      cards.forEach((x, i) => setTimeout(() => { x.classList.add('flipped'); x.setAttribute('aria-pressed', x === c); }, i * 160));
      const last = ri === rounds.length - 1;
      const mode = r.dataset.find || g.dataset.find || 'fact';
      const ok = [t('Correct!', 'Dobrze!'), t('Not quite.', 'Niezupełnie.')];
      const msg = { fact: [t('Well done! You found the fact.', 'Brawo! To jest fakt.'), t('Not quite. That one was a lie.', 'Niezupełnie. To było kłamstwo.')],
                    lie: [t('Well done! You found the lie.', 'Brawo! To jest kłamstwo.'), t('Not quite. That one is actually true.', 'Niezupełnie. To akurat prawda.')],
                    quiz: ok }[mode] || ok;
      verdict.textContent = (right ? msg[0] : msg[1]) +
        (last && rounds.length > 1 ? t(` Final score: ${score} of ${rounds.length}.`, ` Wynik końcowy: ${score} z ${rounds.length}.`) : '');
      verdict.className = 'game-verdict ' + (right ? 'is-right' : 'is-wrong');
      const ex = r.querySelector('.round-explain');
      explain.innerHTML = ex ? ex.innerHTML : '<p><b>' + t('Correct answer: Statement ', 'Poprawna odpowiedź: zdanie ') + r.dataset.answer.toUpperCase() + '.</b></p>';
      if (next) next.hidden = last;
      reset.hidden = !last;
      setTimeout(() => { res.hidden = false; if (window.gsap && !reduce) gsap.from(res, { y: 20, opacity: 0, duration: .6, ease: 'power3.out' }); }, 600);
    })));
    if (next) next.addEventListener('click', () => { show(cur + 1); rounds[cur].querySelector('.gcard').focus(); });
    reset.addEventListener('click', () => {
      g.querySelectorAll('.gcard').forEach(x => { x.classList.remove('flipped', 'picked'); x.removeAttribute('aria-pressed'); });
      score = 0; if (sc) sc.textContent = 0; show(0); rounds[0].querySelector('.gcard').focus();
    });
    show(0);
  });

  /* ---------------- home: poster widget cycles through every topic poster ---------------- */
  document.querySelectorAll('[data-posters]').forEach(w => {
    const slides = [...w.querySelectorAll('.wp-slide')], dots = [...w.querySelectorAll('.wp-dots i')];
    if (slides.length < 2 || reduce) return;
    let i = 0, paused = false;
    w.addEventListener('pointerenter', () => paused = true); w.addEventListener('pointerleave', () => paused = false);
    w.addEventListener('focusin', () => paused = true); w.addEventListener('focusout', () => paused = false);
    setInterval(() => {
      if (paused || document.hidden) return;
      slides[i].classList.remove('on'); slides[i].setAttribute('tabindex', '-1'); slides[i].setAttribute('aria-hidden', 'true'); dots[i] && dots[i].classList.remove('on');
      i = (i + 1) % slides.length;
      slides[i].classList.add('on'); slides[i].removeAttribute('tabindex'); slides[i].removeAttribute('aria-hidden'); dots[i] && dots[i].classList.add('on');
    }, 4500);
  });

  /* ---------------- interactive checklist ---------------- */
  document.querySelectorAll('[data-checklist]').forEach(list => {
    const out = list.parentElement.querySelector('[data-done]'), boxes = list.querySelectorAll('input');
    const upd = () => { const n = [...boxes].filter(b => b.checked).length; if (out) out.textContent = n; list.parentElement.classList.toggle('all-done', n === boxes.length); };
    boxes.forEach(b => b.addEventListener('change', upd));
  });

  /* ---------------- YouTube: load the player only when asked (privacy + speed) ---------------- */
  document.querySelectorAll('[data-yt]').forEach(box => box.querySelector('a').addEventListener('click', e => {
    e.preventDefault();
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + box.dataset.yt + '?autoplay=1&rel=0';
    f.title = box.querySelector('.yt-title').textContent; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
    box.innerHTML = ''; box.appendChild(f); box.classList.add('playing');
  }));

  /* ---------------- poster lightbox ---------------- */
  document.querySelectorAll('[data-lightbox]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const d = document.createElement('div'); d.className = 'lb'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', t('Poster', 'Plakat'));
    const img = a.querySelector('img');
    d.innerHTML = '<button type="button" class="lb-x" aria-label="' + t('Close', 'Zamknij') + '">×</button><img alt="">';
    d.querySelector('img').src = img.currentSrc || img.src; d.querySelector('img').alt = img.alt;
    const close = () => { d.classList.remove('open'); setTimeout(() => d.remove(), 300); a.focus(); document.removeEventListener('keydown', esc); };
    const esc = ev => { if (ev.key === 'Escape') close(); };
    d.addEventListener('click', ev => { if (ev.target !== d.querySelector('img')) close(); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(d); requestAnimationFrame(() => d.classList.add('open')); d.querySelector('.lb-x').focus();
  }));

  /* ---------------- floating game pill: hide when the game is on screen ---------------- */
  const pill = document.querySelector('.game-pill'), gameSec = document.getElementById('game');
  if (pill && gameSec) {
    // shown while scrolling up (like iOS bars), hidden while reading down or when the game is on screen
    let last = scrollY;
    const upd = () => {
      const y = scrollY, gameTop = gameSec.getBoundingClientRect().top;
      const dir = Math.sign(y - last);  // 1 = down, -1 = up
      if (y < 400 || gameTop < innerHeight) pill.classList.add('hide');
      else if (dir) pill.classList.toggle('hide', dir > 0);
      last = y;
    };
    pill.classList.add('hide');
    addEventListener('scroll', upd, { passive: true });
  }

  /* ---------------- topic: on-page nav highlight ---------------- */
  const chips = [...document.querySelectorAll('.tnav a')];
  if (chips.length && 'IntersectionObserver' in window) {
    const map = new Map(chips.map(c => [c.getAttribute('href').slice(1), c]));
    const io = new IntersectionObserver(ens => ens.forEach(en => {
      if (!en.isIntersecting) return;
      chips.forEach(c => c.classList.remove('on'));
      const c = map.get(en.target.id);
      if (c) { c.classList.add('on'); const box = c.parentElement; box.scrollTo({ left: c.offsetLeft - box.clientWidth / 2 + c.clientWidth / 2, behavior: 'smooth' }); }
    }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.tsec').forEach(s => io.observe(s));
  }

  if (!motion) return;

  /* ================= motion only ================= */
  gsap.registerPlugin(ScrollTrigger);
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({ lerp: .18, wheelMultiplier: 1.15 });
    window.ywLenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href*="#"]').forEach(a => a.addEventListener('click', e => {
      if (a.pathname !== location.pathname) return;
      const t = a.hash && document.querySelector(a.hash); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { offset: a.closest('.tnav') ? -124 : -64 });
      history.replaceState(null, '', a.hash);
    }));
    if (location.hash) { const t = document.querySelector(location.hash); if (t) setTimeout(() => lenis.scrollTo(t, { immediate: true, offset: -64 }), 50); }
  }

  /* split headings into lines that slide up */
  document.querySelectorAll('[data-split] .line').forEach(l => {
    const inner = document.createElement('span'); inner.innerHTML = l.innerHTML;
    l.innerHTML = ''; l.classList.add('split-line'); l.appendChild(inner);
    // background-clip:text must sit on the moving element, or the text vanishes
    if (l.classList.contains('grad-text')) { l.classList.remove('grad-text'); inner.classList.add('grad-text'); }
    gsap.set(inner, { yPercent: 110 });
  });
  document.addEventListener('yw:ready', () => {
    document.querySelectorAll('[data-split]').forEach(h => {
      const lines = h.querySelectorAll('.split-line>span');
      const run = () => gsap.to(lines, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .09 });
      if (h.hasAttribute('data-split-now')) run();
      else ScrollTrigger.create({ trigger: h, start: 'top 95%', once: true, onEnter: run });
    });
  });

  /* 3D flip-up reveal: starts before entering, done by ~60% of the screen */
  gsap.utils.toArray('[data-reveal]').forEach(el => {
    gsap.to(el, { opacity: 1, y: 0, rotateX: 0, duration: .9, ease: 'power3.out', delay: (+el.dataset.delay || 0),
      scrollTrigger: { trigger: el, start: 'top 105%', once: true } });
  });
  /* topic sections: headings + blocks rise in */
  gsap.utils.toArray('.tsec').forEach(s => {
    gsap.from(s.querySelectorAll('.eyebrow,.h-m,.prose,.res-list,.quiz'), { opacity: 0, y: 30, duration: .8, ease: 'power3.out', stagger: .06,
      scrollTrigger: { trigger: s, start: 'top 90%', once: true } });
  });

  /* counters */
  document.querySelectorAll('[data-count]').forEach(el => {
    const end = +el.dataset.count, o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 95%', once: true, onEnter: () =>
      gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => el.textContent = Math.round(o.v) }) });
  });

  /* home: icons spring in like unlocking a phone */
  const pops = gsap.utils.toArray('.home [data-pop], .home .app, .ahero [data-pop]');
  if (pops.length) {
    gsap.set(pops, { opacity: 0, scale: .6, y: 30 });
    if (document.querySelector('.dock')) gsap.set('.dock', { yPercent: 140 });
    document.addEventListener('yw:ready', () => {
      gsap.to(pops, { opacity: 1, scale: 1, y: 0, duration: .9, ease: 'back.out(1.5)', stagger: .04 });
      if (document.querySelector('.dock')) gsap.to('.dock', { yPercent: 0, duration: .9, ease: 'expo.out', delay: .5 });
    });
  }
  /* hero parallax */
  document.querySelectorAll('[data-hero] .wall img').forEach(img =>
    gsap.to(img, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: img.closest('[data-hero]'), start: 'top top', end: 'bottom top', scrub: true } }));
  if (document.querySelector('.home .screen-grid'))
    gsap.to('.home .screen-grid', { scale: .94, opacity: .35, ease: 'none', scrollTrigger: { trigger: '.home', start: 'center center', end: 'bottom top', scrub: true } });
  const glyph = document.querySelector('.thero-bg');
  if (glyph) {
    gsap.from('.thero-ic', { scale: .4, opacity: 0, duration: .9, ease: 'back.out(1.6)', delay: .1 });
    gsap.to(glyph, { yPercent: -30, rotate: 4, ease: 'none', scrollTrigger: { trigger: '.thero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* tilt toward the mouse + light sweep, magnetic buttons (fine pointers only) */
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(c => {
      const max = +c.dataset.tilt || 6;
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        gsap.to(c, { rotateY: (x - .5) * max, rotateX: (.5 - y) * max, transformPerspective: 900, duration: .5, ease: 'power2.out' });
        c.style.setProperty('--mx', (x * 100) + '%'); c.style.setProperty('--my', (y * 100) + '%');
      });
      c.addEventListener('pointerleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: .8, ease: 'power3.out' }));
    });
    document.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * .25, y: (e.clientY - r.top - r.height / 2) * .35, duration: .4, ease: 'power2.out' });
      });
      btn.addEventListener('pointerleave', () => gsap.to(btn, { x: 0, y: 0, duration: .6, ease: 'power3.out' }));
    });
  }
})();
