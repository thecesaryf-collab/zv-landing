/* Entry point — wires every module once the DOM is ready.
   Native ES modules, zero external dependencies: nothing to fail to load. */
// Module imports carry ?v=… so a redeploy fetches fresh JS (a stale module mixed
// with fresh CSS silently breaks reveals). Keep lib/util.js UNVERSIONED so every
// module shares one instance of its rAF loop + scroll state. Bump on each change.
import { revealOnView } from './lib/util.js';
import { initPreloader } from './modules/preloader.js?v=23';
import { initNav } from './modules/nav.js?v=23';
import { initTicker } from './modules/hero-ticker.js?v=23';
import { initAct } from './modules/act.js?v=23';
import { initServices } from './modules/services.js?v=23';
import { initTestimonials } from './modules/testimonials.js?v=23';
import { initProcess } from './modules/process.js?v=23';
import { initWhatsApp } from './modules/whatsapp.js?v=23';
import { initContact } from './modules/contact.js?v=23';

// Land at the TOP on load/refresh: the browser was restoring a previous scroll
// position (reopening mid-page, e.g. on "Proceso"). Disable that and pin to top,
// unless the URL explicitly points at an #anchor.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const toTop = () => { if (!location.hash) window.scrollTo(0, 0); };
toTop();
window.addEventListener('load', toTop);

function boot() {
  initPreloader();
  initNav();
  initTicker();
  initAct();
  initServices();
  initTestimonials();
  initProcess();
  initWhatsApp();
  initContact();

  // generic scroll reveals for headings & blocks
  revealOnView('[data-reveal]');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
