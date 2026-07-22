/* Contact section: gentle parallax on the glow backdrop + a client-side
   form handler that validates and gives clear, in-voice feedback. */
import { onFrame, lerp, prefersReducedMotion } from '../lib/util.js';

const WA_PHONE = '34618313932';   // +34 618 31 39 32 — form requests land here

export function initContact() {
  const section = document.querySelector('[data-contact]');
  const bg = document.querySelector('[data-contact-parallax]');
  const form = document.querySelector('[data-contact-form]');
  const note = document.querySelector('[data-form-note]');

  /* ---- parallax backdrop ---- */
  if (bg && section && !prefersReducedMotion) {
    let y = 0;
    onFrame(() => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // -1 … 1 as the section crosses the viewport
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      y = lerp(y, p * -60, 0.1);
      bg.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    });
  }

  /* ---- form ---- */
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const message = (data.get('message') || '').toString().trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!name || !emailOk || !message) {
        note.style.color = 'var(--gold)';
        note.textContent = !name
          ? 'Falta tu nombre para poder responderte.'
          : !emailOk
            ? 'Revisa el correo: necesitamos uno válido para contestarte.'
            : 'Cuéntanos algo sobre tu proyecto y te respondemos.';
        return;
      }
      // No backend wired: hand the request off to WhatsApp so it reaches us.
      // On a phone the whatsapp:// scheme opens the app directly; on desktop
      // wa.me opens WhatsApp Web / the desktop app.
      note.style.color = 'var(--gold-lit)';
      note.textContent = `Gracias, ${name.split(' ')[0]}. Abrimos WhatsApp para enviar tu consulta…`;
      const text = encodeURIComponent(`Hola, soy ${name} (${email}).\n\n${message}`);
      const isMobile = window.matchMedia('(max-width: 760px)').matches
        || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setTimeout(() => {
        if (isMobile) {
          window.location.href = `whatsapp://send?phone=${WA_PHONE}&text=${text}`;
        } else {
          window.open(`https://wa.me/${WA_PHONE}?text=${text}`, '_blank', 'noopener');
        }
      }, 600);
      form.reset();
    });
  }
}
