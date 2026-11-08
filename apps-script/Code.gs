/**
 * Apatiqa Natura — Apps Script Web App pro objednávky z webu
 * =================================================================
 *
 * Skript pracuje s tabulkou „Objednávky – Apatiqa Natura“ (ID níž
 * v ID_TABULKY), se třemi listy:
 *
 *   Ceník       produkty a ceny; edituje je mamka, web je čte přes doGet
 *   Objednávky  jeden řádek na objednávku, zapisuje doPost
 *   Položky     jeden řádek na objednanou položku, zapisuje doPost
 *
 * SLOUPCE SE HLEDAJÍ PODLE NÁZVU v prvním řádku listu, ne podle pozice.
 * Na velikosti písmen, diakritice, mezerách a závorkách nezáleží
 * („Celkem (Kč)“ = „celkem kc“). Sloupce jde přeskládat a přidávat
 * vlastní — skript do sloupců, které nezná, nikdy nezapisuje.
 *
 * Nasazení: Nasadit → Nové nasazení → Webová aplikace,
 *   Spustit jako: Já, Kdo má přístup: Kdokoli. Postup je v README.md.
 *
 * Po každé změně tohoto souboru je potřeba vydat novou verzi
 * stávajícího nasazení (Spravovat nasazení → upravit → Nová verze),
 * jinak web dál volá starou verzi.
 */


/* =================================================================
   NASTAVENÍ
   ================================================================= */

/**
 * ID tabulky (část adresy mezi /d/ a /edit). Díky tomu je jedno, jestli
 * je skript vázaný na tabulku, nebo samostatný.
 * Samotné ID nikomu přístup nedává — tabulka ale nesmí být sdílená
 * „Kdokoli s odkazem“, jsou v ní osobní údaje zákaznic.
 */
const ID_TABULKY = '1P6o3TitO6AAj8HUkCom7DNztkKcQo_IriAUA3kQkWWw';

/** Názvy listů v tabulce. */
const LISTY = {
  cenik: 'Ceník',
  objednavky: 'Objednávky',
  polozky: 'Položky'
};

/**
 * Názvy sloupců v hlavičce (řádek 1) každého listu.
 * Vlevo je název pole ve skriptu, vpravo text v hlavičce.
 */
const SLOUPCE = {
  cenik: {
    kategorie: 'Kategorie',
    produkt: 'Produkt',
    varianta: 'Varianta',
    cena: 'Cena',
    popis: 'Popis',
    ikona: 'Ikona',
    aktivni: 'Aktivní',
    poradi: 'Pořadí'
  },
  objednavky: {
    cislo: 'Číslo objednávky',
    datum: 'Datum',
    jmeno: 'Jméno a příjmení',
    telefon: 'Telefon',
    email: 'E-mail',
    predani: 'Způsob předání',
    adresa: 'Adresa',
    poznamka: 'Poznámka',
    objednano: 'Objednáno',
    celkem: 'Celkem (Kč)',
    zdroj: 'Zdroj',
    stav: 'Stav',
    zaplaceno: 'Zaplaceno'
  },
  polozky: {
    cislo: 'Číslo objednávky',
    datum: 'Datum',
    kategorie: 'Kategorie',
    produkt: 'Produkt',
    varianta: 'Varianta',
    pocet: 'Počet',
    cena: 'Cena za kus (Kč)',
    celkem: 'Celkem (Kč)',
    id: 'ID'
  }
};

/**
 * Sloupce, bez kterých to nejde. Když některý chybí (třeba ho někdo
 * přejmenuje), skript skončí srozumitelnou chybou. Ostatní sloupce
 * jsou nepovinné: když chybí, skript je prostě vynechá.
 */
const POVINNE = {
  cenik: ['produkt', 'varianta', 'cena'],
  objednavky: ['cislo', 'jmeno', 'telefon', 'objednano'],
  polozky: ['cislo', 'produkt', 'varianta', 'pocet']
};

const PREFIX_CISLA = 'OBJ-';           // čísla objednávek: OBJ-001, OBJ-002, …
const VYCHOZI_STAV = 'Ke zpracování';  // stav nové objednávky (počítá se do listu K výrobě)
const MAX_KUSU = 20;                   // stejný strop jako tlačítko + na webu
const MAX_POLOZEK = 100;               // pojistka proti nesmyslně velkým požadavkům


/* =================================================================
   doGet — ceník pro web
   =================================================================
   Vrací aktivní řádky listu Ceník seřazené podle Pořadí:
   { "produkty": [ { id, kategorie, produkt, varianta, cena,
                     popis, ikona, aktivni, poradi }, … ] }

   „id“ skript skládá z produktu a varianty (např.
   „mesickova-mast-balzam-30-ml“); mamka ho nikde nevyplňuje.
   Při chybě vrací { "chyba": "…" } a web ukáže telefon.
   ================================================================= */

