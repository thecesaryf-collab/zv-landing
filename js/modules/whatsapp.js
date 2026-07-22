/* Floating WhatsApp button. Hidden over the hero; it appears once the pain line
   "Tu negocio pierde dinero cada día por…" rises (a little into the ACT scroll),
   then flashes a text bubble and starts a constant attention-bounce.

   On a phone the link uses the whatsapp:// scheme so it jumps straight into the
   app; on desktop it uses wa.me (opens WhatsApp Web / the desktop app). */
import { onFrame, clamp, prefersReducedMotion } from '../lib/util.js';

const PHONE = '34618313932';   // +34 618 31 39 32

export function initWhatsApp() {
  const wa = document.querySelector('[data-wa]');
  const act = document.querySelector('[data-act]');
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
    setTimeout(() => wa.classList.add('is-open'), 900);
    setTimeout(() => wa.classList.remove('is-open'), 4600);
    if (!prefersReducedMotion) setTimeout(() => wa.classList.add('is-bouncing'), 1600);
  };

  // tapping the bubble area still navigates via the anchor; collapse bubble on first click
  wa.addEventListener('click', () => wa.classList.remove('is-bouncing'));

  // no ACT section (or reduced motion) → just show it
  if (!act || prefersReducedMotion) { activate(); return; }

  // reveal when the ACT scroll passes ~10% (the pain line is rising/wiping in)
  let shown = false;
  onFrame(() => {
    if (shown) return;
    const top = act.getBoundingClientRect().top + window.scrollY;
    const travel = Math.max(1, act.offsetHeight - window.innerHeight);
    const p = clamp((window.scrollY - top) / travel);
    if (p > 0.1) { shown = true; activate(); }
  });
}
