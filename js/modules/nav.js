/* Header: glassmorphism intensifies past 50px + fullscreen mobile menu
   with scroll lock and staggered link reveal (handled by CSS transitions). */
import { clamp } from '../lib/util.js';

export function initNav() {
  const nav = document.querySelector('[data-nav]');
  const burger = document.getElementById('nav-burger');
  const menu = document.getElementById('mobile-menu');
  const root = document.documentElement;
  if (!nav) return;

  let solidQueued = false;
  const updateSolid = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 50);
    // 0 at top → 1 by 120px, drives --nav-solid used across the pill
    root.style.setProperty('--nav-solid', clamp(y / 120).toFixed(3));
    solidQueued = false;
  };
  window.addEventListener('scroll', () => {
    if (!solidQueued) { solidQueued = true; requestAnimationFrame(updateSolid); }
  }, { passive: true });
  updateSolid();

  /* ---- mobile menu ---- */
  const close = () => {
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
  };
  const open = () => {
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
  };

  burger?.addEventListener('click', () => {
    burger.classList.contains('is-open') ? close() : open();
  });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
  });
}