function doGet() {
  try {
    const produkty = nactiCenik()
      .filter((r) => r.aktivni)
      .map((r) => ({
        id: r.id,
        kategorie: r.kategorie,
        produkt: r.produkt,
        varianta: r.varianta,
        cena: r.cena,
        popis: r.popis,
        ikona: r.ikona,
        aktivni: true,
        poradi: r.poradi === Infinity ? null : r.poradi
      }));
    return json({ produkty: produkty });
  } catch (chyba) {
    console.error(chyba);
    return json({ chyba: zprava(chyba) });
  }
}


/* =================================================================
   doPost — nová objednávka z webu
   =================================================================
   Tělo přichází jako URLSearchParams (bez ručního Content-Type,
   kvůli CORS), takže pole jsou rovnou v e.parameter:
     jmeno, telefon, email, predani, adresa, poznamka, zdroj,
     polozky = JSON [ { id, nazev, varianta, pocet, cena, celkem } ]

   Z položek se bere jen „id“ a „pocet“. Název, variantu a cenu
   skript dohledá v Ceníku, takže cenu podvrženou z prohlížeče
   nepřevezme. Když se cena mezitím v Ceníku změnila, platí Ceník.

   Odpověď: { ok: true, cislo: "OBJ-007", celkem: 390 }
        nebo { ok: false, chyba: "…" }
   Apps Script vrací HTTP 200 i při chybě, proto web musí číst „ok“.
   ================================================================= */

function doPost(e) {
  const zamek = LockService.getScriptLock();
  let zamceno = false;
  try {
    const objednavka = pripravObjednavku((e && e.parameter) || {});

    // Zámek brání tomu, aby dvě souběžné objednávky dostaly stejné číslo
    // nebo se zapsaly do stejného řádku.
    zamceno = zamek.tryLock(30000);
    if (!zamceno) throw new Error('Tabulka je právě zaneprázdněná, zkuste to prosím znovu.');

    const cislo = zapisObjednavku(objednavka);
    return json({ ok: true, cislo: cislo, celkem: objednavka.celkem });
  } catch (chyba) {
    console.error(chyba);
    return json({ ok: false, chyba: zprava(chyba) });
  } finally {
    if (zamceno) zamek.releaseLock();
  }
}


/* =================================================================
   CENÍK
   ================================================================= */

/**
 * Načte list Ceník a vrátí všechny platné řádky (i neaktivní),
 * seřazené podle Pořadí. Prázdné řádky a řádky bez ceny přeskočí.
 *
 * Popis a ikona patří celému produktu: stačí je vyplnit u jedné
 * varianty a skript je doplní i ostatním variantám téhož produktu.
 */
function nactiCenik() {
  const cil = otevriList('cenik');
  const sloupce = cil.sloupce;
  const pocetRadku = cil.list.getLastRow() - 1;
  if (pocetRadku < 1) return [];

  const data = cil.list.getRange(2, 1, pocetRadku, cil.list.getLastColumn()).getValues();
  const bunka = (radek, pole) => (sloupce[pole] ? radek[sloupce[pole] - 1] : '');

  const radky = [];
  const videnaId = {};

  data.forEach((radek, i) => {
    const cisloRadku = i + 2;
    const produkt = text(bunka(radek, 'produkt'));
    if (!produkt) return;  // prázdný řádek

    const varianta = text(bunka(radek, 'varianta'));
    const cena = castka(bunka(radek, 'cena'));
    if (!(cena > 0)) {
      console.warn('Ceník, řádek ' + cisloRadku + ': chybí cena, řádek přeskakuji.');
      return;
    }

    const id = varianta ? slug(produkt) + '-' + slug(varianta) : slug(produkt);
    if (videnaId[id]) {
      console.warn('Ceník, řádek ' + cisloRadku + ': „' + produkt + ' ' + varianta + '“ je v ceníku dvakrát, beru jen první výskyt.');
      return;
    }
    videnaId[id] = true;

    const poradi = castka(bunka(radek, 'poradi'));
    radky.push({
      id: id,
      kategorie: text(bunka(radek, 'kategorie')) || 'Ostatní',
      produkt: produkt,
      varianta: varianta,
      cena: cena,
      popis: text(bunka(radek, 'popis')),
      ikona: text(bunka(radek, 'ikona')),
      // bez sloupce Aktivní se zobrazuje všechno
      aktivni: sloupce.aktivni ? jeAno(bunka(radek, 'aktivni')) : true,
      poradi: isFinite(poradi) ? poradi : Infinity,
      radek: cisloRadku
    });
  });

  // Podle Pořadí; při shodě (nebo bez pořadí) podle řádku v tabulce.
  radky.sort((a, b) => (a.poradi - b.poradi) || (a.radek - b.radek));

  // Popis a ikona za celý produkt: první vyplněná hodnota napříč variantami.
  const zaProdukt = {};
  radky.forEach((r) => {
    const klic = r.kategorie + '|' + r.produkt;
    const p = zaProdukt[klic] || (zaProdukt[klic] = { popis: '', ikona: '' });
    if (!p.popis && r.popis) p.popis = r.popis;
    if (!p.ikona && r.ikona) p.ikona = r.ikona;
  });
  radky.forEach((r) => {
    const p = zaProdukt[r.kategorie + '|' + r.produkt];
    r.popis = p.popis;
    r.ikona = p.ikona;
  });

  return radky;
}


