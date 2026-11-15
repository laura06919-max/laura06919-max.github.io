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

  /* ---------- props with states ---------- */
  document.querySelectorAll('.prop').forEach((p) => {
    const states = p.dataset.states.split(','), imgs = [...p.querySelectorAll('.art img')], label = p.querySelector('.state');
    const name = p.querySelector('.nm').textContent;
    let s = 0;
    p.addEventListener('click', () => {
      s = (s + 1) % states.length;
      imgs.forEach((im, i) => im.classList.toggle('on', i === s));
      label.textContent = states[s];
      p.setAttribute('aria-label', `${name}, ${states[s]}. Press to change.`);
      if (!reduceMotion) { p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop'); }
    });
  });

  /* ---------- peelable stickers ----------
     A sticker lives either in its slot on the sheet, or "placed" in #sticker-layer
     at page coordinates (x stored as % of page width so it survives resizes). */
  const layer = document.getElementById('sticker-layer');
  const sheet = document.getElementById('stickerSheet');
  if (!layer || !sheet) return;
  const stickers = [...sheet.querySelectorAll('.sticker')];
  const slots = new Map(stickers.map((s) => [s.dataset.id, s.parentElement]));
  const countEl = document.getElementById('stickerCount');
  let saved = store.get('dh-stickers') || {};

  function updateCount() {
    const left = stickers.filter((s) => !s.classList.contains('placed')).length;
    countEl.textContent = left ? `${left} sticker${left > 1 ? 's' : ''} left on the sheet` : 'Sheet empty. Nice work.';
    slots.forEach((slot, id) => slot.classList.toggle('empty', !slot.querySelector('.sticker')));
  }
  function place(st, xPct, y, rot) {
    st.classList.add('placed');
    st.style.left = `calc(${xPct}% - 60px)`; st.style.top = (y - 60) + 'px';
    st.style.transform = `rotate(${rot}deg)`;
    st.dataset.rot = rot;
    layer.appendChild(st);
    st.setAttribute('aria-label', st.getAttribute('aria-label').replace(/^Sticker:/, 'Placed sticker:') );
    saved[st.dataset.id] = { x: xPct, y, r: rot }; store.set('dh-stickers', saved);
    updateCount();
  }
  function unplace(st) {
    st.classList.remove('placed', 'dragging');
    st.style.left = st.style.top = st.style.transform = '';
    slots.get(st.dataset.id).appendChild(st);
    st.setAttribute('aria-label', st.getAttribute('aria-label').replace(/^Placed sticker:/, 'Sticker:'));
    delete saved[st.dataset.id]; store.set('dh-stickers', saved);
    updateCount();
  }
  const pageW = () => document.documentElement.clientWidth;
  const rnd = () => Math.round(Math.random() * 24 - 12);

  // restore
  stickers.forEach((st) => { const s = saved[st.dataset.id]; if (s) place(st, s.x, s.y, s.r); });
  updateCount();

  stickers.forEach((st) => {
    let drag = null;
    st.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const r = st.getBoundingClientRect();
      drag = { sx: e.clientX, sy: e.clientY, moved: false, offX: e.clientX - r.left - r.width / 2, offY: e.clientY - r.top - r.height / 2 };
      st.setPointerCapture(e.pointerId);
    });
    st.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
      if (!drag.moved) {
        drag.moved = true;
        if (!st.classList.contains('placed')) { st.classList.add('placed'); layer.appendChild(st); updateCount(); }
        st.classList.add('dragging');
      }
      const x = e.clientX + scrollX - drag.offX, y = e.clientY + scrollY - drag.offY;
      st.style.left = (x - 60) + 'px'; st.style.top = (y - 60) + 'px';
      st.style.transform = 'rotate(0deg) scale(1.12)';
    });
    st.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const moved = drag.moved; drag = null;
      st.classList.remove('dragging');
      if (!moved) return; // treated as a click below
      const sr = sheet.getBoundingClientRect();
      const overSheet = e.clientX > sr.left && e.clientX < sr.right && e.clientY > sr.top && e.clientY < sr.bottom;
      if (overSheet) { unplace(st); return; }
      const r = st.getBoundingClientRect();
      const cx = r.left + r.width / 2 + scrollX, cy = r.top + r.height / 2 + scrollY;
      place(st, (cx / pageW()) * 100, cy, rnd());
      st.dataset.justDragged = '1';
    });
    st.addEventListener('pointercancel', () => { drag = null; st.classList.remove('dragging'); });
    // click / Enter: sheet → a random spot in view; placed → back to the sheet
    st.addEventListener('click', () => {
      if (st.dataset.justDragged) { delete st.dataset.justDragged; return; }
      if (st.classList.contains('placed')) { unplace(st); st.focus(); return; }
      const x = 12 + Math.random() * 76, y = scrollY + innerHeight * (0.2 + Math.random() * 0.5);
      place(st, x, y, rnd()); st.focus();
    });
  });
  document.getElementById('stickerReset').addEventListener('click', () => {
    stickers.filter((s) => s.classList.contains('placed')).forEach(unplace);
  });
})();
