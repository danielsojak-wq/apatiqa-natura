/* Apatiqa Natura — logika objednávky
   -----------------------------------------------------------------
   TADY SE DOPLŇUJE: adresa nasazeného Apps Script Web Appu.
   Dokud je prázdná, formulář jen ukáže, co by odeslal.             */
const ENDPOINT = '';

/* -----------------------------------------------------------------
   DATA
   Zatím napevno. Cílový stav: načíst z Google Sheetu (list "Ceník")
   přes doGet na ENDPOINT, aby mamka mohla ceny a produkty editovat
   sama. Struktura jedné varianty musí zůstat { id, label, price }.
   ----------------------------------------------------------------- */

const MASTI = [
  ['mesickova',  'Měsíčková',   'Hojí rány a popraskaniny, péče o citlivou a podrážděnou pokožku, zklidňuje záněty, podporuje regeneraci.'],
  ['hermankova', 'Heřmánková',  'Má protizánětlivé, antiseptické a regenerační účinky.'],
  ['levandulova','Levandulová', 'Má zklidňující a regenerační účinky, podpora hojení drobných ran.'],
  ['repikova',   'Řepíková',    'Má silné protizánětlivé, regenerační a stahující účinky, úleva od potíží s hemoroidy.'],
  ['rozmarynova','Rozmarýnová', 'Působí příznivě na pohybový aparát – bolesti kloubů, svalů, zad a šlach, při revmatismu, artritidě, při bolestech hlavy či migréně, při respiračních potížích.'],
  ['tymianova',  'Tymiánová',   'Podporuje normální stav dýchacích cest, harmonii a klidný spánek. Vhodná při nachlazení.'],
  ['rebrickova', 'Řebříčková',  'Podporuje přirozenou regeneraci pokožky, chrání, zklidňuje a vyživuje suchou pokožku, působí příznivě na rozpraskané paty a na péči o anální oblast.'],
  ['koprivova',  'Kopřivová',   'Podporuje zdraví pokožky, kloubů a svalů. Pomáhá při revmatismu, ztuhlosti a bolesti kloubů i zad, protizánětlivě, zjemňuje.'],
  ['trezalkova', 'Třezalková',  'Pomáhá při drobných popáleninách (i od slunce), ekzémech, ulevuje při ztuhlých svalech, bolestech zad.'],
  ['kostivalova','Kostivalová', 'Pro podporu zdraví pohybové soustavy – klouby, kosti, svaly, šlachy, meziobratlové ploténky, při zlomeninách, výronech, vstřebávání podlitin a modřin.']
];

const SAMPUKY = ['Heřmánkový', 'Kopřivový', 'Levandulový', 'Měsíčkový', 'Čokoládový', 'Přesličkový'];

function masti() {
  const out = MASTI.map(([slug, nazev, popis]) => ({
    nazev: nazev + ' mast / balzám',
    popis,
    ikona: 'assets/' + slug + '.png',
    varianty: [
      { id: slug + '-30', label: '30 ml', cena: 130 },
      { id: slug + '-50', label: '50 ml', cena: 200 }
    ]
  }));
  out.push({
    nazev: 'Kaštanová mast / gel / balzám',
    popis: 'Žíly a cévní potíže, hemoroidy, otoky, těžké nohy, křečové žíly, pohmožděniny, podlitiny.',
    ikona: 'assets/kastanova.png',
    varianty: [
      { id: 'kastanova-30', label: '30 ml', cena: 135 },
      { id: 'kastanova-50', label: '50 ml', cena: 200 }
    ]
  });
  return out;
}

function vlasy() {
  const out = SAMPUKY.map((n, i) => ({
    nazev: n + ' šampuk',
    popis: i === 0 ? 'Pevný šampon s drceným heřmánkem.' : '',
    ikona: '',
    varianty: [{ id: 'sampuk-' + i, label: '50 g', cena: 145 }]
  }));
  out.push({
    nazev: 'Tuhý kondicionér s arganovým olejem',
    popis: 'Vyživuje, usnadňuje rozčesávání a zanechává vlasy hebké a lesklé.',
    ikona: '',
    varianty: [{ id: 'kondicioner-30', label: '30 g', cena: 85 }]
  });
  return out;
}

const KATALOG = [
  { nazev: 'Masti a balzámy', barva: '#3C5330', polozky: masti() },
  { nazev: 'Péče o vlasy',    barva: '#55683D', polozky: vlasy() },
  { nazev: 'Péče o pleť',     barva: '#6E7F4F', polozky: [
    { nazev: 'Hydratační květové sérum', popis: 'Sjednocuje tón pleti, snižuje zarudnutí, potlačuje fliky, reguluje ztrátu pevnosti pleti.', ikona: '', varianty: [{ id: 'serum-30', label: '30 ml', cena: 185 }] },
    { nazev: 'Pleťový krém s bakuchiolem', popis: 'Podporuje obnovu pleti, zlepšuje její texturu, vyhlazuje jemné vrásky a sjednocuje tón pleti.', ikona: '', varianty: [{ id: 'krem-30', label: '30 ml', cena: 249 }] },
    { nazev: 'Odličovací olej', popis: 'Šetrně odstraňuje make-up i nečistoty, přitom pleť vyživuje a zanechává hebkou.', ikona: '', varianty: [{ id: 'odlic-10', label: '10 ml', cena: 69 }] },
    { nazev: 'Pomerančový balzám na rty', popis: 'Vyživuje, zklidňuje a chrání rty, zanechává je hebké a jemně vonící.', ikona: '', varianty: [{ id: 'balzam-rty-15', label: '15 ml', cena: 89 }] },
    { nazev: 'Lesk na rty s pečujícími oleji', popis: 'Vyživuje, zklidňuje a chrání rty, zanechává je hebké a jemně lesklé.', ikona: '', varianty: [{ id: 'lesk-rty-10', label: '10 ml', cena: 119 }] }
  ]},
  { nazev: 'Péče o tělo',     barva: '#8A6A5B', polozky: [
    { nazev: 'Třezalkový olej', popis: 'Na popáleniny, po slunění, na bolesti svalů a pro přirozenou regeneraci pokožky.', ikona: '', varianty: [{ id: 'trezalka-50', label: '50 ml', cena: 75 }] },
    { nazev: 'Peelingové mýdlo kávové se skořicí', popis: 'S kávovými zrníčky.', ikona: '', varianty: [{ id: 'peeling-70', label: '70 g', cena: 95 }] },
    { nazev: 'Přírodní tuhý deodorant', popis: 'Ve vysouvací tyčince.', ikona: '', varianty: [{ id: 'deo-15', label: '15 ml', cena: 89 }] },
    { nazev: 'Přírodní repelent', popis: 'Nastříkat na pokožku, nebo na oblečení.', ikona: '', varianty: [{ id: 'repelent-50', label: '50 ml', cena: 230 }] }
  ]}
];

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

document.addEventListener('DOMContentLoaded', () => {
  vykresliKatalog();
  vykresliSouhrn();
  document.getElementById('form').addEventListener('submit', odesli);
});