/* =================================================================
   OBJEDNÁVKA
   ================================================================= */

/**
 * Zkontroluje data z formuláře a dopočítá položky podle Ceníku.
 * Při jakékoli nesrovnalosti vyhodí chybu, nic se nezapíše.
 */
function pripravObjednavku(p) {
  const jmeno = omez(p.jmeno, 200);
  const telefon = omez(p.telefon, 50);
  if (!jmeno || !telefon) throw new Error('Chybí jméno nebo telefon.');

  let vstup;
  try {
    vstup = JSON.parse(p.polozky || '[]');
  } catch (_) {
    throw new Error('Položky objednávky nejdou přečíst.');
  }
  if (!Array.isArray(vstup) || !vstup.length) throw new Error('Objednávka neobsahuje žádné položky.');
  if (vstup.length > MAX_POLOZEK) throw new Error('Objednávka má příliš mnoho položek.');

  // Ceník včetně neaktivních řádků: když mamka produkt vypne ve chvíli,
  // kdy ho má zákaznice v košíku, objednávka i tak projde.
  const cenik = {};
  nactiCenik().forEach((r) => { cenik[r.id] = r; });

  const polozky = vstup.map((v) => {
    const r = cenik[String(v && v.id)];
    if (!r) {
      const nazev = v ? [v.nazev, v.varianta].filter(Boolean).join(' ') : '';
      throw new Error('Položka „' + (nazev || '?') + '“ už v ceníku není. Načtěte prosím stránku znovu.');
    }
    const pocet = Number(v.pocet);
    if (!Number.isInteger(pocet) || pocet < 1 || pocet > MAX_KUSU) {
      throw new Error('Neplatný počet kusů u položky „' + r.produkt + '“.');
    }
    return {
      id: r.id,
      kategorie: r.kategorie,
      produkt: r.produkt,
      varianta: r.varianta,
      pocet: pocet,
      cena: r.cena,
      celkem: zaokrouhli(pocet * r.cena)
    };
  });

  return {
    jmeno: jmeno,
    telefon: telefon,
    email: omez(p.email, 200),
    predani: omez(p.predani, 50),
    adresa: omez(p.adresa, 500),
    poznamka: omez(p.poznamka, 2000),
    zdroj: omez(p.zdroj, 50) || 'web',
    polozky: polozky,
    celkem: zaokrouhli(polozky.reduce((s, x) => s + x.celkem, 0)),
    // čitelný souhrn do jedné buňky, např. „Měsíčková mast / balzám 30 ml ×2; …“
    objednano: polozky
      .map((x) => x.produkt + (x.varianta ? ' ' + x.varianta : '') + ' ×' + x.pocet)
      .join('; ')
  };
}

/**
 * Zapíše objednávku do listů Objednávky a Položky.
 * Volá se jen pod zámkem (viz doPost). Vrací číslo objednávky.
 */
