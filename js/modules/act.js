/* ACT — the pinned opening sequence, one scroll-progress value drives it.
   Timeline (p = 0 → 1 across the tall .act section):
     · hero copy scrolls straight up (no fade)
     · pain title rises early (overlapping the leaving hero), reveals L→R,
       then DOCKS just under the nav (sticky) and later fades + blurs out
     · glass pills rise in a scattered stream, passing OVER the docked title
     · a wide conclusion pill closes the case, then drops/blurs away while
       the "Nuestros servicios" handoff title swaps in
     · background warms, the ZV ignites (image sequence) then rises + shrinks

   PERFORMANCE:
   (1) The ZV ignite is a scroll-scrubbed IMAGE SEQUENCE drawn to a single
       <canvas> (one drawImage per changed frame) instead of the old ~7-layer
       CSS-masked 3D monogram, whose per-frame blending of several full-screen
       ZV-masked layers was a structural fill-rate wall on phones.
   (2) We write the final transform/opacity DIRECTLY on each layer (compositor-
       only: no subtree recalc, no layout, no paint) rather than setting inherited
       custom props on the shared .act__sticky wrapper (which would recompute
       STYLE for its whole subtree every frame). Custom props are kept ONLY where
       unavoidable: the canvas rise TRANSFORM (a mobile media-query overrides its
       translate constants, so it must flow through CSS) and the bg warm pools
       (they live in ::before/::after pseudo-elements, which take no inline style). */
import { onFrame, clamp, lerp, mapClamp, prefersReducedMotion } from '../lib/util.js';

