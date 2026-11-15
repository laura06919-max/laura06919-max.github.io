/* Laura Yuan portfolio — shared behaviour.
   Everything here is an enhancement: with JS off, every word and image is still on the page. */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  /* ---------- hero entrance ---------- */
  const hero = document.querySelector('.hero');
  if (hero) requestAnimationFrame(() => setTimeout(() => hero.classList.add('loaded'), 80));

  /* ---------- reveal once on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('visible'));
  }

  /* ---------- case pages: a ghost number behind each section (background layer) ---------- */
  document.querySelectorAll('.case-body section[data-chapter]').forEach((sec, i) => {
    const g = document.createElement('span');
    g.className = 'par ghost-num ' + (i % 2 ? 'left' : 'right');
    g.dataset.speed = '-0.1'; g.setAttribute('aria-hidden', 'true');
    g.textContent = String(i + 1).padStart(2, '0');
    sec.prepend(g);
  });
  document.querySelectorAll('.case-body section .reveal:not([data-r])').forEach((el, i) => {
    if (el.matches('h2')) el.dataset.r = 'left';
    else if (el.matches('.decision, .notes li, .figure, .two-up, .tldr, .reflection')) el.dataset.r = 'pop';
  });

  /* ---------- stagger: children of [data-stagger] enter one after another ---------- */
  document.querySelectorAll('[data-stagger]').forEach((g) => {
    [...g.querySelectorAll(':scope > .reveal')].forEach((el, i) => { el.style.transitionDelay = (i * 90) + 'ms'; });
  });

  /* ---------- depth: parallax layers + flyers ----------
     Each .par moves relative to its parent section, so nothing reads its own transformed rect. */
  const pars = [...document.querySelectorAll('[data-speed]')];
  const flyers = [...document.querySelectorAll('[data-fly]')];
  if (!reduceMotion && (pars.length || flyers.length)) {
    let queued = false;
    const frame = () => {
      queued = false;
      const vh = innerHeight;
      pars.forEach((el) => {
        const host = el.offsetParent || el.parentElement;
        const r = host.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return;
        const d = (r.top + r.height / 2) - vh / 2;
        const py = Math.max(-140, Math.min(140, -d * parseFloat(el.dataset.speed)));
        el.style.setProperty('--py', py.toFixed(1) + 'px');
      });
      flyers.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height * 0.6)));
        const w = el.offsetWidth;
        el.style.setProperty('--px', (-w + p * (innerWidth + w * 1.2)).toFixed(1) + 'px');
      });
    };
    const req = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); frame();
  }

  /* ---------- hero: layers follow the mouse a little ---------- */
  const heroLayers = document.querySelectorAll('.hero [data-depth]');
  if (heroLayers.length && canHover && !reduceMotion) {
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      heroLayers.forEach((l) => { const k = parseFloat(l.dataset.depth); l.style.translate = `${(x * k).toFixed(1)}px ${(y * k).toFixed(1)}px`; });
    });
  }

  /* ---------- soft cursor glow (native cursor stays) ---------- */
  if (canHover && !reduceMotion) {
    const glow = document.createElement('div');
    glow.className = 'glow'; glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
    let mx = 0, my = 0, gx = 0, gy = 0;
    document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; glow.classList.add('on'); });
    document.addEventListener('mouseleave', () => glow.classList.remove('on'));
    (function loop() { gx += (mx - gx) * 0.14; gy += (my - gy) * 0.14; glow.style.left = gx + 'px'; glow.style.top = gy + 'px'; requestAnimationFrame(loop); })();
    document.addEventListener('mouseover', (e) => { glow.classList.toggle('hovering', !!e.target.closest('a, button, [role="button"]')); });
  }

  /* ---------- story rail: progress + click-to-jump ----------
     Built from every element with [data-chapter]. Desktop: dots on the right.
     Narrow screens: a bar under the nav that opens into a chapter list. */
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  if (chapters.length > 1) {
    const headSrc = document.body.dataset.railHead;
    const rail = document.createElement('nav');
    rail.className = 'rail'; rail.setAttribute('aria-label', 'Page chapters');
    rail.innerHTML = '<div class="rail-track"><div class="rail-fill"></div><div class="rail-head" aria-hidden="true"></div></div><ol></ol>';
    const bar = document.createElement('nav');
    bar.className = 'rail-bar'; bar.setAttribute('aria-label', 'Page chapters');
    bar.innerHTML = '<div class="rail-bar-fill"></div><button type="button" aria-expanded="false"><span class="cur"></span><span aria-hidden="true">☰ chapters</span></button><ol></ol>';
    const railList = rail.querySelector('ol'), barList = bar.querySelector('ol');
    const head = rail.querySelector('.rail-head');
    if (headSrc) { head.classList.add('custom'); head.innerHTML = `<img src="${headSrc}" alt="">`; }

    chapters.forEach((sec, i) => {
      if (!sec.id) sec.id = 'chapter-' + i;
      const label = sec.dataset.chapter;
      railList.insertAdjacentHTML('beforeend', `<li><a href="#${sec.id}"><span class="lbl">${label}</span><span class="dot"></span></a></li>`);
      barList.insertAdjacentHTML('beforeend', `<li><a href="#${sec.id}">${String(i).padStart(2, '0')} · ${label}</a></li>`);
    });
    document.body.appendChild(rail);
    const nav = document.querySelector('.site-nav');
    nav ? nav.after(bar) : document.body.prepend(bar);

    const btn = bar.querySelector('button');
    btn.addEventListener('click', () => { const open = bar.classList.toggle('open'); btn.setAttribute('aria-expanded', open); });
    barList.addEventListener('click', () => { bar.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); });

    const railLinks = [...railList.querySelectorAll('a')], barLinks = [...barList.querySelectorAll('a')];
    const fill = rail.querySelector('.rail-fill'), barFill = bar.querySelector('.rail-bar-fill'), track = rail.querySelector('.rail-track');
    const cur = bar.querySelector('.cur');
    let ticking = false;
    function update() {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      let idx = 0;
      chapters.forEach((s, i) => { if (s.getBoundingClientRect().top <= innerHeight * 0.4) idx = i; });
      // fill reaches the current dot, then creeps toward the next one
      const dots = railLinks.map((a) => a.querySelector('.dot'));
      const tr = track.getBoundingClientRect();
      const y = (d) => { const r = d.getBoundingClientRect(); return r.top + r.height / 2 - tr.top; };
      const a = chapters[idx], b = chapters[idx + 1];
      let local = 0;
      if (b) { const top = a.getBoundingClientRect().top - innerHeight * 0.4, span = b.offsetTop - a.offsetTop; local = Math.min(1, Math.max(0, -top / span)); }
      const yA = y(dots[idx]), yB = b ? y(dots[idx + 1]) : yA;
      const h = idx === chapters.length - 1 && p > 0.995 ? tr.height : yA + (yB - yA) * local;
      fill.style.height = h + 'px'; head.style.top = h + 'px';
      barFill.style.width = (p * 100) + '%';
      railLinks.forEach((l, i) => { l.classList.toggle('current', i === idx); l.classList.toggle('done', i < idx); l.toggleAttribute('aria-current', i === idx); });
      barLinks.forEach((l, i) => l.classList.toggle('current', i === idx));
      cur.textContent = String(idx).padStart(2, '0') + ' · ' + chapters[idx].dataset.chapter;
      document.dispatchEvent(new CustomEvent('chapterprogress', { detail: { index: idx, progress: p } }));
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------- art filter + flip book (home page only) ---------- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach((b) => b.addEventListener('click', () => {
    filterBtns.forEach((x) => x.setAttribute('aria-pressed', x === b));
    document.querySelectorAll('.art-card').forEach((c) => { c.hidden = !(b.dataset.filter === 'all' || c.dataset.medium === b.dataset.filter); });
  }));

  const viewer = document.getElementById('bookViewer');
  if (viewer) {
    const cards = [...document.querySelectorAll('.art-card')];
    const stage = viewer.querySelector('.book-stage');
    const counter = viewer.querySelector('.book-count');
    let page = 0, pages = [], lastFocus = null;
    cards.forEach((c) => {
      const img = c.querySelector('img');
      const fig = document.createElement('figure');
      fig.className = 'book-page';
      fig.innerHTML = `<img src="${img.getAttribute('src')}" alt="${img.alt}"><figcaption><b>${c.querySelector('.art-title').textContent}</b><span>${c.querySelector('.art-medium').textContent}</span></figcaption>`;
      stage.appendChild(fig); pages.push(fig);
    });
    function render() {
      pages.forEach((p, i) => { p.classList.toggle('flipped', i < page); p.style.zIndex = i < page ? i : pages.length - i; p.setAttribute('aria-hidden', i !== page); });
      counter.textContent = `${page + 1} / ${pages.length}`;
    }
    function open(i) { lastFocus = document.activeElement; page = i; render(); viewer.classList.add('open'); document.body.style.overflow = 'hidden'; viewer.querySelector('.book-close').focus(); }
    function close() { viewer.classList.remove('open'); document.body.style.overflow = ''; lastFocus && lastFocus.focus(); }
    cards.forEach((c, i) => c.addEventListener('click', () => open(i)));
    document.querySelector('[data-open-book]')?.addEventListener('click', () => open(0));
    viewer.querySelector('.book-close').addEventListener('click', close);
    viewer.querySelector('[data-prev]').addEventListener('click', () => { if (page > 0) { page--; render(); } });
    viewer.querySelector('[data-next]').addEventListener('click', () => { if (page < pages.length - 1) { page++; render(); } });
    viewer.addEventListener('click', (e) => { if (e.target === viewer) close(); });
    document.addEventListener('keydown', (e) => {
      if (!viewer.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' && page < pages.length - 1) { page++; render(); }
      if (e.key === 'ArrowLeft' && page > 0) { page--; render(); }
    });
  }

  /* ---------- footer clock ---------- */
  const clock = document.getElementById('laJollaTime');
  if (clock) {
    const tick = () => { clock.textContent = "it's " + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }) + ' in La Jolla right now'; };
    tick(); setInterval(tick, 30000);
  }
})();
