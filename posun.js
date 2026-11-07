/* Apatiqa Natura — plynulé rolování
   -----------------------------------------------------------------
   - Skoky na kotvy (#cenik, #objednavka, rozcestník, košík …) se
     plynule rozjedou a dojedou; délka podle vzdálenosti, 0,6–1,4 s.
   - Kolečko myši / touchpad na počítači dostane jemnou setrvačnost.
   - Na dotykových zařízeních zůstává nativní rolování (kotvy ale
     dojíždějí plynule i tam).
   - Při „omezit pohyb“ v systému se nic z toho nezapne.
   Bez knihoven; samostatně vedle app.js.
   ----------------------------------------------------------------- */

(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const doc = document.documentElement;
  const pocitac = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const SETRVACNOST = 0.12;   // podíl zbývající vzdálenosti za snímek (60 fps); menší = víc klouže

  let cil = scrollY;          // kam se má dojet
  let aktualni = scrollY;     // kde právě jsme
  let jizda = null;           // { od, kam, start, trvani } u skoku na kotvu
  let bezi = false;
  let posledniSnimek = 0;

  const maxY = () => doc.scrollHeight - innerHeight;
  const omez = (y) => Math.max(0, Math.min(maxY(), y));
  const plynule = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function spust() {
    if (bezi) return;
    bezi = true;
    posledniSnimek = performance.now();
    requestAnimationFrame(snimek);
  }

  function snimek(ted) {
    const dt = Math.min(64, ted - posledniSnimek);
    posledniSnimek = ted;

    if (jizda) {
      const t = Math.min(1, (ted - jizda.start) / jizda.trvani);
      aktualni = jizda.od + (jizda.kam - jizda.od) * plynule(t);
      if (t >= 1) {
        const hotovo = jizda.hotovo;
        jizda = null;
        cil = aktualni;
        if (hotovo) hotovo();
      }
    } else {
      aktualni += (cil - aktualni) * (1 - Math.pow(1 - SETRVACNOST, dt / 16.67));
      if (Math.abs(cil - aktualni) < 0.5) aktualni = cil;
    }

    scrollTo(0, aktualni);
    if (jizda || aktualni !== cil) requestAnimationFrame(snimek);
    else bezi = false;
  }

  function zastav() {
    jizda = null;
    aktualni = cil = scrollY;
  }

  /* ---- skoky na kotvy ---- */
  document.addEventListener('click', (e) => {
    const odkaz = e.target.closest('a[href^="#"]');
    if (!odkaz || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const hash = odkaz.getAttribute('href');
    const prvek = hash === '#' ? null : document.getElementById(decodeURIComponent(hash.slice(1)));
    if (hash !== '#' && !prvek) return;
    e.preventDefault();

    const okraj = prvek ? parseFloat(getComputedStyle(prvek).scrollMarginTop) || 0 : 0;
    const kam = omez(prvek ? prvek.getBoundingClientRect().top + scrollY - okraj : 0);
    const od = scrollY;
    const klavesnice = e.detail === 0;   // Enter na odkazu, ne klik myší

    history.pushState(null, '', hash === '#' ? location.pathname + location.search : hash);

    // u klávesnice přesune fokus na cíl, ať Tab pokračuje odtud
    const hotovo = klavesnice && prvek ? () => {
      if (!prvek.hasAttribute('tabindex')) prvek.setAttribute('tabindex', '-1');
      prvek.focus({ preventScroll: true });
    } : null;

    if (Math.abs(kam - od) < 2) { if (hotovo) hotovo(); return; }
    jizda = { od, kam, start: performance.now(), trvani: Math.min(1400, Math.max(600, Math.abs(kam - od) * 0.35)), hotovo };
    aktualni = od;
    spust();
  });

  // dotyk, klávesa nebo uchopení posuvníku jízdu na kotvu přeruší
  ['touchstart', 'keydown', 'mousedown'].forEach((typ) =>
    addEventListener(typ, () => { if (jizda) zastav(); }, { passive: true }));

  /* ---- setrvačnost kolečka (jen počítač) ---- */
  function rolujeUvnitr(el, dy) {
    for (; el instanceof Element && el !== document.body && el !== doc; el = el.parentElement) {
      if (el.scrollHeight <= el.clientHeight) continue;
      if (!/(auto|scroll)/.test(getComputedStyle(el).overflowY)) continue;
      if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
    }
    return false;
  }

  if (pocitac) {
    addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;                                   // zoom gestem
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;     // vodorovný posun (rozcestník)
      if (rolujeUvnitr(e.target, e.deltaY)) return;            // poznámka, adresa …

      e.preventDefault();
      if (jizda || !bezi) zastav();
      const nasobek = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      cil = omez(cil + e.deltaY * nasobek);
      spust();
    }, { passive: false });
  }

  // nativní posun (klávesnice, posuvník, hledání na stránce) — srovnat stav
  addEventListener('scroll', () => { if (!bezi) aktualni = cil = scrollY; }, { passive: true });

  // vlastní plynulost místo CSS scroll-behavior, aby se nepraly
  doc.classList.add('plynule');
})();
