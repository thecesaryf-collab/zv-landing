/* Floating WhatsApp button. It stays hidden until the services section enters
   the viewport; then it appears, flashes a text bubble and starts a constant
   attention-bounce.

   On a phone the link uses the whatsapp:// scheme so it jumps straight into the
   app; on desktop it uses wa.me (opens WhatsApp Web / the desktop app). */
import { prefersReducedMotion } from '../lib/util.js';

const PHONE = '34618313932';   // +34 618 31 39 32

export function initWhatsApp() {
  const wa = document.querySelector('[data-wa]');
  const trigger = document.querySelector('[data-services]');
  if (!wa) return;

  // point the link at the app (mobile) or wa.me (desktop)
  const isMobile = window.matchMedia('(max-width: 760px)').matches
    || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    wa.setAttribute('href', `whatsapp://send?phone=${PHONE}`);
    wa.removeAttribute('target');   // custom scheme shouldn't open a blank tab
  } else {
    wa.setAttribute('href', `https://wa.me/${PHONE}`);
  }

  const activate = () => {
    wa.classList.add('is-visible');
    // flash the bubble open for a few seconds, then tuck it away for good
    setTimeout(() => wa.classList.add('is-open'), 500);
    setTimeout(() => wa.classList.remove('is-open'), 4200);
    if (!prefersReducedMotion) setTimeout(() => wa.classList.add('is-bouncing'), 1400);
  };

  if (!trigger || !('IntersectionObserver' in window)) { activate(); return; }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { activate(); io.disconnect(); }
    });
  }, { threshold: 0.2 });
  io.observe(trigger);

  // tapping the bubble area still navigates via the anchor; collapse bubble on first click
  wa.addEventListener('click', () => wa.classList.remove('is-bouncing'));
}
