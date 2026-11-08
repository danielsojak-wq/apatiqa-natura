/* Apatiqa Natura — logika objednávky
   -----------------------------------------------------------------
   TADY SE DOPLŇUJE: adresa nasazeného Apps Script Web Appu.
   Dokud je prázdná, formulář jen ukáže, co by odeslal.             */
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwPVkooLDxoUwf3XyQraoWkW0wL5PGEzOTITI6J2Vh5de_T1oxUOXD2PEEVPD-jSzP7/exec';

/* -----------------------------------------------------------------
   DATA
   Ceník se načítá při otevření stránky z Google Sheetu (list "Ceník")
   přes doGet na ENDPOINT — mamka ceny a produkty edituje v tabulce.
   Struktura jedné varianty musí zůstat { id, label, cena }; stojí na
   ní výběr množství i souhrn.
   Apps Script odpovídá 2–3 s, proto si prohlížeč poslední ceník
   pamatuje (localStorage). Při další návštěvě se ukáže hned a po
   stažení čerstvého se překreslí, jen když se v tabulce něco změnilo.
   Cenu objednávky vždy počítá skript z tabulky, ne z prohlížeče.
   ----------------------------------------------------------------- */

let KATALOG = [];   // [{ nazev, barva, polozky: [{ nazev, popis, ikona, varianty: [{ id, label, cena }] }] }]

// Barvy hlaviček kategorií z návrhu. Nová kategorie dostane barvu podle pořadí.
const BARVY_KATEGORII = {
  'Masti a balzámy': '#3C5330',
  'Péče o vlasy':    '#55683D',
  'Péče o pleť':     '#6E7F4F',
  'Péče o tělo':     '#8A6A5B'
};
const BARVY_DALSI = ['#3C5330', '#55683D', '#6E7F4F', '#8A6A5B'];

const LIMIT_NACTENI = 15000;   // ms; pak se místo ceníku ukáže telefon
const KLIC_CENIKU = 'apatiqa-cenik';                // localStorage
const MAX_STARI_CENIKU = 14 * 24 * 60 * 60 * 1000;  // starší uložený ceník se neukáže

/* Náhled na localhostu: dokud je ENDPOINT prázdný, ceník se vezme
   z ukazka-ceniku.json (stejný tvar jako odpověď doGet). Na ostrém
   webu se nepoužije nikdy.                                           */
const UKAZKOVY_CENIK = 'ukazka-ceniku.json';
const JE_LOCALHOST = ['localhost', '127.0.0.1'].includes(location.hostname);

/* Řádky z doGet → KATALOG. Jeden řádek = jedna varianta; řádky se
   stejnou kategorií a produktem se spojí do jedné položky.          */
function sestavKatalog(produkty) {
  const kategorie = [];
  const podleKategorie = new Map();
  const podleProduktu = new Map();
  const poradi = (r) => (typeof r.poradi === 'number' ? r.poradi : Infinity);

  produkty
    .filter((r) => r && r.aktivni !== false && r.id && r.produkt && Number(r.cena) > 0)
    .sort((a, b) => poradi(a) - poradi(b))
    .forEach((r) => {
      const nazevKat = r.kategorie || 'Ostatní';
      let kat = podleKategorie.get(nazevKat);
      if (!kat) {
        kat = {
          nazev: nazevKat,
          barva: BARVY_KATEGORII[nazevKat] || BARVY_DALSI[kategorie.length % BARVY_DALSI.length],
          polozky: []
        };
        podleKategorie.set(nazevKat, kat);
        kategorie.push(kat);
      }

      const klic = nazevKat + '|' + r.produkt;
      let polozka = podleProduktu.get(klic);
      if (!polozka) {
        const ikona = r.ikona ? String(r.ikona) : '';
        polozka = {
          nazev: r.produkt,
          popis: r.popis || '',
          ikona: ikona && !ikona.includes('/') ? 'assets/' + ikona : ikona,
          varianty: []
        };
        podleProduktu.set(klic, polozka);
        kat.polozky.push(polozka);
      }

      polozka.varianty.push({ id: r.id, label: r.varianta || '', cena: Number(r.cena) });
    });

  return kategorie;
}

