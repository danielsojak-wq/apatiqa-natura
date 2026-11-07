# Zadání pro Claude Code

Tenhle balíček je hotový front end podle schváleného návrhu. Nestav ho znovu —
naváž na něj.

## Co v repu je

```
index.html     hotová struktura stránky
styles.css     barvy, typografie, responzivita (mobile first)
app.js         katalog, výběr množství, souhrn, odeslání
assets/        15 obrázků vyříznutých z tištěného ceníku
```

Otevři `index.html` v prohlížeči — běží to. Formulář zatím jen vypíše do konzole,
co by odeslal, protože `ENDPOINT` v `app.js` je prázdný.

## Co zbývá dodělat

### 1. Apps Script endpoint

Vytvoř `apps-script/Code.gs` s `doPost` a `doGet`. Zapisuje do Google Sheetu
„Objednávky – Apatiqa Natura".

`doPost` přijme `URLSearchParams` tělo s poli:
`jmeno`, `telefon`, `email`, `predani`, `adresa`, `poznamka`, `zdroj`
a `polozky` jako JSON pole objektů `{ id, nazev, varianta, pocet, cena, celkem }`.

Zápis rozděl do dvou listů:
- **Objednávky** — jeden řádek na objednávku: číslo objednávky (generuje skript,
  ne klient), časová značka, kontakt, předání, adresa, poznámka, celková částka,
  zdroj, a prázdné sloupce Stav / Zaplaceno / Termín předání
- **Položky** — jeden řádek na položku, provázané číslem objednávky

Deploy: Execute as **Me**, Who has access: **Anyone**. Vzniklou URL vlož do
`ENDPOINT` v `app.js`.

### 2. Ceník z tabulky

Teď je katalog napevno v `app.js` v konstantě `KATALOG`. Cílový stav: mamka
edituje produkty a ceny v listu **Ceník** a stránka je načte při loadu.

`doGet` vrací JSON:

```json
{ "produkty": [ { "kategorie": "Masti a balzámy", "produkt": "Měsíčková mast / balzám",
  "varianta": "30 ml", "cena": 130, "popis": "...", "ikona": "mesickova.png",
  "aktivni": true, "poradi": 1 } ] }
```

Při přepojení zachovej tvar `{ id, label, cena }` u variant — na něm stojí
výběr množství i souhrn. Dokud fetch neskončí, nech viditelný text „Načítám
ceník…"; když selže, zobraz telefonní kontakt jako záchranu.

### 3. Nasazení

- Settings → Pages, zdroj `main` / root
- Custom domain `apatiqanatura.cz`, po vystavení certifikátu zapnout Enforce HTTPS
- DNS u Webglobe: čtyři A záznamy na apex (185.199.108–111.153) a CNAME
  `www` → `danielsojak-wq.github.io`. Staré přesměrování i starý A záznam smazat.

## Na co nesahat

- **Pořadí a názvy polí odesílaných na endpoint** — musí sedět se strukturou
  v Sheetu, kde už mamka odškrtává stavy.
- **Způsob odeslání.** Tělo jde jako `URLSearchParams` a `Content-Type` se
  nenastavuje ručně. Apps Script neumí odbavit CORS preflight; jakmile hlavičku
  přidáš, request přestane procházet.
- **Potvrzení po odeslání.** Funkce `hotovo()` vyčistí formulář i množství
  a napíše potvrzení. Tohle musí fungovat spolehlivě, jinak lidi objednají dvakrát.

## Poznámka k obrázkům

Výřezy pocházejí z tištěného ceníku, který má 1024 px na šířku. V současných
velikostech jsou v pořádku, větší je nedělej. Bylinné ilustrace má jen 11 mastí,
ostatní kategorie zatím bez obrázků — až budou fotky produktů, doplní se do
`assets/` a přes pole `ikona`.