function zapisObjednavku(o) {
  const objednavky = otevriList('objednavky');
  const polozky = otevriList('polozky');

  // Nejvyšší číslo z Objednávek i Položek: když se objednávka smaže jen
  // v Objednávkách, její řádky v Položkách by se jinak přilepily k nové
  // objednávce se stejným číslem a K výrobě by je počítalo.
  const posledni = Math.max(nejvyssiCislo(objednavky), nejvyssiCislo(polozky));
  const cislo = PREFIX_CISLA + String(posledni + 1).padStart(3, '0');
  const datum = new Date();

  // Texty od zákaznice jdou do buněk jako text (viz jakoText),
  // aby se „+420…“ nebo „=…“ nevyhodnotily jako číslo či vzorec.
  zapisRadky(objednavky, [{
    cislo: cislo,
    datum: datum,
    jmeno: jakoText(o.jmeno),
    telefon: jakoText(o.telefon),
    email: jakoText(o.email),
    predani: jakoText(o.predani),
    adresa: jakoText(o.adresa),
    poznamka: jakoText(o.poznamka),
    objednano: jakoText(o.objednano),
    celkem: o.celkem,
    zdroj: jakoText(o.zdroj),
    stav: VYCHOZI_STAV,
    zaplaceno: false
  }]);

  zapisRadky(polozky, o.polozky.map((x) => ({
    cislo: cislo,
    datum: datum,
    kategorie: jakoText(x.kategorie),
    produkt: jakoText(x.produkt),
    varianta: jakoText(x.varianta),
    pocet: x.pocet,
    cena: x.cena,
    celkem: x.celkem,
    id: x.id
  })));

  SpreadsheetApp.flush();
  return cislo;
}