/* Stáhne řádky ceníku (odpověď doGet). Vyhodí chybu, když se nepovede. */
async function stahniCenik(zdroj) {
  if (!zdroj) throw new Error('ENDPOINT v app.js není vyplněný.');
  if (!ENDPOINT) console.warn('ENDPOINT je prázdný, ceník je ukázkový z ' + UKAZKOVY_CENIK + '.');

  const preruseni = new AbortController();
  const casovac = setTimeout(() => preruseni.abort(), LIMIT_NACTENI);
  try {
    // Obyčejné GET bez vlastních hlaviček — žádný CORS preflight.
    const odpoved = await fetch(zdroj, { signal: preruseni.signal });
    if (!odpoved.ok) throw new Error('HTTP ' + odpoved.status);
    const data = await odpoved.json();
    if (!data || !Array.isArray(data.produkty)) throw new Error((data && data.chyba) || 'Neplatná odpověď.');
    return data.produkty;
  } finally {
    clearTimeout(casovac);
  }
}

/* Uložený ceník z minulé návštěvy, nebo null. localStorage může být
   vypnutý (anonymní okno, zablokovaná data), proto všude try/catch.  */
function ulozenyCenik(zdroj) {
  try {
    const u = JSON.parse(localStorage.getItem(KLIC_CENIKU));
    if (u && u.zdroj === zdroj && Array.isArray(u.produkty) && Date.now() - u.cas < MAX_STARI_CENIKU) return u.produkty;
  } catch (_) { /* bez uloženého ceníku */ }
  return null;
}

function ulozCenik(zdroj, produkty) {
  try {
    if (produkty) localStorage.setItem(KLIC_CENIKU, JSON.stringify({ zdroj, cas: Date.now(), produkty }));
    else localStorage.removeItem(KLIC_CENIKU);
  } catch (_) { /* nevadí, příště se jen čeká déle */ }
}

/* Vykreslí ceník z řádků doGet; vybraná množství zůstanou.
   Vrací false, když v řádcích není nic k prodeji.                  */
function zobrazCenik(produkty) {
  const katalog = sestavKatalog(produkty);
  if (!katalog.length) return false;
  KATALOG = katalog;
  vykresliKatalog();
  vykresliRozcestnik();
  vykresliSouhrn();
  return true;
}

function vykresliChybuKatalogu() {
  KATALOG = [];
  const nav = document.getElementById('rozcestnik');
  if (nav) nav.hidden = true;
  vykresliSouhrn();

  const cil = document.getElementById('katalog');
  cil.textContent = '';
  const zprava = el('p', 'katalog__loading', 'Ceník se teď nepodařilo načíst. Objednat můžete telefonicky na ');
  const tel = el('a', null, '+420 776 349 774');
  tel.href = 'tel:+420776349774';
  zprava.append(tel, '.');
  cil.append(zprava);
}

/* ----------------------------------------------------------------- */

const mnozstvi = {};          // { idVarianty: počet }

// Částka česky: tisíce oddělené nezlomitelnou mezerou a „Kč“ se neodtrhne — 1 180 Kč
const kc = (n) => Number(n).toLocaleString('cs-CZ', { maximumFractionDigits: 2 }).replace(/\s/g, '\u00a0') + '\u00a0Kč';
const nacteno = Date.now();   // časová past proti robotům

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

function vykresliKatalog() {
  const cil = document.getElementById('katalog');
  cil.textContent = '';

  KATALOG.forEach((kat, i) => {
    const blok = el('div', 'kategorie');
    blok.id = 'kategorie-' + (i + 1);   // cíl pro rozcestník

    const hlavicka = el('div', 'kategorie__hlavicka');
    hlavicka.style.background = kat.barva;
    hlavicka.append(el('h3', null, kat.nazev));
    blok.append(hlavicka);

    kat.polozky.forEach((p) => {
      const radek = el('div', 'polozka');

      const info = el('div', 'polozka__info');
      if (p.ikona) {
        const img = el('img', 'polozka__ikona');
        img.src = p.ikona;
        img.alt = '';
        img.loading = 'lazy';
        info.append(img);
      }
      const texty = el('div');
      texty.append(el('p', 'polozka__nazev', p.nazev));
      if (p.popis) texty.append(el('p', 'polozka__popis', p.popis));
      info.append(texty);
      radek.append(info);

      const varianty = el('div', 'varianty');
      p.varianty.forEach((v) => varianty.append(stepper(p, v)));
      radek.append(varianty);

      blok.append(radek);
    });

    cil.append(blok);
  });
}

