/* Infinite, scroll-reactive testimonial marquee. Driven in JS so it can
   react to scroll velocity: the faster you scroll the page, the faster
   (and directionally nudged) the cards glide. Pauses on hover.
   Desktop runs HORIZONTAL; on phones it runs VERTICAL (cards drift upward
   inside a masked window) — same engine, just a different axis. */
import { onFrame, lerp, scroll, prefersReducedMotion } from '../lib/util.js';

const mqMobile = window.matchMedia('(max-width: 760px)');

export function initTestimonials() {
  const wrap = document.querySelector('[data-marquee]');
  const track = document.querySelector('[data-marquee-track]');
  if (!wrap || !track) return;

  // duplicate the set so the loop is seamless
  const originals = [...track.children];
  originals.forEach(node => track.appendChild(node.cloneNode(true)));

  let vertical = mqMobile.matches;
  let setSize = 0;   // size (width or height) of one original set incl. the gap
  const measure = () => {
    vertical = mqMobile.matches;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.rowGap || style.columnGap || style.gap || '0') || 0;
    setSize = originals.reduce((s, el) => {
      const r = el.getBoundingClientRect();
      return s + (vertical ? r.height : r.width) + gap;
    }, 0);
  };
  measure();
  if (document.fonts?.ready) document.fonts.ready.then(measure);
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  mqMobile.addEventListener?.('change', measure);

  if (prefersReducedMotion) return;

  let pos = 0;
  const baseSpeed = 32;   // px per second at rest
  let paused = false;
  wrap.addEventListener('pointerenter', () => (paused = true));
  wrap.addEventListener('pointerleave', () => (paused = false));

  let boost = 0; // extra speed from page scroll velocity
  onFrame((dt) => {
    const targetBoost = paused ? 0 : Math.min(260, Math.abs(scroll.velocity) * 14);
    boost = lerp(boost, targetBoost, 0.08);
    const speed = paused ? boost : baseSpeed + boost;
    pos -= speed * dt;
    if (setSize > 0) { while (pos <= -setSize) pos += setSize; } // wrap
    track.style.transform = vertical
      ? `translate3d(0,${pos}px,0)`
      : `translate3d(${pos}px,0,0)`;
  });
}
