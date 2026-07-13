/* Hero ticker.
   DESKTOP: the WHOLE "Más + word" scales as ONE unit to a FIXED total width, so
   "Más" and the word are always the same size; the block's height just varies
   per word (a shorter word scales up → taller).
   MOBILE: "Más" sits on its own line at a CONSTANT size, and only the WORD below
   scales — every word grows/shrinks to the SAME fixed width (the widest word's
   natural width ≈ the phone width), so "alcance"/"clientes" fill the screen just
   like "crecimiento", taller because they're shorter.
   Either way the word rolls like a mechanical counter: a fixed-height window
   (mask) clips a stacked list that translates up one line per tick, while the
   window width + scale animate together so the visual width stays constant. */
import { prefersReducedMotion } from '../lib/util.js';

const WORDS = ['alcance.', 'clientes.', 'crecimiento.'];   // + a duplicate 1st <li> for a seamless loop
const DUR = 620;
const mqMobile = window.matchMedia('(max-width: 760px)');

export function initTicker() {
  const scale = document.querySelector('[data-ticker-scale]');
  const fit = document.querySelector('[data-ticker-fit]');
  const ticker = document.querySelector('[data-ticker]');
  const list = document.querySelector('[data-ticker-list]');
  const mas = scale?.querySelector('.hero__mas');
  if (!scale || !fit || !ticker || !list || !mas) return;
  const items = [...list.querySelectorAll('li')];
  if (!items.length) return;

  let masW = 0, wordW = [], fitW = 0, itemH = 0, targetW = 0;
  let index = 0;

  const apply = (i) => {
    const w = wordW[i] || 0;
    ticker.style.setProperty('--mask-w', w + 'px');
    if (mqMobile.matches) {
      // "Más" constant; the WORD scales to the fixed target width
      ticker.style.setProperty('--word-scale', (targetW / w || 1).toFixed(4));
      scale.style.setProperty('--fit-scale', '1');
    } else {
      scale.style.setProperty('--fit-scale', (fitW / (masW + w) || 1).toFixed(4));
      ticker.style.setProperty('--word-scale', '1');
    }
    list.style.setProperty('--list-y', (-(i * itemH)) + 'px');
  };

  const setInstant = (on) => {
    scale.classList.toggle('is-instant', on);
    ticker.classList.toggle('is-instant', on);
    list.classList.toggle('is-instant', on);
  };

  const measure = () => {
    // offsetWidth/Height ignore the transform, so we read the natural sizes
    masW = mas.offsetWidth;
    wordW = items.map(li => li.offsetWidth);
    itemH = items[0].offsetHeight;
    fitW = masW + Math.max(...wordW.slice(0, WORDS.length));   // desktop: whole block
    targetW = window.innerWidth * 0.9;                        // mobile: fill ~90vw
    fit.style.setProperty('--fit-w', fitW + 'px');
    setInstant(true);
    apply(index);
    void list.offsetWidth;
    setInstant(false);
  };

  measure();
  if (document.fonts?.ready) document.fonts.ready.then(measure);
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  mqMobile.addEventListener?.('change', measure);   // re-apply the right scaling mode

  if (prefersReducedMotion) return;

  const cycle = () => {
    index++;
    apply(index);                       // roll to the next word (list up, width + scale animate)
    if (index === items.length - 1) {
      // we've rolled onto the duplicate first word — silently snap back to 0
      setTimeout(() => {
        setInstant(true);
        index = 0;
        apply(0);
        void list.offsetWidth;
        setInstant(false);
      }, DUR);
    }
  };

  setInterval(cycle, 2600);
}