function stepper(polozka, v) {
  const box = el('div', 'varianta');

  const popisek = el('p', 'varianta__label');
  popisek.append(document.createTextNode(v.label + ' · '));
  popisek.append(el('span', 'varianta__cena', kc(v.cena)));
  box.append(popisek);

  const ovladac = el('div', 'stepper');

  const ubrat = el('button', null, '−');
  ubrat.type = 'button';
  ubrat.setAttribute('aria-label', 'Ubrat ' + polozka.nazev + ' ' + v.label);

  // Při překreslení na čerstvý ceník drží stepper už vybrané množství.
  const vybrano = mnozstvi[v.id] || 0;
  const pocet = el('output', vybrano ? 'ma-hodnotu' : null, String(vybrano));
  pocet.id = 'out-' + v.id;

  const pridat = el('button', null, '+');
  pridat.type = 'button';
  pridat.setAttribute('aria-label', 'Přidat ' + polozka.nazev + ' ' + v.label);

  ubrat.addEventListener('click', () => nastavMnozstvi(v.id, (mnozstvi[v.id] || 0) - 1));
  pridat.addEventListener('click', () => nastavMnozstvi(v.id, (mnozstvi[v.id] || 0) + 1));

  ovladac.append(ubrat, pocet, pridat);
  box.append(ovladac);
  return box;
}

/* Jediné místo, kde se mění množství — volá ho ceník i souhrn,
   takže stepper v ceníku, souhrn, košík i tlačítko vždy sedí. */
function nastavMnozstvi(id, n) {
  n = Math.max(0, Math.min(20, n));
  mnozstvi[id] = n;
  const o = document.getElementById('out-' + id);
  if (o) { o.textContent = String(n); o.classList.toggle('ma-hodnotu', n > 0); }
  vykresliSouhrn();
}

function vybrane() {
  const out = [];
  KATALOG.forEach((kat) => kat.polozky.forEach((p) => p.varianty.forEach((v) => {
    const n = mnozstvi[v.id] || 0;
    if (n > 0) out.push({ id: v.id, nazev: p.nazev, varianta: v.label, pocet: n, cena: v.cena, celkem: n * v.cena });
  })));
  return out;
}

function vykresliSouhrn() {
  const cil = document.getElementById('souhrn');
  const polozky = vybrane();

  // Souhrn se kreslí znovu po každé změně; fokus z tlačítek − / + v něm
  // přeneseme na nově vykreslené tlačítko, ať jde klikat dál i z klávesnice.
  const aktivni = document.activeElement;
  const fokus = aktivni && cil.contains(aktivni) && aktivni.dataset.akce
    ? { id: aktivni.dataset.id, akce: aktivni.dataset.akce } : null;

  cil.textContent = '';
  vykresliPrehled(polozky);

  if (!polozky.length) {
    cil.append(el('p', 'souhrn__prazdno', 'Zatím nic nevybráno. Množství zadáte výš v ceníku.'));
    document.getElementById('odeslat').disabled = true;
    return;
  }

  polozky.forEach((p) => {
    const radek = el('div', 'souhrn__radek');

    const popis = el('div', 'souhrn__popis');
    popis.append(el('p', 'souhrn__nazev', p.nazev + ' · ' + p.varianta));
    popis.append(el('p', 'souhrn__ks', kc(p.cena) + ' / ks'));
    radek.append(popis);

    const ovladac = el('div', 'stepper stepper--maly');
    const ubrat = el('button', null, '−');
    ubrat.type = 'button';
    ubrat.dataset.akce = 'ubrat';
    ubrat.dataset.id = p.id;
    ubrat.setAttribute('aria-label', 'O kus méně: ' + p.nazev + ' ' + p.varianta);
    ubrat.addEventListener('click', () => nastavMnozstvi(p.id, p.pocet - 1));
    const pocet = el('output', 'ma-hodnotu', String(p.pocet));
    const pridat = el('button', null, '+');
    pridat.type = 'button';
    pridat.dataset.akce = 'pridat';
    pridat.dataset.id = p.id;
    pridat.setAttribute('aria-label', 'O kus víc: ' + p.nazev + ' ' + p.varianta);
    pridat.disabled = p.pocet >= 20;
    pridat.addEventListener('click', () => nastavMnozstvi(p.id, p.pocet + 1));
    ovladac.append(ubrat, pocet, pridat);
    radek.append(ovladac);

    radek.append(el('p', 'souhrn__castka', kc(p.celkem)));
    cil.append(radek);
  });

  const celkem = polozky.reduce((s, p) => s + p.celkem, 0);
  const paticka = el('div', 'souhrn__celkem');
  paticka.append(el('p', 'popisek', 'Celkem'));
  paticka.append(el('p', 'castka', kc(celkem)));
  cil.append(paticka);

  document.getElementById('odeslat').disabled = false;

  if (fokus) {
    const tlacitko = cil.querySelector('button[data-id="' + fokus.id + '"][data-akce="' + fokus.akce + '"]')
      || cil.querySelector('button[data-akce]');
    if (tlacitko) tlacitko.focus();
  }
}

