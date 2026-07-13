/* Process steps reveal in sequence as they enter view. */
import { prefersReducedMotion } from '../lib/util.js';

export function initProcess() {
  const steps = [...document.querySelectorAll('[data-step]')];
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
