/* Floating WhatsApp button. It stays hidden until the "Opiniones" section
   enters the viewport; then it appears, slides out a text bubble and starts
   a constant attention-bounce. */
import { prefersReducedMotion } from '../lib/util.js';

export function initWhatsApp() {
  const wa = document.querySelector('[data-wa]');
  const voices = document.querySelector('[data-voices]');
  if (!wa) return;

  const activate = () => {
    wa.classList.add('is-visible');
    // flash the bubble open for a few seconds, then tuck it away for good
    setTimeout(() => wa.classList.add('is-open'), 500);
    setTimeout(() => wa.classList.remove('is-open'), 4200);
    if (!prefersReducedMotion) setTimeout(() => wa.classList.add('is-bouncing'), 1400);
  };

  if (!voices || !('IntersectionObserver' in window)) { activate(); return; }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { activate(); io.disconnect(); }
    });
  }, { threshold: 0.2 });
  io.observe(voices);

  // tapping the bubble area still navigates via the anchor; collapse bubble on first click
  wa.addEventListener('click', () => wa.classList.remove('is-bouncing'));
}
