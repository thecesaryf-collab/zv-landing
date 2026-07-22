/* Entry point — wires every module once the DOM is ready.
   Native ES modules, zero external dependencies: nothing to fail to load. */
// Module imports carry ?v=… so a redeploy fetches fresh JS (a stale module mixed
// with fresh CSS silently breaks reveals). Keep lib/util.js UNVERSIONED so every
// module shares one instance of its rAF loop + scroll state. Bump on each change.
import { revealOnView } from './lib/util.js';
import { initPreloader } from './modules/preloader.js?v=13';
import { initNav } from './modules/nav.js?v=13';
import { initTicker } from './modules/hero-ticker.js?v=13';
import { initAct } from './modules/act.js?v=13';
import { initServices } from './modules/services.js?v=13';
import { initTestimonials } from './modules/testimonials.js?v=13';
import { initProcess } from './modules/process.js?v=13';
import { initWhatsApp } from './modules/whatsapp.js?v=13';
import { initContact } from './modules/contact.js?v=13';

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
