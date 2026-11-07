/* Apatiqa Natura — logika objednávky
   -----------------------------------------------------------------
   TADY SE DOPLŇUJE: adresa nasazeného Apps Script Web Appu.
   Dokud je prázdná, formulář jen ukáže, co by odeslal.             */
const ENDPOINT = '';

/* -----------------------------------------------------------------
   DATA
   Ceník se načítá při otevření stránky z Google Sheetu (list "Ceník")
   přes doGet na ENDPOINT — mamka ceny a produkty edituje v tabulce.
   Struktura jedné varianty musí zůstat { id, label, cena }; stojí na
   ní výběr množství i souhrn.
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

async function nactiKatalog() {
  if (!ENDPOINT) throw new Error('ENDPOINT v app.js není vyplněný.');

  const preruseni = new AbortController();
  const casovac = setTimeout(() => preruseni.abort(), LIMIT_NACTENI);
  try {
    // Obyčejné GET bez vlastních hlaviček — žádný CORS preflight.
    const odpoved = await fetch(ENDPOINT, { signal: preruseni.signal });
    if (!odpoved.ok) throw new Error('HTTP ' + odpoved.status);
    const data = await odpoved.json();
    if (!data || !Array.isArray(data.produkty)) throw new Error((data && data.chyba) || 'Neplatná odpověď.');
    const katalog = sestavKatalog(data.produkty);
    if (!katalog.length) throw new Error('V ceníku není nic aktivního.');
    return katalog;
  } finally {
    clearTimeout(casovac);
  }
}

function vykresliChybuKatalogu() {
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

  KATALOG.forEach((kat) => {
    const blok = el('div', 'kategorie');

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
  popisek.append(el('span', 'varianta__cena', v.cena + ' Kč'));
  box.append(popisek);

  const ovladac = el('div', 'stepper');

  const ubrat = el('button', null, '−');
  ubrat.type = 'button';
  ubrat.setAttribute('aria-label', 'Ubrat ' + polozka.nazev + ' ' + v.label);

  const pocet = el('output', null, '0');
  pocet.id = 'out-' + v.id;

  const pridat = el('button', null, '+');
  pridat.type = 'button';
  pridat.setAttribute('aria-label', 'Přidat ' + polozka.nazev + ' ' + v.label);

  const zmen = (o) => {
    const n = Math.max(0, Math.min(20, (mnozstvi[v.id] || 0) + o));
    mnozstvi[v.id] = n;
    pocet.textContent = String(n);
    pocet.classList.toggle('ma-hodnotu', n > 0);
    vykresliSouhrn();
  };

  ubrat.addEventListener('click', () => zmen(-1));
  pridat.addEventListener('click', () => zmen(1));

  ovladac.append(ubrat, pocet, pridat);
  box.append(ovladac);
  return box;
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
  cil.textContent = '';

  if (!polozky.length) {
    cil.append(el('p', 'souhrn__prazdno', 'Zatím nic nevybráno. Množství zadáte výš v ceníku.'));
    document.getElementById('odeslat').disabled = true;
    return;
  }

  polozky.forEach((p) => {
    const radek = el('div', 'souhrn__radek');
    radek.append(el('p', null, p.nazev + ' · ' + p.varianta));
    radek.append(el('p', null, p.pocet + '×  ' + p.celkem + ' Kč'));
    cil.append(radek);
  });

  const celkem = polozky.reduce((s, p) => s + p.celkem, 0);
  const paticka = el('div', 'souhrn__celkem');
  paticka.append(el('p', 'popisek', 'Celkem'));
  paticka.append(el('p', 'castka', celkem + ' Kč'));
  cil.append(paticka);

  document.getElementById('odeslat').disabled = false;
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
  document.getElementById('form').addEventListener('submit', odesli);

  // Do konce načítání zůstává v #katalog text „Načítám ceník…“ z index.html.
  try {
    KATALOG = await nactiKatalog();
    vykresliKatalog();
  } catch (chyba) {
    console.error('Ceník se nenačetl:', chyba);
    vykresliChybuKatalogu();
  }
});
