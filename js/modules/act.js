/* ACT — the pinned opening sequence, one scroll-progress value drives it.
   Timeline (p = 0 → 1 across the tall .act section):
     · hero copy scrolls straight up (no fade)
     · pain title rises early (overlapping the leaving hero), reveals L→R,
       then DOCKS just under the nav (sticky) and later fades + blurs out
     · glass pills rise in a scattered stream, passing OVER the docked title
     · a wide conclusion pill closes the case, then drops/blurs away while
       the "Nuestros servicios" handoff title swaps in
     · background warms, the ZV monogram ignites then rises + shrinks

   PERFORMANCE — why this doesn't set CSS vars on one parent:
   Writing inherited custom properties (--warm, --ignite, …) on the shared
   .act__sticky wrapper forces the browser to recompute STYLE for its ENTIRE
   subtree (bg layers + the 7-layer monogram + hero + 5 pills + solution) on
   EVERY frame, before it can even composite. That main-thread recalc — not
   GPU fill-rate — is what pinned the section at ~half FPS on weak devices.
   So instead we write the final transform/opacity DIRECTLY on each layer
   (compositor-only: no subtree recalc, no layout, no paint). Custom props are
   kept ONLY where they're unavoidable: the mono/glow TRANSFORMS (a mobile
   media-query overrides their translate constants, so the value must flow
   through CSS) and the bg warm pools (they live in ::before/::after
   pseudo-elements, which can't take inline styles). */
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
  const monoglowEl  = act.querySelector('.act__monoglow');
  const monoEl      = act.querySelector('.act__mono');
  const rimCool     = act.querySelector('.mono__rim--cool');
  const rimWarm     = act.querySelector('.mono__rim--warm');
  const monoGlowLay = act.querySelector('.mono__glow');
  const monoSheen   = act.querySelector('.mono__sheen');
  const paintEl     = act.querySelector('.act__paintext');
  const cueEl       = act.querySelector('.act__cue');

  const pv = (el, o) => { for (const k in o) el.style.setProperty(k, o[k]); };
  const setOpacity = (el, v) => { if (el) el.style.opacity = v; };

  const root = document.documentElement;

  // On phones we BAKE the cool rim + sheen to a static lit level (see
  // responsive.css). act.js therefore stops writing their opacity per frame, so
  // their big masked layers paint into the monogram ONCE and never re-rasterise
  // it mid-scroll. Only the warm key-rim + gold ignite glow stay animated (and
  // stay promoted → those opacity writes are compositor-only, no repaint). That
  // per-frame REPAINT of the 128vw masked monogram — not fill-rate — was the
  // real source of the mobile lag.
  const mqMobile = window.matchMedia('(max-width: 760px)');
  let isMobile = mqMobile.matches;
  mqMobile.addEventListener?.('change', e => {
    isMobile = e.matches;
    // drop any inline opacity left by desktop frames so the baked CSS values
    // (responsive.css) take over — inline styles otherwise outrank them.
    if (isMobile) [rimCool, rimWarm, monoGlowLay, monoSheen]
      .forEach(el => { if (el) el.style.opacity = ''; });
  });

  if (prefersReducedMotion) {
    // static "settled" state — everything visible, nothing animating
    if (bgEl) { bgEl.style.setProperty('--warm', '0.9'); bgEl.style.setProperty('--dim', '0'); }
    setOpacity(cornersEl, '0.928');
    if (auraEl) { auraEl.style.opacity = '0.928'; auraEl.style.transform = 'translateY(0px)'; }
    if (monoglowEl) { monoglowEl.style.opacity = '0.9'; monoglowEl.style.setProperty('--mono-rise', '1'); }
    if (monoEl) { monoEl.style.opacity = '1'; monoEl.style.setProperty('--mono-rise', '1'); }
    setOpacity(rimCool, '0.64'); setOpacity(rimWarm, '0.916');
    setOpacity(monoGlowLay, '0.648'); setOpacity(monoSheen, '0.885');
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
    travel = Math.max(1, act.offsetHeight - window.innerHeight);
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

    // background + monogram. As the conclusion morphs into the "Nuestros
    // servicios" title (p ≈ 0.82 → 0.92) the ZV powers back OFF and the warm
    // pool fades to pure black, so the seam into services is invisible.
    const dimOut   = mapClamp(p, 0.74, 0.92);
    const warm     = (0.15 + 0.85 * mapClamp(p, 0.0, 0.55)) * (1 - dimOut);
    const ignite   = mapClamp(p, 0.04, 0.42) * (1 - dimOut);      // ZV lights, then powers back down
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

    // ---- monogram + halo (transform via --mono-rise so the mobile media-query
    //      can override the translate constants; opacities written directly) ----
    // halo: one cheap radial layer, always animated (opacity + rise)
    if (monoglowEl) { monoglowEl.style.opacity = (ignite * notDim).toFixed(3); monoglowEl.style.setProperty('--mono-rise', monoRise.toFixed(3)); }
    if (monoEl) {
      // PHONES: the whole monogram is ONE baked-lit texture (every rim/glow/sheen
      // is pinned lit in responsive.css and flattened in). Nothing inside changes
      // per frame, so it rasterises ONCE and only transforms/fades. We fade the
      // lit texture IN with --ignite (dark → lights up → powers off) — that's the
      // "encendido", compositor-only. DESKTOP keeps mono fully opaque and relights
      // each rim layer per frame below.
      monoEl.style.opacity = (isMobile ? ignite : notDim).toFixed(3);
      monoEl.style.setProperty('--mono-rise', monoRise.toFixed(3));
    }
    if (!isMobile) {
      setOpacity(rimCool,     (0.28 + 0.40 * ignite).toFixed(3));
      setOpacity(rimWarm,     (0.16 + 0.84 * ignite).toFixed(3));
      setOpacity(monoGlowLay, (ignite * 0.72).toFixed(3));
      setOpacity(monoSheen,   (0.12 + 0.85 * ignite).toFixed(3));
    }

    // ---- pain title (transform/opacity direct; --wipe drives the span mask) ----
    if (paintEl) {
      paintEl.style.transform = `translateY(${textY.toFixed(2)}vh)`;
      paintEl.style.opacity = paintOp.toFixed(3);
      paintEl.style.setProperty('--wipe', wipe.toFixed(3));
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
