/* Process steps reveal in sequence as they enter view; the closing statement
   "writes itself" left→right, driven by scroll. */
import { onFrame, mapClamp, prefersReducedMotion } from '../lib/util.js';

export function initProcess() {
  const steps = [...document.querySelectorAll('[data-step]')];

  // --- closing statement: scroll-driven left→right wipe (same as the solution
  //     title). It starts writing as it enters the lower viewport and finishes
  //     just past centre, so it reads as it settles into place. ---
  const closer = document.querySelector('[data-closer]');
  if (closer && !prefersReducedMotion) {
    closer.style.setProperty('--closer-wipe', '0');   // hidden until it scrolls up
    onFrame(() => {
      const vh = window.innerHeight;
      const r = closer.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) return;          // skip off-screen work
      closer.style.setProperty('--closer-wipe', mapClamp(r.top, vh * 0.9, vh * 0.42).toFixed(3));
    });
  }

  if (!steps.length) return;
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    steps.forEach(s => s.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const i = steps.indexOf(e.target);
      e.target.style.transitionDelay = `${(i % 4) * 90}ms`;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.35, rootMargin: '0px 0px -10% 0px' });
  steps.forEach(s => io.observe(s));
}
