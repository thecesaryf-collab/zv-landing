/* Loading screen: a gold ZV with a light sweeping across it, shown from first
   paint (pure HTML+CSS, so it covers any brief flash of unstyled text / not-yet-
   ready animation). It hides once the web fonts are ready — which is what causes
   the hero "jump" (font swap) — with a floor so it never just flashes, and a hard
   ceiling so a slow or failing connection can never leave it hanging.

   On hide it fades out and adds .is-loaded to <html>, which fades + blurs the
   hero in. Fails OPEN: if anything goes wrong the timeout still reveals the page. */
export function initPreloader() {
  const pre = document.querySelector('[data-preloader]');
  const root = document.documentElement;
  if (!pre) { root.classList.add('is-loaded'); return; }

  const start = performance.now();
  const MIN_MS = 250;    // don't flash the loader for a blink (kept short — feels snappy)
  const MAX_MS = 5000;   // fail open: never hang on a bad/slow connection
  let done = false;

  const reveal = () => {
    if (done) return; done = true;
    const wait = Math.max(0, MIN_MS - (performance.now() - start));
    setTimeout(() => {
      root.classList.add('is-loaded');    // hero fades + blurs in
      pre.classList.add('is-done');       // loader fades out
      setTimeout(() => pre.remove(), 900); // remove after the fade so it can't trap taps
    }, wait);
  };

  // primary trigger: web fonts ready (kills the unstyled-text swap).
  const fonts = (document.fonts && document.fonts.ready) || Promise.resolve();
  fonts.then(reveal);
  // also fine if EVERYTHING is already loaded (cached revisits), and a safety net.
  window.addEventListener('load', reveal);
  setTimeout(reveal, MAX_MS);
}
