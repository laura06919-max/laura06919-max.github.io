/* SmartCloud page: the tower spine. One lit atrium per floor, windows light up as you read. */
(function () {
  const wrap = document.getElementById('tower');
  const body = wrap && wrap.querySelector('.tower-body');
  if (!body) return;
  const lit = body.querySelector('.tower-lit');
  const floors = [...wrap.querySelectorAll('.floor')];
  const narrow = () => matchMedia('(max-width: 960px)').matches;
  let notches = [];

  function layout() {
    notches.forEach((n) => n.remove());
    const top = body.getBoundingClientRect().top + scrollY;
    notches = floors.map((f) => {
      const n = document.createElement('span');
      n.className = 'notch ' + (narrow() ? 'right' : (f.classList.contains('left') ? 'left' : 'right'));
      // the beam leaves the card 46px down and drops ~29px before meeting the tower edge
      n.style.top = (f.getBoundingClientRect().top + scrollY - top + (narrow() ? 32 : 70)) + 'px';
      body.appendChild(n);
      return n;
    });
    update();
  }
  function update() {
    const r = body.getBoundingClientRect();
    const reach = Math.min(r.height, Math.max(0, innerHeight * 0.55 - r.top));
    lit.style.height = reach + 'px';
    let active = -1;
    floors.forEach((f, i) => { if (f.getBoundingClientRect().top < innerHeight * 0.55) active = i; });
    floors.forEach((f, i) => { f.classList.toggle('on', i === active); notches[i] && notches[i].classList.toggle('on', i <= active); });
  }
  let q = false;
  addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(() => { q = false; update(); }); } }, { passive: true });
  addEventListener('resize', layout);
  addEventListener('load', layout);
  layout();
})();