/* -----------------------------------------------------------------
   PŘEHLED VÝBĚRU
   Plovoucí košík (počet kusů, celkem, odkaz k objednávce), počty
   vybraných kusů u kategorií v rozcestníku a částka na tlačítku.
   Volá se z vykresliSouhrn(), takže sedí po každé změně množství
   i po hotovo().
   ----------------------------------------------------------------- */

const odkazyKategorii = [];        // [{ odkaz, pocet }] ve stejném pořadí jako KATALOG
const naObrazovce = new Set();     // sekce, při kterých se košík schová
let pozorovatelKategorii = null;   // při překreslení ceníku se starý odpojí

function slovoKus(n) {
  if (n === 1) return 'kus';
  return n >= 2 && n <= 4 ? 'kusy' : 'kusů';
}

function vykresliPrehled(polozky) {
  const kusu = polozky.reduce((s, p) => s + p.pocet, 0);
  const celkem = polozky.reduce((s, p) => s + p.celkem, 0);

  const kosik = document.getElementById('kosik');
  if (kosik) {
    document.getElementById('kosik-pocet').textContent = kusu + ' ' + slovoKus(kusu);
    document.getElementById('kosik-celkem').textContent = kc(celkem);
    const videt = kusu > 0 && naObrazovce.size === 0;
    kosik.classList.toggle('je-videt', videt);
    kosik.setAttribute('aria-hidden', String(!videt));
  }

  KATALOG.forEach((kat, i) => {
    const o = odkazyKategorii[i];
    if (!o) return;
    const n = kat.polozky.reduce((s, p) => s + p.varianty.reduce((t, v) => t + (mnozstvi[v.id] || 0), 0), 0);
    o.pocet.textContent = n ? String(n) : '';
    o.pocet.hidden = !n;
  });

  document.getElementById('odeslat').textContent = kusu ? 'Odeslat objednávku · ' + kc(celkem) : 'Odeslat objednávku';
}

/* Rozcestník kategorií nad ceníkem; zvýrazní kategorii, kterou máte před sebou. */
function vykresliRozcestnik() {
  const nav = document.getElementById('rozcestnik');
  if (!nav) return;
  nav.textContent = '';
  odkazyKategorii.length = 0;

  KATALOG.forEach((kat, i) => {
    const odkaz = el('a', 'rozcestnik__odkaz', kat.nazev);
    odkaz.href = '#kategorie-' + (i + 1);
    const pocet = el('span', 'rozcestnik__pocet');
    pocet.hidden = true;
    odkaz.append(pocet);
    nav.append(odkaz);
    odkazyKategorii.push({ odkaz, pocet });
  });
  nav.hidden = false;

  if (!('IntersectionObserver' in window)) return;
  if (pozorovatelKategorii) pozorovatelKategorii.disconnect();
  const pozorovatel = pozorovatelKategorii = new IntersectionObserver((zaznamy) => {
    zaznamy.forEach((z) => {
      if (!z.isIntersecting) return;
      const i = Number(z.target.id.replace('kategorie-', '')) - 1;
      odkazyKategorii.forEach((o, j) => o.odkaz.classList.toggle('je-aktivni', i === j));
      const aktivni = odkazyKategorii[i] && odkazyKategorii[i].odkaz;
      if (aktivni && nav.scrollWidth > nav.clientWidth) {
        nav.scrollTo({ left: aktivni.offsetLeft - (nav.clientWidth - aktivni.offsetWidth) / 2, behavior: 'smooth' });
      }
    });
  }, { rootMargin: '-35% 0px -60% 0px' });
  document.querySelectorAll('.kategorie').forEach((k) => pozorovatel.observe(k));
}

/* Košík se schová, když je na obrazovce objednávka nebo patička. */
function hlidejKosik() {
  if (!('IntersectionObserver' in window)) return;
  const pozorovatel = new IntersectionObserver((zaznamy) => {
    zaznamy.forEach((z) => (z.isIntersecting ? naObrazovce.add(z.target) : naObrazovce.delete(z.target)));
    vykresliPrehled(vybrane());
  }, { rootMargin: '0px 0px -25% 0px' });
  ['objednavka', 'kontakt'].forEach((id) => {
    const sekce = document.getElementById(id);
    if (sekce) pozorovatel.observe(sekce);
  });
}