/** Nejvyšší pořadové číslo, které už v listu je (OBJ-012 → 12). */
function nejvyssiCislo(cil) {
  const hodnoty = hodnotySloupce(cil, 'cislo');
  let max = 0;
  hodnoty.forEach((v) => {
    const m = /(\d+)\s*$/.exec(String(v));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max;
}


/* =================================================================
   PRÁCE S LISTY
   ================================================================= */

/**
 * Najde list a v jeho hlavičce sloupce podle SLOUPCE[druh].
 * Vrací { list, sloupce: { pole: číslo sloupce od 1 } }.
 */
function otevriList(druh) {
  const list = SpreadsheetApp.openById(ID_TABULKY).getSheetByName(LISTY[druh]);
  if (!list) throw new Error('V tabulce chybí list „' + LISTY[druh] + '“.');

  const posledni = list.getLastColumn();
  const hlavicka = posledni ? list.getRange(1, 1, 1, posledni).getDisplayValues()[0] : [];

  const podleNazvu = {};
  hlavicka.forEach((nazev, i) => {
    const k = klicSloupce(nazev);
    if (k && !(k in podleNazvu)) podleNazvu[k] = i + 1;
  });

  const sloupce = {};
  Object.keys(SLOUPCE[druh]).forEach((pole) => {
    const k = klicSloupce(SLOUPCE[druh][pole]);
    if (k in podleNazvu) sloupce[pole] = podleNazvu[k];
  });

  const chybi = POVINNE[druh].filter((pole) => !sloupce[pole]);
  if (chybi.length) {
    throw new Error('V listu „' + LISTY[druh] + '“ chybí sloupce: ' +
      chybi.map((pole) => SLOUPCE[druh][pole]).join(', ') + '.');
  }
  return { list: list, sloupce: sloupce };
}

/** Hodnoty jednoho sloupce od řádku 2 dolů. */
function hodnotySloupce(cil, pole) {
  const posledni = cil.list.getLastRow();
  if (posledni < 2) return [];
  return cil.list.getRange(2, cil.sloupce[pole], posledni - 1, 1).getValues().map((r) => r[0]);
}

/**
 * První volný řádek podle sloupce „Číslo objednávky“.
 * Záměrně se nepoužívá appendRow ani getLastRow: zaškrtávací políčka
 * nebo vzorce v ostatních sloupcích by poslaly zápis až na konec listu.
 */
function prvniVolnyRadek(cil) {
  const hodnoty = hodnotySloupce(cil, 'cislo');
  for (let i = hodnoty.length - 1; i >= 0; i--) {
    if (hodnoty[i] !== '' && hodnoty[i] !== null) return i + 3;
  }
  return 2;
}

/**
 * Zapíše záznamy (objekty { pole: hodnota }) pod poslední objednávku.
 * Píše jen do sloupců, které zná; sousední sloupce se vzorci nebo
 * ručními poznámkami nechá být.
 */
function zapisRadky(cil, zaznamy) {
  if (!zaznamy.length) return;
  const list = cil.list;
  const sloupce = cil.sloupce;

  const start = prvniVolnyRadek(cil);
  const konec = start + zaznamy.length - 1;
  if (konec > list.getMaxRows()) list.insertRowsAfter(list.getMaxRows(), konec - list.getMaxRows());

  // Známé sloupce rozdělené do souvislých úseků; každý úsek = jeden zápis.
  const pole = Object.keys(sloupce).sort((a, b) => sloupce[a] - sloupce[b]);
  const useky = [];
  pole.forEach((p) => {
    const posledni = useky[useky.length - 1];
    if (posledni && sloupce[p] === posledni.konec + 1) {
      posledni.pole.push(p);
      posledni.konec = sloupce[p];
    } else {
      useky.push({ zacatek: sloupce[p], konec: sloupce[p], pole: [p] });
    }
  });

  useky.forEach((u) => {
    const hodnoty = zaznamy.map((z) => u.pole.map((p) => (p in z ? z[p] : '')));
    list.getRange(start, u.zacatek, zaznamy.length, u.pole.length).setValues(hodnoty);
  });
}


/* =================================================================
   POMOCNÉ FUNKCE
   ================================================================= */

const DIAKRITIKA = {
  'á': 'a', 'ä': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i',
  'ľ': 'l', 'ĺ': 'l', 'ň': 'n', 'ó': 'o', 'ô': 'o', 'ö': 'o', 'ř': 'r',
  'ŕ': 'r', 'š': 's', 'ť': 't', 'ú': 'u', 'ů': 'u', 'ü': 'u', 'ý': 'y', 'ž': 'z'
};

/** Malá písmena bez české a slovenské diakritiky. */
function bezDiakritiky(hodnota) {
  return String(hodnota).toLowerCase().replace(/[^\u0000-\u007f]/g, (z) => DIAKRITIKA[z] || z);
}

/** Klíč pro porovnání názvů sloupců: „Celkem (Kč)“ → „celkemkc“. */
function klicSloupce(nazev) {
  return bezDiakritiky(nazev).replace(/[^a-z0-9]/g, '');
}

/** Část id: „Měsíčková mast / balzám“ → „mesickova-mast-balzam“. */
function slug(hodnota) {
  return bezDiakritiky(hodnota).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Hodnota buňky jako oříznutý text. */
function text(hodnota) {
  return hodnota === null || hodnota === undefined ? '' : String(hodnota).trim();
}

/** Text od uživatele: oříznutý a zkrácený na max. délku. */
function omez(hodnota, max) {
  return text(hodnota).slice(0, max);
}

/**
 * Částka z buňky: číslo nechá, text jako „1 290 Kč“ nebo „12,50“
 * převede. Když to číslo není, vrátí NaN.
 */
function castka(hodnota) {
  if (typeof hodnota === 'number') return hodnota;
  const t = text(hodnota).replace(/\s|kč/gi, '').replace(',', '.');
  return t === '' ? NaN : Number(t);
}

/** Zaškrtnuté políčko, TRUE, „ano“, „x“, „1“ … → true. */
function jeAno(hodnota) {
  if (hodnota === true) return true;
  return /^(true|ano|a|x|1|yes|✓|✔)$/i.test(text(hodnota));
}

/** Zaokrouhlení na haléře (kvůli desetinným cenám). */
function zaokrouhli(cislo) {
  return Math.round(cislo * 100) / 100;
}

/**
 * Apostrof na začátku řekne tabulce „tohle je text“: hodnota se uloží
 * bez apostrofu, ale „+420 …“ nezačne být číslem a „=…“ vzorcem.
 */
function jakoText(hodnota) {
  return hodnota ? "'" + hodnota : '';
}

/** Text chyby pro odpověď. */
function zprava(chyba) {
  return String((chyba && chyba.message) || chyba);
}

/** JSON odpověď pro web. */
function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


/* =================================================================
   RUČNÍ TESTY Z EDITORU
   Vyber funkci v liště nahoře a klikni na Spustit. Výsledek je
   v Protokolu provádění. První spuštění si vyžádá oprávnění.
   ================================================================= */

/** Vypíše, co web dostane z doGet. Nic nezapisuje. */
function testCenik() {
  console.log(doGet().getContent());
}

/**
 * Zapíše ZKUŠEBNÍ objednávku (2 kusy prvního aktivního produktu).
 * Cena je schválně podvržená na 1 Kč — v tabulce musí být cena z Ceníku.
 * Po kontrole oba řádky (v Objednávkách i Položkách) smaž.
 */
function testObjednavka() {
  const prvni = nactiCenik().find((r) => r.aktivni);
  if (!prvni) throw new Error('V Ceníku není žádný aktivní produkt.');
  const odpoved = doPost({
    parameter: {
      jmeno: 'TEST – smazat',
      telefon: '+420 000 000 000',
      email: '',
      predani: 'Osobně',
      adresa: '',
      poznamka: 'Zkušební objednávka z editoru',
      zdroj: 'test',
      polozky: JSON.stringify([
        { id: prvni.id, nazev: prvni.produkt, varianta: prvni.varianta, pocet: 2, cena: 1, celkem: 2 }
      ])
    }
  });
  console.log(odpoved.getContent());
}
