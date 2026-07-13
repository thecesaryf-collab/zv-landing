/* Shared low-level helpers: math, a single rAF loop, and scroll state.
   Keeping ONE requestAnimationFrame loop for the whole page avoids the
   jank of many competing loops. */

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/* Map x from [inMin,inMax] into [outMin,outMax], clamped. */
export const mapClamp = (x, inMin, inMax, outMin = 0, outMax = 1) =>
  clamp((x - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;

export const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- single shared animation loop ---- */
const frameCbs = new Set();
let running = false;
let last = performance.now();

function tick(now) {
  const dt = Math.min(0.064, (now - last) / 1000); // clamp dt on tab-refocus
  last = now;
  for (const cb of frameCbs) cb(dt, now);
  if (frameCbs.size) requestAnimationFrame(tick);
  else running = false;
}

export function onFrame(cb) {
  frameCbs.add(cb);
  if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
  return () => frameCbs.delete(cb);
}

/* ---- shared scroll state (read-only for modules) ---- */
export const scroll = { y: window.scrollY, prev: window.scrollY, velocity: 0 };
let scrollQueued = false;
function readScroll() {
  scroll.prev = scroll.y;
  scroll.y = window.scrollY;
  scroll.velocity = scroll.y - scroll.prev;
  scrollQueued = false;
}
window.addEventListener('scroll', () => {
  if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(readScroll); }
}, { passive: true });

/* Convenience: reveal elements when they enter the viewport. */
export function revealOnView(selector, { threshold = 0.2, once = true, cls = 'is-in' } = {}) {
  const els = [...document.querySelectorAll(selector)];
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add(cls)); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add(cls); if (once) io.unobserve(e.target); }
      else if (!once) e.target.classList.remove(cls);
    });
  }, { threshold, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
  return io;
}