export function initAct() {
  const act = document.querySelector('[data-act]');
  const stage = act?.querySelector('[data-act-sticky]');
  const heroCopy = act?.querySelector('[data-hero-copy]');
  const pills = [...(act?.querySelectorAll('[data-pain]') || [])];
  const solTitle = act?.querySelector('[data-sol-title]');
  const solBody = act?.querySelector('[data-sol-body]');
  if (!act || !stage) return;

  // individual layers we drive directly (compositor-only writes)
  const bgEl        = act.querySelector('.act__bg');        // keeps --warm/--dim for its ::before/::after pools
  const cornersEl   = act.querySelector('.act__corners');
  const auraEl      = act.querySelector('.act__aura');
  const paintEl     = act.querySelector('.act__paintext');
  const cueEl       = act.querySelector('.act__cue');

  const pv = (el, o) => { for (const k in o) el.style.setProperty(k, o[k]); };
  const setOpacity = (el, v) => { if (el) el.style.opacity = v; };

  const root = document.documentElement;

  // ---- ZV ignite = a scroll-scrubbed IMAGE SEQUENCE on one <canvas> ----
  // A pre-rendered 3D clip (dark → gold) as 101 transparent WebP frames, 1:1 the
  // framing of the original ZV_logo.png (square, alpha), so the SAME CSS
  // transform/scale that moved the old monogram moves this. We draw ONE frame per
  // scroll position (only when it changes) — no CSS masks/layers/3D, so none of
  // the per-frame fill-rate/repaint cost the old CSS monogram had. The alpha
  // clips the logo cleanly (no blend mode needed). Rise/shrink/power-off stay CSS.
  const SEQ_FRAMES = 101;                       // assets/act/zv-seq-a/0000.webp … 0100.webp
  const SEQ_PATH   = 'assets/act/zv-seq-a/';
  const seqCanvas  = act.querySelector('[data-seq]');
  const seqCtx     = seqCanvas?.getContext('2d');   // alpha kept: frames are transparent
  const seqImgs    = new Array(SEQ_FRAMES);
  let seqCur = -1, seqWant = 0;                 // last-drawn / wanted frame index
  const seqPaint = () => {
    const img = seqImgs[seqWant];
    if (!seqCtx || seqCur === seqWant || !img || !img.complete || !img.naturalWidth) return;
    seqCur = seqWant;
    seqCtx.clearRect(0, 0, seqCanvas.width, seqCanvas.height);   // wipe: frames have alpha
    seqCtx.drawImage(img, 0, 0, seqCanvas.width, seqCanvas.height);
  };
  const seqSet = (i) => { seqWant = i < 0 ? 0 : i >= SEQ_FRAMES ? SEQ_FRAMES - 1 : i; seqPaint(); };
  if (seqCanvas && seqCtx) {
    for (let i = 0; i < SEQ_FRAMES; i++) {
      const img = new Image();
      img.decoding = 'async';
      // redraw as soon as the frame the scroll currently wants finishes loading
      img.onload = () => { if (i === seqWant) seqPaint(); };
      img.src = `${SEQ_PATH}${String(i).padStart(4, '0')}.webp`;
      seqImgs[i] = img;
    }
  }

  if (prefersReducedMotion) {
    // static "settled" state — everything visible, nothing animating
    if (bgEl) { bgEl.style.setProperty('--warm', '0.9'); bgEl.style.setProperty('--dim', '0'); }
    setOpacity(cornersEl, '0.928');
    if (auraEl) { auraEl.style.opacity = '0.928'; auraEl.style.transform = 'translateY(0px)'; }
    // settled: fully-lit last frame, risen/shrunk, fully opaque
    if (seqCanvas) { seqSet(SEQ_FRAMES - 1); seqCanvas.style.setProperty('--mono-rise', '1'); seqCanvas.style.opacity = '1'; }
    if (paintEl) { paintEl.style.transform = 'translateY(-36vh)'; paintEl.style.opacity = '1'; paintEl.style.setProperty('--wipe', '1'); }
    if (heroCopy) heroCopy.style.transform = 'translate(-50%, 0px)';
    setOpacity(cueEl, '0');
    root.style.setProperty('--svc-title-in', '1');
    root.style.setProperty('--svc-title-y', '0');
    pills.forEach(p => pv(p, { '--py': '0', '--op': '1' }));
    if (solTitle) pv(solTitle, { '--sol-y': '20', '--sol-op': '1', '--sol-wipe': '1' });
    if (solBody) pv(solBody, { '--sol-y': '40', '--sol-op': '1', '--sol-wipe': '1' });
    return;
  }

  // cache the section's document offset so the per-frame loop never calls
  // getBoundingClientRect (which would force a synchronous layout every frame)
  let travel = 1, actTop = 0;
  let lastScrolled = NaN;
  const measure = () => {
    // travel from the STAGE's own height (a fixed 100lvh), NOT window.innerHeight.
    // On mobile the URL bar showing/hiding changes innerHeight live; deriving the
    // scroll→progress mapping from it made the pinned ZV jerk every time the bar
    // collapsed. stage.offsetHeight is the large-viewport height and stays put, so
    // the bar just reveals/hides the lower part of the scene with no reflow.
    travel = Math.max(1, act.offsetHeight - stage.offsetHeight);
    actTop = act.getBoundingClientRect().top + window.scrollY;
    lastScrolled = NaN;   // force a recompute after a resize even if scroll didn't move
  };
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  const PILL_SPAN = 0.40;

  onFrame(() => {
    const scrolled = window.scrollY - actTop;
    // nothing moved since last frame → skip all work (idle = no recompositing)
    if (scrolled === lastScrolled) return;
    lastScrolled = scrolled;

    const p = clamp(scrolled / travel);
    const vh = window.innerHeight;

    // hero copy scrolls up 1:1 with the page
    const heroY = -clamp(scrolled, 0, vh * 1.1);
    const cueOp = mapClamp(scrolled, 0, vh * 0.35);
    // warm aura drifts gently upward as you scroll into the sequence
    const auraY = -clamp(scrolled * 0.06, 0, 90);

    // background + ZV. As the conclusion morphs into the "Nuestros servicios"
    // title (p ≈ 0.82 → 0.92) the ZV powers back OFF (opacity) and the warm pool
    // fades to pure black, so the seam into services is invisible.
    const dimOut   = mapClamp(p, 0.74, 0.92);
    const warm     = (0.15 + 0.85 * mapClamp(p, 0.0, 0.55)) * (1 - dimOut);
    const igniteRaw = mapClamp(p, 0.04, 0.42);   // 0→1 lighting progress (drives the frame index)
    const monoRise = mapClamp(p, 0.38, 0.66);
    const notDim   = 1 - dimOut;

    // pain title: rise early → dock a little below the nav → fade quickly
    const titleRise = mapClamp(p, 0.04, 0.22);
    const textY = lerp(48, -20, titleRise);      // vh (docked a touch below the nav)
    const wipe  = mapClamp(p, 0.04, 0.15);
    // fades a touch later — fine if the first pill is already crossing over it
    const titleFade = mapClamp(p, 0.36, 0.50);
    const paintOp = 1 - titleFade;

    // ---- background field (direct opacity; --warm/--dim only for the bg pools) ----
    if (bgEl) { bgEl.style.setProperty('--warm', warm.toFixed(3)); bgEl.style.setProperty('--dim', dimOut.toFixed(3)); }
    const fieldOp = (0.28 + 0.72 * warm) * notDim;
    setOpacity(cornersEl, fieldOp.toFixed(3));
    if (auraEl) { auraEl.style.opacity = fieldOp.toFixed(3); auraEl.style.transform = `translateY(${auraY.toFixed(1)}px)`; }

    // ---- ZV image sequence ----
    // frame index ← lighting progress (frame 0 = dormant/dark, so no fade-in
    // needed). The rise/shrink is CSS (--mono-rise); the end power-off is opacity.
    seqSet(Math.round(igniteRaw * (SEQ_FRAMES - 1)));
    if (seqCanvas) {
      seqCanvas.style.setProperty('--mono-rise', monoRise.toFixed(3));
      seqCanvas.style.opacity = notDim.toFixed(3);
    }

    // ---- pain title (transform/opacity direct; --wipe drives the span mask) ----
    if (paintEl) {
      paintEl.style.transform = `translateY(${textY.toFixed(2)}vh)`;
      paintEl.style.opacity = paintOp.toFixed(3);
      paintEl.style.setProperty('--wipe', wipe.toFixed(3));
      // soft-blur the title only once the pain chips actually reach it and start
      // crossing OVER it (~p 0.35), not from the moment the first chip appears.
      // Class toggle (not a per-frame radius) → rasterises once.
      paintEl.classList.toggle('is-behind-pills', p > 0.35 && p < 0.52);
    }

    // ---- hero copy + scroll cue ----
    if (heroCopy) heroCopy.style.transform = `translate(-50%, ${heroY.toFixed(1)}px)`;
    setOpacity(cueEl, (1 - cueOp).toFixed(3));

    heroCopy?.classList.toggle('is-hidden', scrolled > vh * 0.8);

    // pain pills: staggered stream rising from below and out the top. Each pill's
    // vars live on the pill itself (a tiny subtree), and --py must stay a var so
    // the mobile media-query can recentre the transform.
    pills.forEach((pill, i) => {
      const start = 0.16 + i * 0.045;
      const pr = mapClamp(p, start, start + PILL_SPAN);
      const py = lerp(58, -78, pr);
      const fadeIn  = mapClamp(p, start, start + 0.05);
      const fadeOut = mapClamp(p, start + PILL_SPAN - 0.08, start + PILL_SPAN);
      pv(pill, {
        '--py': py.toFixed(2),
        '--op': (fadeIn * (1 - fadeOut)).toFixed(3),
      });
    });

    // ---- solution: loose title + trailing subtitle/button (no glass pill) ----
    // The title "Nosotros nos ocupamos." rises IN FRONT of the ZV. The
    // subtitle+button start a bit LOWER and rise a bit SLOWER (the gap grows,
    // so the title pulls ahead). During the handoff they CATCH UP (gap shrinks)
    // to fuse just under the title, and the whole group crossfades into the
    // "Nuestros servicios" title, which continues up and pins under the nav.
    const cStart = 0.44, cEnd = 0.92;
    const cpr = mapClamp(p, cStart, cEnd);
    const yTitle = 114 - 103 * cpr;                    // title top (vh from top)

    // slight blur on the ZV as the solution title crosses in front (~mid-handoff),
    // pushing the logo back so the white copy reads over it. Ramps in cpr 0.3→0.6.
    if (seqCanvas) {
      const zvBlur = mapClamp(cpr, 0.30, 0.58) * 4.5;   // px
      seqCanvas.style.filter = zvBlur > 0.06 ? `blur(${zvBlur.toFixed(2)}px)` : '';
    }

    const pa   = mapClamp(cpr, 0.0, 0.78);             // phase A (separate + rise)
    const sepA = lerp(11, 27, pa);                     // gap grows: title pulls ahead
    const catch_ = mapClamp(cpr, 0.78, 0.88);          // handoff: subtitle catches up & fuses
    const sep  = lerp(sepA, 10, catch_);               // → normal gap, fused
    const ySub = yTitle + sep;

    const titleIn = mapClamp(p, cStart, cStart + 0.06);
    const bodyIn  = mapClamp(p, cStart + 0.03, cStart + 0.16);
    // left→right wipe-in (same reveal as the pain title), timed so it plays as
    // the title rises INTO view (not while it's still below the fold); subtitle trails
    const wipeT = mapClamp(cpr, 0.12, 0.48);
    const wipeS = mapClamp(cpr, 0.20, 0.56);
    // once fused (~0.88) the whole group crossfades into the new title
    const fuseOut = mapClamp(cpr, 0.88, 0.98);

    if (solTitle) pv(solTitle, {
      '--sol-y': yTitle.toFixed(2),
      '--sol-op': (titleIn * (1 - fuseOut)).toFixed(3),
      '--sol-wipe': wipeT.toFixed(3),
    });
    if (solBody) pv(solBody, {
      '--sol-y': ySub.toFixed(2),
      '--sol-op': (bodyIn * (1 - fuseOut)).toFixed(3),
      '--sol-wipe': wipeS.toFixed(3),
    });

    // "Nuestros servicios" is BORN at the solution title's height (yTitle) and
    // rides up the same line to dock under the nav. (dock ≈ 11vh, so its
    // translate is yTitle − 11 = 103·(1−cpr).)
    const hIn = mapClamp(cpr, 0.88, 1.0);
    const titleY = Math.max(0, 103 * (1 - cpr));
    root.style.setProperty('--svc-title-in', hIn.toFixed(3));
    root.style.setProperty('--svc-title-y', titleY.toFixed(2));
  });
}
