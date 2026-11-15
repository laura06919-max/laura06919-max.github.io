/* Background Noise: a synthesized field recording.
   Wind, crickets and frogs make the "background noise"; a bird sings now and then, buried in it.
   Everything is generated with the Web Audio API (no audio files). Browsers only allow sound
   after a click, so it starts from the button, and it can always be paused. */
(function () {
  const root = document.getElementById('field');
  if (!root) return;
  const btn = root.querySelector('[data-play]');
  const iso = root.querySelector('[data-isolate]');
  const canvas = root.querySelector('canvas');
  const sliders = [...root.querySelectorAll('input[type=range]')];
  const status = root.querySelector('[data-status]');
  let ctx, master, an, layers = {}, timers = [], running = false, isolated = false;

  function noiseBuffer(c) {
    const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.7;
    an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.2;
    master.connect(an); an.connect(ctx.destination);
    const nb = noiseBuffer(ctx);
    const layer = (name, v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(master); layers[name] = { g, base: v }; return g; };

    // wind: low rumbling noise that swells slowly
    const wind = layer('wind', 0.35);
    const ws = ctx.createBufferSource(); ws.buffer = nb; ws.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.4;
    const swell = ctx.createGain(); swell.gain.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.4;
    lfo.connect(lfoAmt); lfoAmt.connect(swell.gain); ws.connect(lp); lp.connect(swell); swell.connect(wind); ws.start(); lfo.start();
    // a faint high hiss on top (leaves, distant water)
    const hs = ctx.createBufferSource(); hs.buffer = nb; hs.loop = true; hs.playbackRate.value = 0.97;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const hg = ctx.createGain(); hg.gain.value = 0.05; hs.connect(hp); hp.connect(hg); hg.connect(wind); hs.start();

    // crickets: high tones gated into fast pulses, grouped into chirps
    const crickets = layer('crickets', 0.12);
    [[4400, 32, 2.3], [5100, 27, 1.7]].forEach(([f, pulse, chirp]) => {
      const o = ctx.createOscillator(); o.frequency.value = f;
      const g1 = ctx.createGain(); g1.gain.value = 0; const g2 = ctx.createGain(); g2.gain.value = 0;
      const p = ctx.createOscillator(); p.type = 'square'; p.frequency.value = pulse; const pa = ctx.createGain(); pa.gain.value = 0.5; p.connect(pa); pa.connect(g1.gain);
      const c = ctx.createOscillator(); c.type = 'square'; c.frequency.value = chirp; const ca = ctx.createGain(); ca.gain.value = 0.5; c.connect(ca); ca.connect(g2.gain);
      const off1 = ctx.createConstantSource(); off1.offset.value = 0.5; off1.connect(g1.gain); off1.start();
      const off2 = ctx.createConstantSource(); off2.offset.value = 0.5; off2.connect(g2.gain); off2.start();
      o.connect(g1); g1.connect(g2); g2.connect(crickets); o.start(); p.start(); c.start();
    });

    // frogs + bird are scheduled events
    layer('frogs', 0.5);
    layer('bird', 0.5);
    schedule();
  }
  function croak() {
    const t = ctx.currentTime, out = layers.frogs.g;
    const f0 = 260 + Math.random() * 120;
    for (let k = 0; k < 2; k++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f0 * 2; bp.Q.value = 6;
      const g = ctx.createGain(); const s = t + k * 0.16;
      o.frequency.setValueAtTime(f0, s); o.frequency.linearRampToValueAtTime(f0 * 0.82, s + 0.12);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.5, s + 0.02); g.gain.exponentialRampToValueAtTime(0.001, s + 0.13);
      o.connect(bp); bp.connect(g); g.connect(out); o.start(s); o.stop(s + 0.15);
    }
  }
  function song() {
    const out = layers.bird.g; let t = ctx.currentTime + 0.05;
    const notes = 3 + Math.floor(Math.random() * 4), base = 2600 + Math.random() * 600;
    for (let k = 0; k < notes; k++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      const up = k % 2 === 0, dur = 0.09 + Math.random() * 0.06, f = base + k * 120;
      o.frequency.setValueAtTime(up ? f : f * 1.5, t); o.frequency.exponentialRampToValueAtTime(up ? f * 1.55 : f * 0.95, t + dur);
      const vib = ctx.createOscillator(), va = ctx.createGain(); vib.frequency.value = 38; va.gain.value = 60; vib.connect(va); va.connect(o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(out); o.start(t); vib.start(t); o.stop(t + dur + 0.02); vib.stop(t + dur + 0.02);
      t += dur + 0.04 + Math.random() * 0.05;
    }
  }
  function schedule() {
    const loop = (fn, min, max) => { const tick = () => { if (running) fn(); timers.push(setTimeout(tick, min + Math.random() * (max - min))); }; timers.push(setTimeout(tick, min)); };
    loop(croak, 1200, 3400);
    loop(song, 2500, 6500);
  }
  function setLevel(name, v, ramp = 0.6) {
    const L = layers[name]; if (!L) return;
    L.g.gain.cancelScheduledValues(ctx.currentTime);
    L.g.gain.setTargetAtTime(v, ctx.currentTime, ramp / 3);
  }
  function applyMix() {
    sliders.forEach((s) => {
      const name = s.dataset.layer, v = (+s.value / 100) * layers[name].base * 2;
      setLevel(name, isolated && name !== 'bird' ? v * 0.06 : (isolated && name === 'bird' ? v * 1.6 : v));
    });
  }

  // spectrogram: time scrolls left, pitch goes up; the bird shows as bright upward strokes
  const g2d = canvas.getContext('2d');
  function draw() {
    if (!running) return;
    requestAnimationFrame(draw);
    const w = canvas.width, h = canvas.height, data = new Uint8Array(an.frequencyBinCount);
    an.getByteFrequencyData(data);
    g2d.drawImage(canvas, -2, 0);
    const bins = Math.floor(data.length * 0.62); // up to ~6.8 kHz
    for (let y = 0; y < h; y++) {
      const v = data[Math.floor((1 - y / h) * bins)] / 255;
      g2d.fillStyle = `hsl(${212 - v * 172}, ${45 + v * 45}%, ${9 + v * 60}%)`;
      g2d.fillRect(w - 2, y, 2, 1);
    }
  }
  function sizeCanvas() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    g2d.fillStyle = '#0f1a24'; g2d.fillRect(0, 0, canvas.width, canvas.height);
  }
  sizeCanvas(); addEventListener('resize', sizeCanvas);

  btn.addEventListener('click', async () => {
    if (!ctx) build();
    running = !running;
    if (running) { await ctx.resume(); applyMix(); draw(); } else { await ctx.suspend(); }
    btn.setAttribute('aria-pressed', running);
    btn.querySelector('span').textContent = running ? 'Pause the field' : 'Hear the field';
    root.classList.toggle('playing', running);
    status.textContent = running ? 'Playing: wind, crickets, frogs, and a bird somewhere in there.' : 'Paused.';
  });
  iso.addEventListener('click', () => {
    isolated = !isolated; iso.setAttribute('aria-pressed', isolated);
    iso.textContent = isolated ? 'Bring the noise back' : 'Isolate the bird';
    if (ctx) applyMix();
    status.textContent = isolated ? 'Noise turned down: this is what the model has to find.' : 'Full mix: this is what the microphone actually records.';
  });
  sliders.forEach((s) => s.addEventListener('input', () => { if (ctx) applyMix(); }));
  document.addEventListener('visibilitychange', () => { if (ctx && running) (document.hidden ? ctx.suspend() : ctx.resume()); });
})();
