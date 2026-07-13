/* ACT — the pinned opening sequence, one scroll-progress value drives it.
   Timeline (p = 0 → 1 across the tall .act section):
     · hero copy scrolls straight up (no fade)
     · pain title rises early (overlapping the leaving hero), reveals L→R,
       then DOCKS just under the nav (sticky) and later fades + blurs out
     · glass pills rise in a scattered stream, passing OVER the docked title
     · a wide conclusion pill closes the case, then drops/blurs away while
       the "Nuestros servicios" handoff title swaps in
     · background warms, the ZV monogram ignites then rises + shrinks        */
import { onFrame, clamp, lerp, mapClamp, prefersReducedMotion } from '../lib/util.js';

export function initAct() {
  const act = document.querySelector('[data-act]');
  const stage = act?.querySelector('[data-act-sticky]');
  const heroCopy = act?.querySelector('[data-hero-copy]');
  const pills = [...(act?.querySelectorAll('[data-pain]') || [])];
  const solTitle = act?.querySelector('[data-sol-title]');
  const solBody = act?.querySelector('[data-sol-body]');
  if (!act || !stage) return;

  const setVars = (o) => { for (const k in o) stage.style.setProperty(k, o[k]); };
  const pv = (el, o) => { for (const k in o) el.style.setProperty(k, o[k]); };

  const root = document.documentElement;

  if (prefersReducedMotion) {
    setVars({ '--hero-y': '0', '--ignite': '0.9', '--warm': '0.9', '--text-y': '-36',
              '--wipe': '1', '--paint-op': '1', '--paint-bl': '0', '--mono-rise': '1',
              '--cue-op': '1' });
    root.style.setProperty('--svc-title-in', '1');
    root.style.setProperty('--svc-title-y', '0');
    pills.forEach(p => pv(p, { '--py': '0', '--op': '1', '--bl': '0' }));
    if (solTitle) pv(solTitle, { '--sol-y': '20', '--sol-op': '1', '--sol-wipe': '1' });
    if (solBody) pv(solBody, { '--sol-y': '40', '--sol-op': '1', '--sol-wipe': '1' });
    return;
  }

  let travel = 1;
  const measure = () => { travel = Math.max(1, act.offsetHeight - window.innerHeight); };
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  const PILL_SPAN = 0.40;

  onFrame(() => {
    const top = act.getBoundingClientRect().top + window.scrollY;
    const scrolled = window.scrollY - top;
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

    // pain title: rise early → dock a little below the nav → fade quickly
    const titleRise = mapClamp(p, 0.04, 0.22);
    const textY = lerp(48, -20, titleRise);      // vh (docked a touch below the nav)
    const wipe  = mapClamp(p, 0.04, 0.15);
    // fades a touch later — fine if the first pill is already crossing over it
    const titleFade = mapClamp(p, 0.36, 0.50);
    const paintOp = 1 - titleFade;
    const paintBl = titleFade * 10;

    setVars({
      '--hero-y':   heroY.toFixed(1),
      '--cue-op':   cueOp.toFixed(3),
      '--aura-y':   auraY.toFixed(1),
      '--warm':     warm.toFixed(3),
      '--ignite':   ignite.toFixed(3),
      '--dim':      dimOut.toFixed(3),      // fades the ZV object + edge glow to nothing
      '--mono-op':  (1 - dimOut).toFixed(3),
      '--mono-rise': monoRise.toFixed(3),
      '--text-y':   textY.toFixed(2),
      '--wipe':     wipe.toFixed(3),
      '--paint-op': paintOp.toFixed(3),
      '--paint-bl': paintBl.toFixed(2),
    });

    heroCopy?.classList.toggle('is-hidden', scrolled > vh * 0.8);

    // pain pills: staggered stream rising from below and out the top
    pills.forEach((pill, i) => {
      const start = 0.16 + i * 0.045;
      const pr = mapClamp(p, start, start + PILL_SPAN);
      const py = lerp(58, -78, pr);
      const fadeIn  = mapClamp(p, start, start + 0.05);
      const fadeOut = mapClamp(p, start + PILL_SPAN - 0.08, start + PILL_SPAN);
      pv(pill, {
        '--py': py.toFixed(2),
        '--op': (fadeIn * (1 - fadeOut)).toFixed(3),
        '--bl': (fadeOut * 5).toFixed(2),
      });
    });

    // ---- solution: loose title + trailing subtitle/button (no glass pill) ----
    // The title "Nosotros lo solucionamos" rises IN FRONT of the ZV. The
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
