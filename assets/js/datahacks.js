/* DataHacks case study interactions. All content is in the HTML; this only adds behaviour. */
(function () {
  const IMG = '../assets/img/datahacks/';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const POSES = ['standing', 'blinking', 'waving', 'talking'];
  const WINGS = ['green', 'lava', 'orange', 'ender'];
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable: fine */ } },
  };

  // preload every frame so pose swaps never flash
  WINGS.forEach((w) => POSES.forEach((p) => { const i = new Image(); i.src = `${IMG}dyno-${w}-${p}.webp`; }));

  /* ---------- interactive Dyno ---------- */
  const dyno = document.getElementById('dyno');
  const bubble = document.getElementById('dynoBubble');
  const frames = dyno ? [...dyno.querySelectorAll('img')] : [];
  let wing = store.get('dh-wing') || 'green';
  let pose = 'standing', hovering = false, talkTimer = null, lineIdx = 0;
  const lines = [
    "Hi! I'm Dyno. In the real form I only show up once, on the long-answer step.",
    'Psst. My blink, wave and talk got cut from the launch. They live here now.',
    'Try the wing swatches under me. Laura painted four colors.',
    'Scroll down and click the numbered dots on the screens. Each one is a decision.',
    "See the little me on the progress rail? That's the progress-bar idea, working.",
  ];
  function setPose(p) { pose = p; frames.forEach((f) => f.classList.toggle('show', f.dataset.pose === p)); }
  function setWing(w) {
    wing = w; store.set('dh-wing', w);
    document.querySelectorAll('img[data-pose]').forEach((img) => { img.src = `${IMG}dyno-${w}-${img.dataset.pose}.webp`; });
    const head = document.querySelector('.rail-head img');
    if (head) head.src = `${IMG}dyno-${w}-standing.webp`;
    document.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-pressed', s.dataset.wing === w));
  }
  if (dyno) {
    setWing(wing);
    const rest = () => setPose(hovering ? 'waving' : 'standing');
    dyno.addEventListener('pointerenter', () => { hovering = true; if (pose !== 'talking') setPose('waving'); });
    dyno.addEventListener('pointerleave', () => { hovering = false; if (pose !== 'talking') setPose('standing'); });
    dyno.addEventListener('focus', () => { if (pose !== 'talking') setPose('waving'); });
    dyno.addEventListener('blur', () => { if (pose !== 'talking') setPose('standing'); });
    dyno.addEventListener('click', () => {
      clearTimeout(talkTimer);
      setPose('talking');
      bubble.textContent = lines[lineIdx++ % lines.length];
      bubble.classList.add('show');
      if (!reduceMotion) { dyno.classList.remove('hop'); void dyno.offsetWidth; dyno.classList.add('hop'); }
      talkTimer = setTimeout(() => { bubble.classList.remove('show'); rest(); }, 3600);
    });
    document.querySelectorAll('.swatch').forEach((s) => s.addEventListener('click', () => setWing(s.dataset.wing)));
    // idle blink loop
    if (!reduceMotion) {
      (function blink() {
        setTimeout(() => {
          if (pose === 'standing') { setPose('blinking'); setTimeout(() => { if (pose === 'blinking') setPose('standing'); }, 150); }
          blink();
        }, 2200 + Math.random() * 2800);
      })();
    }
  }

  /* ---------- screen explorer: tabs + hotspots ---------- */
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(t, focus) {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
  }
  tabs.forEach((t, i) => {
    t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') selectTab(tabs[(i + 1) % tabs.length], true);
      if (e.key === 'ArrowLeft') selectTab(tabs[(i - 1 + tabs.length) % tabs.length], true);
    });
  });
  document.querySelectorAll('.explorer-panel').forEach((panel) => {
    const dots = [...panel.querySelectorAll('.hotspot')], notes = [...panel.querySelectorAll('.notes li')];
    const activate = (n) => { dots.forEach((d, i) => d.classList.toggle('active', i === n)); notes.forEach((l, i) => l.classList.toggle('active', i === n)); };
    dots.forEach((d, i) => { d.addEventListener('click', () => activate(i)); d.addEventListener('mouseenter', () => activate(i)); d.addEventListener('focus', () => activate(i)); });
    notes.forEach((l, i) => l.addEventListener('mouseenter', () => activate(i)));
  });

  /* ---------- status switcher ---------- */
  const segBtns = document.querySelectorAll('.seg button');
  segBtns.forEach((b) => b.addEventListener('click', () => {
    segBtns.forEach((x) => x.setAttribute('aria-pressed', x === b));
    document.querySelectorAll('.state-view figure').forEach((f) => f.classList.toggle('on', f.dataset.state === b.dataset.state));
  }));

  /* ---------- logo output toggle (color / black-and-white print) ---------- */
  const logoBtns = document.querySelectorAll('[data-logo]:is(button)');
  logoBtns.forEach((b) => b.addEventListener('click', () => {
    logoBtns.forEach((x) => x.setAttribute('aria-pressed', x === b));
    document.querySelectorAll('.logo-stage img[data-logo]').forEach((im) => im.classList.toggle('on', im.dataset.logo === b.dataset.logo));
  }));

  /* ---------- peelable stickers ----------
     A sticker lives in its slot (on the sheet or a prop card) or is "placed" in #sticker-layer
     at page coordinates (x stored as % of page width so it survives resizes).
     Stateful stickers (chest, ore) switch state on click, both in the slot and once placed. */
  const layer = document.getElementById('sticker-layer');
  const sheet = document.getElementById('stickerSheet');
  if (!layer || !sheet) return;
  const stickers = [...document.querySelectorAll('.sticker')];
  const slots = new Map(stickers.map((s) => [s.dataset.id, s.parentElement]));
  const homes = new Map(stickers.map((s) => [s.dataset.id, s.closest('.sticker-home, #stickerSheet')]));
  const countEl = document.getElementById('stickerCount');
  let saved = store.get('dh-stickers') || {};
  const states = store.get('dh-sticker-states') || {};

  function setState(st, idx, animate) {
    const list = st.dataset.states.split(','), imgs = [...st.querySelectorAll('img')];
    idx = idx % list.length;
    st.dataset.stateIdx = idx;
    imgs.forEach((im, i) => im.classList.toggle('on', i === idx));
    const label = document.querySelector(`.state[data-for="${st.dataset.id}"]`);
    if (label) label.textContent = list[idx];
    st.setAttribute('aria-label', `${st.dataset.name} sticker, ${list[idx]}. Press to change state, drag to stick it anywhere.`);
    states[st.dataset.id] = idx; store.set('dh-sticker-states', states);
    if (animate && !reduceMotion) { st.classList.remove('pop'); void st.offsetWidth; st.classList.add('pop'); }
  }
  stickers.filter((s) => s.dataset.states).forEach((s) => setState(s, states[s.dataset.id] || 0));

  function updateCount() {
    const left = stickers.filter((s) => homes.get(s.dataset.id) === sheet && !s.classList.contains('placed')).length;
    countEl.textContent = left ? `${left} sticker${left > 1 ? 's' : ''} left on the sheet` : 'Sheet empty. Nice work.';
    slots.forEach((slot) => slot.classList.toggle('empty', !slot.querySelector('.sticker')));
  }
  function place(st, xPct, y, rot) {
    st.classList.add('placed');
    const half = st.classList.contains('stateful') ? 70 : 60;
    st.style.left = `calc(${xPct}% - ${half}px)`; st.style.top = (y - half) + 'px';
    st.style.transform = `rotate(${rot}deg)`;
    layer.appendChild(st);
    if (!st.dataset.states) st.setAttribute('aria-label', st.getAttribute('aria-label').replace(/^Sticker:/, 'Placed sticker:'));
    saved[st.dataset.id] = { x: xPct, y, r: rot }; store.set('dh-stickers', saved);
    updateCount();
  }
  function unplace(st) {
    st.classList.remove('placed', 'dragging');
    st.style.left = st.style.top = st.style.transform = '';
    slots.get(st.dataset.id).appendChild(st);
    if (!st.dataset.states) st.setAttribute('aria-label', st.getAttribute('aria-label').replace(/^Placed sticker:/, 'Sticker:'));
    delete saved[st.dataset.id]; store.set('dh-stickers', saved);
    updateCount();
  }
  const pageW = () => document.documentElement.clientWidth;
  const rnd = () => Math.round(Math.random() * 24 - 12);

  const maxY = document.documentElement.scrollHeight - 40;
  stickers.forEach((st) => { const s = saved[st.dataset.id]; if (s && s.y > 0 && s.y < maxY && s.x >= 0 && s.x <= 100) place(st, s.x, s.y, s.r); else if (s) { delete saved[st.dataset.id]; store.set('dh-stickers', saved); } });
  updateCount();

  /* Dragging: listeners live on window, not the sticker. Moving the sticker into the layer
     re-parents it, which makes the browser drop pointer capture; with element-level listeners
     the drag then never ended and the sticker chased the cursor ("missing", laggy). */
  let drag = null, raf = 0;
  function moveTo(st, x, y) { st.style.left = (x - st.offsetWidth / 2) + 'px'; st.style.top = (y - st.offsetHeight / 2) + 'px'; }
  function onMove(e) {
    if (!drag) return;
    if (e.buttons === 0) return endDrag(e); // button released outside the window
    const { st } = drag;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      drag.moved = true;
      if (!st.classList.contains('placed')) { st.classList.add('placed'); layer.appendChild(st); updateCount(); }
      st.classList.add('dragging');
      st.style.transform = 'rotate(0deg) scale(1.1)';
    }
    drag.x = e.clientX + scrollX - drag.offX; drag.y = e.clientY + scrollY - drag.offY;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (drag) moveTo(drag.st, drag.x, drag.y); });
  }
  function endDrag(e) {
    if (!drag) return;
    const { st, moved } = drag; drag = null;
    removeEventListener('pointermove', onMove); removeEventListener('pointerup', endDrag); removeEventListener('pointercancel', endDrag);
    st.classList.remove('dragging');
    if (!moved) return; // a plain click: handled by the click listener
    st.dataset.dragEnd = Date.now();
    const hr = homes.get(st.dataset.id).getBoundingClientRect();
    const x = e.clientX ?? 0, y = e.clientY ?? 0;
    if (e.type !== 'pointercancel' && x > hr.left && x < hr.right && y > hr.top && y < hr.bottom) { unplace(st); return; }
    const r = st.getBoundingClientRect();
    // keep it on the page even if dropped near an edge
    const cx = Math.min(Math.max(r.left + r.width / 2, 40), innerWidth - 40) + scrollX;
    place(st, (cx / pageW()) * 100, r.top + r.height / 2 + scrollY, rnd());
  }
  stickers.forEach((st) => {
    st.addEventListener('dragstart', (e) => e.preventDefault());
    st.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || drag) return;
      e.preventDefault();
      const r = st.getBoundingClientRect();
      drag = { st, sx: e.clientX, sy: e.clientY, moved: false, offX: e.clientX - r.left - r.width / 2, offY: e.clientY - r.top - r.height / 2 };
      addEventListener('pointermove', onMove, { passive: true });
      addEventListener('pointerup', endDrag);
      addEventListener('pointercancel', endDrag);
    });
    st.addEventListener('click', () => {
      if (Date.now() - (+st.dataset.dragEnd || 0) < 250) return; // the click that ends a drag
      if (st.dataset.states) { setState(st, +st.dataset.stateIdx + 1, true); return; }
      // plain stickers: sheet → a random spot in view; placed → back to the sheet
      if (st.classList.contains('placed')) { unplace(st); st.focus(); return; }
      place(st, 12 + Math.random() * 76, scrollY + innerHeight * (0.2 + Math.random() * 0.5), rnd()); st.focus();
    });
  });
  document.getElementById('stickerReset').addEventListener('click', () => {
    if (drag) { drag.st.classList.remove('dragging'); drag = null; }
    stickers.forEach((st) => { if (st.classList.contains('placed')) unplace(st); st.style.transform = ''; if (st.dataset.states) setState(st, 0); });
    saved = {}; store.set('dh-stickers', saved);
  });
})();
