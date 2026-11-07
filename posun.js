/* Apatiqa Natura — plynulý dojezd na kotvy
   -----------------------------------------------------------------
   Skoky na kotvy (#cenik, #objednavka, rozcestník, košík …) se plynule
   rozjedou a dojedou; délka podle vzdálenosti, 0,6–1,4 s.
   Běžné rolování (kolečko, touchpad, dotyk, klávesnice) zůstává
   nativní — u e-shopu je předvídatelnější než umělá setrvačnost.
   Při „omezit pohyb“ v systému se nic nezapne. Bez knihoven.
   ----------------------------------------------------------------- */

(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const doc = document.documentElement;
  let jizda = null;   // { od, kam, start, trvani, hotovo }

  const maxY = () => doc.scrollHeight - innerHeight;
  const plynule = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function snimek(ted) {
    if (!jizda) return;
    const t = Math.min(1, (ted - jizda.start) / jizda.trvani);
    scrollTo(0, jizda.od + (jizda.kam - jizda.od) * plynule(t));
    if (t < 1) { requestAnimationFrame(snimek); return; }
    const hotovo = jizda.hotovo;
    jizda = null;
    if (hotovo) hotovo();
  }

  document.addEventListener('click', (e) => {
    const odkaz = e.target.closest('a[href^="#"]');
    if (!odkaz || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const hash = odkaz.getAttribute('href');
    const prvek = hash === '#' ? null : document.getElementById(decodeURIComponent(hash.slice(1)));
    if (hash !== '#' && !prvek) return;
    e.preventDefault();

    const okraj = prvek ? parseFloat(getComputedStyle(prvek).scrollMarginTop) || 0 : 0;
    const kam = Math.max(0, Math.min(maxY(), prvek ? prvek.getBoundingClientRect().top + scrollY - okraj : 0));
    const od = scrollY;

    history.pushState(null, '', hash === '#' ? location.pathname + location.search : hash);

    // Enter na odkazu (ne klik myší): fokus na cíl, ať Tab pokračuje odtud
    const hotovo = e.detail === 0 && prvek ? () => {
      if (!prvek.hasAttribute('tabindex')) prvek.setAttribute('tabindex', '-1');
      prvek.focus({ preventScroll: true });
    } : null;

    if (Math.abs(kam - od) < 2) { if (hotovo) hotovo(); return; }
    jizda = { od, kam, start: performance.now(), trvani: Math.min(1400, Math.max(600, Math.abs(kam - od) * 0.35)), hotovo };
    requestAnimationFrame(snimek);
  });

  // kolečko, dotyk, klávesa nebo posuvník dojezd přeruší — člověk má vždy přednost
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((typ) =>
    addEventListener(typ, () => { jizda = null; }, { passive: true }));

  // vlastní dojezd místo CSS scroll-behavior, aby se nepraly
  doc.classList.add('plynule');
})();
