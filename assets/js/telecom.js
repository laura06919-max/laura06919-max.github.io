/* SmartCloud page: scroll-driven camera over the drawn tower.
   Overview → zoom into atrium 1 → glide to atrium 2 → … → pull back out after the last floor.
   Each atrium's painted close-up fades in as the camera arrives. */
(function () {
  const stage = document.querySelector('.tz-stage');
  if (!stage || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const camera = stage.querySelector('.tz-camera');
  const tower = stage.querySelector('.tz-tower');
  const atria = [...stage.querySelectorAll('.atrium')];
  const steps = [...document.querySelectorAll('.tz-steps .step')];
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  function overview(vw, vh) {
    const W = tower.offsetWidth, H = tower.offsetHeight;
    return { s: Math.min((vh * 0.84) / H, (vw * 0.5) / W), px: W / 2, py: H / 2, X: vw / 2, Y: vh / 2 };
  }
  function target(i, vw, vh) {
    const a = atria[i];
    const px = a.offsetLeft + a.offsetWidth / 2, py = a.offsetTop + a.offsetHeight / 2;
    const narrow = vw < 760;
    const s = narrow ? Math.min((vw * 0.8) / a.offsetWidth, (vh * 0.3) / a.offsetHeight)
                     : Math.min((vw * 0.46) / a.offsetWidth, (vh * 0.8) / a.offsetHeight);
    const X = narrow ? vw / 2 : (a.classList.contains('left') ? vw * 0.3 : vw * 0.7);
    const Y = narrow ? vh * 0.2 : vh / 2;
    return { s, px, py, X, Y };
  }
  function mix(A, B, t) {
    return { s: Math.exp(lerp(Math.log(A.s), Math.log(B.s), t)), px: lerp(A.px, B.px, t), py: lerp(A.py, B.py, t), X: lerp(A.X, B.X, t), Y: lerp(A.Y, B.Y, t) };
  }
  function frame() {
    const vw = stage.clientWidth, vh = innerHeight;
    const O = overview(vw, vh);
    // how far each step's arrival has progressed: starts when its top hits 90% of the screen, done at 35%
    const z = steps.map((st) => clamp((vh * 0.9 - st.getBoundingClientRect().top) / (vh * 0.55)));
    let cur = -1; z.forEach((v, i) => { if (v > 0) cur = i; });
    let cam;
    if (cur < 0) cam = O;
    else cam = mix(cur === 0 ? O : target(cur - 1, vw, vh), target(cur, vw, vh), ease(z[cur]));
    // after the last floor, pull back out to the whole tower
    const last = steps[steps.length - 1].getBoundingClientRect();
    const out = clamp((vh * 0.5 - last.bottom) / (vh * 0.5));
    if (out > 0) cam = mix(target(steps.length - 1, vw, vh), O, ease(out));
    camera.style.transform = `translate(${(cam.X - cam.s * cam.px).toFixed(1)}px, ${(cam.Y - cam.s * cam.py).toFixed(1)}px) scale(${cam.s.toFixed(4)})`;
    atria.forEach((a, i) => {
      let r = 0;
      if (i === cur) r = ease(z[i]) * (1 - out);
      if (i === cur - 1) r = 1 - ease(z[cur]);
      a.style.setProperty('--reveal', r.toFixed(3));
    });
    steps.forEach((st, i) => st.classList.toggle('on', i === cur && out < 1));
  }
  let q = false;
  const req = () => { if (!q) { q = true; requestAnimationFrame(() => { q = false; frame(); }); } };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  addEventListener('load', frame);
  frame();
})();
