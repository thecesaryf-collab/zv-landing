/* Services scroll choreography — ported from the reference prototype so it can't
   drift out of sync with the pinned title.

   DESKTOP: a FIXED overlay holds the four videos anchored to the viewport edges.
   The whole text column scrolls behind the pinned "Nuestros servicios" title;
   one progress value across that TEXT COLUMN decides which video is visible and
   scrubs its currentTime. Because the videos read the text column (not the
   title), the two never desync.

   MOBILE: the videos move INLINE, full-bleed, above each text block and scrub
   against that block's own progress.

   Video timing windows + progress formulas are copied 1:1 from the prototype. */
import { onFrame, clamp, mapClamp } from '../lib/util.js';

const mqMobile = window.matchMedia('(max-width: 760px)');

// each row is [start, end] as a fraction of progress (from the prototype)
const CONFIG_DESKTOP = [
  { start: 0.10, end: 0.30 },   // 01 · Captamos clientes
  { start: 0.30, end: 0.55 },   // 02 · Diseñamos imagen
  { start: 0.50, end: 0.70 },   // 03 · Creamos presencia
  { start: 0.70, end: 0.95 },   // 04 · Digitalizamos procesos
];
const CONFIG_MOBILE = [
  { start: 0.30, end: 0.90 },
  { start: 0.25, end: 0.90 },
  { start: 0.30, end: 0.90 },
  { start: 0.30, end: 0.90 },
];

export function initServices() {
  const section = document.querySelector('[data-services]');
  if (!section) return;
  const overlay = section.querySelector('[data-svc-videos]');
  const textWrap = section.querySelector('.services__text');
  const vids = [...section.querySelectorAll('[data-svc-vid]')];
  const blocks = [...section.querySelectorAll('[data-svc-block]')];
  if (!vids.length || !textWrap) return;

  // Force the browser to DECODE + paint the first frame. A paused video that
  // has never played can stay black until a seek completes; a muted play→pause
  // kicks the decoder so later scroll-seeks paint reliably (cold, uncached load).
  const prime = (v) => {
    const kick = () => {
      const p = v.play();
      const stop = () => { try { v.pause(); } catch (_) {} };
      if (p && typeof p.then === 'function') p.then(stop).catch(stop);
      else stop();
    };
    if (v.readyState >= 2) kick();
    else v.addEventListener('canplay', kick, { once: true });
  };

  // Bump this when you SWAP a video file that keeps the same name — it changes
  // the URL so the browser fetches the new file instead of serving a stale (or
  // cached-404) copy, while normal caching still works between loads.
  const SRC_VERSION = '3';

  // pick the right src for the device, (re)load and prime it
  const setSrc = (v) => {
    const base = mqMobile.matches ? v.dataset.srcMobile : v.dataset.srcDesktop;
    if (!base) { prime(v); return; }
    const src = base + (base.includes('?') ? '&' : '?') + 'v=' + SRC_VERSION;
    if (v.getAttribute('src') !== src) {
      v.setAttribute('src', src);
      v.load();
    }
    prime(v);
  };
  // if a local file fails to load, fall back to the hosted copy once
  vids.forEach(v => {
    v.addEventListener('error', () => {
      const fb = v.dataset.fallback;
      if (fb && v.getAttribute('src') !== fb) { v.setAttribute('src', fb); v.load(); prime(v); }
    });
  });

  // move videos between the fixed overlay (desktop) and the text blocks (mobile)
  let mode = null;
  const relayout = () => {
    const mobile = mqMobile.matches;
    if (mobile && mode !== 'mobile') {
      mode = 'mobile';
      vids.forEach((v, i) => {
        setSrc(v);
        (blocks[i] || section).prepend(v);
        v.classList.add('is-inline');
        v.style.display = 'block';
      });
    } else if (!mobile && mode !== 'desktop') {
      mode = 'desktop';
      vids.forEach((v) => {
        setSrc(v);
        overlay.appendChild(v);
        v.classList.remove('is-inline');
        v.style.display = 'none';
      });
    }
  };
  relayout();
  mqMobile.addEventListener?.('change', relayout);

  const seek = (v, t) => {
    // readyState >= 1 (duration known) is enough: setting currentTime KICKS the
    // browser to fetch + decode that frame. Waiting for readyState >= 2 left the
    // video black on a cold load, because the frame only buffers once we seek.
    if (!Number.isFinite(v.duration) || v.duration <= 0) return;
    const time = clamp(t, 0.0001, 0.9999) * v.duration;
    if (Math.abs(v.currentTime - time) > 0.03) {
      try { v.currentTime = time; } catch (_) { /* mid-seek, retried next frame */ }
    }
  };

  const root = document.documentElement;

  onFrame(() => {
    const vh = window.innerHeight;

    // fade the pinned title out as the section leaves (hands over to Opiniones)
    const sr = section.getBoundingClientRect();
    root.style.setProperty('--svc-title-out', mapClamp(sr.bottom, vh * 0.2, vh * 0.6).toFixed(3));

    if (mode === 'mobile') {
      blocks.forEach((b, i) => {
        const v = vids[i]; if (!v) return;
        const r = b.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return;   // skip off-screen work
        const p = clamp((vh - r.top) / (vh + r.height));
        const c = CONFIG_MOBILE[i];
        seek(v, (p - c.start) / (c.end - c.start));
      });
      return;
    }

    // desktop — one progress value across the TEXT COLUMN
    const r = textWrap.getBoundingClientRect();
    const prog = clamp((vh - r.top) / (r.height + vh));
    vids.forEach((v, i) => {
      const c = CONFIG_DESKTOP[i];
      if (prog >= c.start && prog <= c.end) {
        if (v.style.display !== 'block') v.style.display = 'block';
        seek(v, (prog - c.start) / (c.end - c.start));
      } else if (v.style.display !== 'none') {
        v.style.display = 'none';
      }
    });
  });
}