/* ----------------------------------------------------------------- */

async function odesli(e) {
  e.preventDefault();

  const stav = document.getElementById('stav');
  const tlacitko = document.getElementById('odeslat');
  const form = document.getElementById('form');

  if (form.web.value) return;                     // honeypot
  if (Date.now() - nacteno < 3000) return;        // časová past

  if (!form.jmeno.value.trim() || !form.telefon.value.trim()) {
    stav.textContent = 'Vyplňte prosím jméno a telefon.';
    stav.className = 'stav stav--chyba';
    return;
  }

  if (form.predani.value === 'Poštou' && !form.adresa.value.trim()) {
    stav.textContent = 'Vyplňte prosím adresu, kam máme balíček poslat.';
    stav.className = 'stav stav--chyba';
    form.adresa.focus();
    return;
  }

  const polozky = vybrane();
  if (!polozky.length) return;

  tlacitko.disabled = true;
  stav.textContent = 'Odesílám…';
  stav.className = 'stav';

  /* POZOR NA CORS: Apps Script neumí odbavit preflight.
     Tělo proto jde jako URLSearchParams a Content-Type se
     NENASTAVUJE ručně — jinak request neprojde.               */
  const data = new URLSearchParams();
  data.set('jmeno', form.jmeno.value.trim());
  data.set('telefon', form.telefon.value.trim());
  data.set('email', form.email.value.trim());
  data.set('predani', form.predani.value);
  data.set('adresa', form.adresa.value.trim());
  data.set('poznamka', form.poznamka.value.trim());
  data.set('zdroj', 'web');
  data.set('polozky', JSON.stringify(polozky));

  if (!ENDPOINT) {
    console.log('Odeslalo by se:', Object.fromEntries(data));
    hotovo(stav, form);
    return;
  }

  try {
    const odpoved = await fetch(ENDPOINT, { method: 'POST', body: data });
    if (!odpoved.ok) throw new Error('HTTP ' + odpoved.status);
    // Apps Script vrací HTTP 200 i při chybě — o zápisu rozhoduje až "ok".
    const vysledek = await odpoved.json();
    if (!vysledek || vysledek.ok !== true) throw new Error((vysledek && vysledek.chyba) || 'Objednávka se nezapsala.');
    hotovo(stav, form);
    if (vysledek.cislo) stav.textContent += ' Číslo objednávky: ' + vysledek.cislo + '.';
  } catch (chyba) {
    console.error(chyba);
    stav.textContent = 'Objednávku se nepodařilo odeslat. Zkuste to prosím znovu, nebo zavolejte na +420 776 349 774.';
    stav.className = 'stav stav--chyba';
    tlacitko.disabled = false;
  }
}

function hotovo(stav, form) {
  form.reset();
  Object.keys(mnozstvi).forEach((k) => {
    mnozstvi[k] = 0;
    const o = document.getElementById('out-' + k);
    if (o) { o.textContent = '0'; o.classList.remove('ma-hodnotu'); }
  });
  vykresliSouhrn();
  stav.textContent = 'Děkuji, objednávka dorazila. Ozvu se vám, jakmile si ji projdu.';
  stav.className = 'stav stav--ok';
}

document.addEventListener('DOMContentLoaded', async () => {
  vykresliSouhrn();
  hlidejKosik();
  document.getElementById('form').addEventListener('submit', odesli);

  // Uložený ceník z minulé návštěvy hned; jinak do konce načítání
  // zůstává v #katalog text „Načítám ceník…“ z index.html.
  const zdroj = ENDPOINT || (JE_LOCALHOST ? UKAZKOVY_CENIK : '');
  const ulozeny = ulozenyCenik(zdroj);
  const zUlozeneho = Boolean(ulozeny && zobrazCenik(ulozeny));

  let produkty;
  try {
    produkty = await stahniCenik(zdroj);
  } catch (chyba) {
    console.error('Ceník se nenačetl:', chyba);
    if (!zUlozeneho) vykresliChybuKatalogu();   // jinak zůstane uložený ceník
    return;
  }

  if (zUlozeneho && JSON.stringify(produkty) === JSON.stringify(ulozeny)) {
    ulozCenik(zdroj, produkty);                 // beze změny, jen obnoví čas
  } else if (zobrazCenik(produkty)) {
    ulozCenik(zdroj, produkty);
  } else {
    console.error('Ceník se nenačetl: v ceníku není nic aktivního.');
    ulozCenik(zdroj, null);
    vykresliChybuKatalogu();
  }
});
