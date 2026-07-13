/* Entry point — wires every module once the DOM is ready.
   Native ES modules, zero external dependencies: nothing to fail to load. */
import { revealOnView } from './lib/util.js';
import { initNav } from './modules/nav.js';
import { initTicker } from './modules/hero-ticker.js';
import { initAct } from './modules/act.js';
import { initServices } from './modules/services.js';
import { initTestimonials } from './modules/testimonials.js';
import { initProcess } from './modules/process.js';
import { initWhatsApp } from './modules/whatsapp.js';
import { initContact } from './modules/contact.js';

function boot() {
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
