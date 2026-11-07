# Úprava tabulky „Objednávky – Apatiqa Natura“

Zadání pro Clauda s přístupem ke Google Sheets. Celé ho zkopíruj do
konverzace s Claudem, který má připojený Google Drive / Sheets.

---

Uprav prosím Google tabulku
https://docs.google.com/spreadsheets/d/1P6o3TitO6AAj8HUkCom7DNztkKcQo_IriAUA3kQkWWw/edit

## Kontext

Tabulka vznikla jako odpovědi z Google Formuláře (list „Form Responses 1“:
co produkt, to sloupec). Objednávky teď místo formuláře posílá web přes
Apps Script, který zapisuje **jeden řádek na objednávku** do listu
„Objednávky“ a **jeden řádek na položku** do listu „Položky“. Ceny a
produkty čte web z listu „Ceník“, který edituje majitelka (netechnická).
List „K výrobě“ sčítá, kolik kusů čeho vyrobit.

Apps Script hledá sloupce **podle textu v hlavičce (řádek 1)**. Názvy listů
a hlaviček proto napiš přesně, jak jsou níž, včetně diakritiky a závorek.

Tabulka je teď v locale en_US: vzorce zadávej s čárkou mezi argumenty
a středníkem mezi řádky pole. Locale přepni až úplně na konci (krok 7).

## Pravidla

- Na list **„Form Responses 1“ nesahej** — je napojený na Google Formulář,
  odpojí ho ručně Daniel. Neměň ho, nemaž, nepřejmenovávej.
- Do listů Objednávky a Položky **nepiš od řádku 2 žádná data ani vzorce**
  (výjimka: zkušební řádky v kroku 8, které pak smažeš). Rozbalovací seznam
  a zaškrtávací políčka nastav jen jako ověření dat, hodnoty nevyplňuj.
- Časové pásmo (Europe/Prague) neměň.
- Když něco nejde udělat přesně podle zadání, nehledej obezličku — zastav
  se a napiš, co a proč.

## 1. List „Objednávky“ (nový)

Vytvoř list „Objednávky“. Hlavička A1:N1:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Číslo objednávky | Datum | Jméno a příjmení | Telefon | E-mail | Způsob předání | Adresa | Poznámka | Objednáno | Celkem (Kč) | Zdroj | Stav | Zaplaceno | Termín předání |

- Řádek 1 tučně a zmrazený.
- B2:B formát data a času `d.m.yyyy h:mm` (zobrazí se např. 7.11.2026 14:05).
- J2:J formát `#,##0 "Kč"`.
- L2:L ověření dat — rozbalovací seznam (striktní, s šipkou):
  `Ke zpracování`, `Ve výrobě`, `Vyrobeno`, `Doručeno`.
- L2:L podmíněné formátování, barva pozadí podle textu (stejné jako ve
  starém listu): Ke zpracování `#FCE8E6`, Ve výrobě `#FEF7E0`,
  Vyrobeno `#E6F4EA`, Doručeno `#E8F0FE`.
- M2:M ověření dat — zaškrtávací políčko.
- N2:N bez ověření (majitelka sem píše volný text, třeba „sobota odpoledne“).
- H a I zalamovat text, šířky sloupců nastav rozumně pro čtení.

Sloupce L, M, N vyplňuje majitelka ručně. Skript při nové objednávce zapíše
do L „Ke zpracování“ a do M nezaškrtnuto.

## 2. List „Položky“ (nový)

Vytvoř list „Položky“. Hlavička A1:I1:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Číslo objednávky | Datum | Kategorie | Produkt | Varianta | Počet | Cena za kus (Kč) | Celkem (Kč) | ID |

Do J1 vlož vzorec, který vypíše hlavičku „Stav objednávky“ a pod ni stav
objednávky dohledaný v listu Objednávky:

```
={"Stav objednávky"; ARRAYFORMULA(IF(A2:A="", "", IFERROR(VLOOKUP(A2:A, 'Objednávky'!A2:L, 12, FALSE), "")))}
```

- Řádek 1 tučně a zmrazený.
- B2:B formát `d.m.yyyy h:mm`, G2:H formát `#,##0 "Kč"`.

## 3. List „Ceník“ (z prázdného „List 1“)

Přejmenuj prázdný list „List 1“ na „Ceník“. Hlavička A1:I1:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Kategorie | Produkt | Varianta | Cena | Popis | Ikona | Aktivní | Pořadí | Ks z dávky |

- Řádek 1 tučně a zmrazený.
- D2:D formát `#,##0 "Kč"` (hodnota zůstane číslo).
- G2:G ověření dat — zaškrtávací políčko pro celý sloupec, u 38 řádků níž zaškrtnuto (TRUE).
- E2:E zalamovat text.
- Poznámky (notes) k buňkám hlavičky, aby majitelka věděla, co kam:
  - D1: „Cena v Kč, jen číslo.“
  - E1: „Stačí vyplnit u jedné varianty produktu, web ho ukáže u všech.“
  - F1: „Název obrázku ve složce assets/ na webu, např. mesickova.png. Stačí u jedné varianty.“
  - G1: „Nezaškrtnuté = na webu se nezobrazí.“
  - H1: „Menší číslo = výš na webu. Čísluje se po 10, aby šlo něco vložit mezi.“
  - I1: „Kolik kusů vyjde z jedné várky. Na web se nepropisuje, používá ho list K výrobě.“

Data od řádku 2 (38 řádků, přesně takhle — názvy musí sedět s webem).
Prázdná buňka v tabulce = nech buňku prázdnou. Aktivní TRUE = zaškrtnuto.

| Kategorie | Produkt | Varianta | Cena | Popis | Ikona | Aktivní | Pořadí | Ks z dávky |
|---|---|---|---|---|---|---|---|---|
| Masti a balzámy | Měsíčková mast / balzám | 30 ml | 130 | Hojí rány a popraskaniny, péče o citlivou a podrážděnou pokožku, zklidňuje záněty, podporuje regeneraci. | mesickova.png | TRUE | 10 |  |
| Masti a balzámy | Měsíčková mast / balzám | 50 ml | 200 |  |  | TRUE | 20 |  |
| Masti a balzámy | Heřmánková mast / balzám | 30 ml | 130 | Má protizánětlivé, antiseptické a regenerační účinky. | hermankova.png | TRUE | 30 |  |
| Masti a balzámy | Heřmánková mast / balzám | 50 ml | 200 |  |  | TRUE | 40 |  |
| Masti a balzámy | Levandulová mast / balzám | 30 ml | 130 | Má zklidňující a regenerační účinky, podpora hojení drobných ran. | levandulova.png | TRUE | 50 |  |
| Masti a balzámy | Levandulová mast / balzám | 50 ml | 200 |  |  | TRUE | 60 |  |
| Masti a balzámy | Řepíková mast / balzám | 30 ml | 130 | Má silné protizánětlivé, regenerační a stahující účinky, úleva od potíží s hemoroidy. | repikova.png | TRUE | 70 |  |
| Masti a balzámy | Řepíková mast / balzám | 50 ml | 200 |  |  | TRUE | 80 |  |
| Masti a balzámy | Rozmarýnová mast / balzám | 30 ml | 130 | Působí příznivě na pohybový aparát – bolesti kloubů, svalů, zad a šlach, při revmatismu, artritidě, při bolestech hlavy či migréně, při respiračních potížích. | rozmarynova.png | TRUE | 90 |  |
| Masti a balzámy | Rozmarýnová mast / balzám | 50 ml | 200 |  |  | TRUE | 100 |  |
| Masti a balzámy | Tymiánová mast / balzám | 30 ml | 130 | Podporuje normální stav dýchacích cest, harmonii a klidný spánek. Vhodná při nachlazení. | tymianova.png | TRUE | 110 |  |
| Masti a balzámy | Tymiánová mast / balzám | 50 ml | 200 |  |  | TRUE | 120 |  |
| Masti a balzámy | Řebříčková mast / balzám | 30 ml | 130 | Podporuje přirozenou regeneraci pokožky, chrání, zklidňuje a vyživuje suchou pokožku, působí příznivě na rozpraskané paty a na péči o anální oblast. | rebrickova.png | TRUE | 130 |  |
| Masti a balzámy | Řebříčková mast / balzám | 50 ml | 200 |  |  | TRUE | 140 |  |
| Masti a balzámy | Kopřivová mast / balzám | 30 ml | 130 | Podporuje zdraví pokožky, kloubů a svalů. Pomáhá při revmatismu, ztuhlosti a bolesti kloubů i zad, protizánětlivě, zjemňuje. | koprivova.png | TRUE | 150 |  |
| Masti a balzámy | Kopřivová mast / balzám | 50 ml | 200 |  |  | TRUE | 160 |  |
| Masti a balzámy | Třezalková mast / balzám | 30 ml | 130 | Pomáhá při drobných popáleninách (i od slunce), ekzémech, ulevuje při ztuhlých svalech, bolestech zad. | trezalkova.png | TRUE | 170 |  |
| Masti a balzámy | Třezalková mast / balzám | 50 ml | 200 |  |  | TRUE | 180 |  |
| Masti a balzámy | Kostivalová mast / balzám | 30 ml | 130 | Pro podporu zdraví pohybové soustavy – klouby, kosti, svaly, šlachy, meziobratlové ploténky, při zlomeninách, výronech, vstřebávání podlitin a modřin. | kostivalova.png | TRUE | 190 |  |
| Masti a balzámy | Kostivalová mast / balzám | 50 ml | 200 |  |  | TRUE | 200 |  |
| Masti a balzámy | Kaštanová mast / gel / balzám | 30 ml | 135 | Žíly a cévní potíže, hemoroidy, otoky, těžké nohy, křečové žíly, pohmožděniny, podlitiny. | kastanova.png | TRUE | 210 |  |
| Masti a balzámy | Kaštanová mast / gel / balzám | 50 ml | 200 |  |  | TRUE | 220 |  |
| Péče o vlasy | Heřmánkový šampuk | 50 g | 145 | Pevný šampon s drceným heřmánkem. |  | TRUE | 230 |  |
| Péče o vlasy | Kopřivový šampuk | 50 g | 145 |  |  | TRUE | 240 |  |
| Péče o vlasy | Levandulový šampuk | 50 g | 145 |  |  | TRUE | 250 |  |
| Péče o vlasy | Měsíčkový šampuk | 50 g | 145 |  |  | TRUE | 260 |  |
| Péče o vlasy | Čokoládový šampuk | 50 g | 145 |  |  | TRUE | 270 |  |
| Péče o vlasy | Přesličkový šampuk | 50 g | 145 |  |  | TRUE | 280 |  |
| Péče o vlasy | Tuhý kondicionér s arganovým olejem | 30 g | 85 | Vyživuje, usnadňuje rozčesávání a zanechává vlasy hebké a lesklé. |  | TRUE | 290 |  |
| Péče o pleť | Hydratační květové sérum | 30 ml | 185 | Sjednocuje tón pleti, snižuje zarudnutí, potlačuje fliky, reguluje ztrátu pevnosti pleti. |  | TRUE | 300 |  |
| Péče o pleť | Pleťový krém s bakuchiolem | 30 ml | 249 | Podporuje obnovu pleti, zlepšuje její texturu, vyhlazuje jemné vrásky a sjednocuje tón pleti. |  | TRUE | 310 |  |
| Péče o pleť | Odličovací olej | 10 ml | 69 | Šetrně odstraňuje make-up i nečistoty, přitom pleť vyživuje a zanechává hebkou. |  | TRUE | 320 |  |
| Péče o pleť | Pomerančový balzám na rty | 15 ml | 89 | Vyživuje, zklidňuje a chrání rty, zanechává je hebké a jemně vonící. |  | TRUE | 330 |  |
| Péče o pleť | Lesk na rty s pečujícími oleji | 10 ml | 119 | Vyživuje, zklidňuje a chrání rty, zanechává je hebké a jemně lesklé. |  | TRUE | 340 |  |
| Péče o tělo | Třezalkový olej | 50 ml | 75 | Na popáleniny, po slunění, na bolesti svalů a pro přirozenou regeneraci pokožky. |  | TRUE | 350 |  |
| Péče o tělo | Peelingové mýdlo kávové se skořicí | 70 g | 95 | S kávovými zrníčky. |  | TRUE | 360 |  |
| Péče o tělo | Přírodní tuhý deodorant | 15 ml | 89 | Ve vysouvací tyčince. |  | TRUE | 370 |  |
| Péče o tělo | Přírodní repelent | 50 ml | 230 | Nastříkat na pokožku, nebo na oblečení. |  | TRUE | 380 |  |

## 4. List „K výrobě“ (přestavět)

Stávající obsah sčítá sloupce ze starého formulářového listu. Vymaž celý
obsah listu (hodnoty i vzorce), list samotný nech. Nová hlavička A1:F1:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Kategorie | Produkt | Varianta | Kusů k výrobě | Ks z dávky | Dávek uvařit |

Vzorce (každý se rozlije dolů sám, do ostatních buněk nic nepiš):

A2 — všechny řádky Ceníku (i neaktivní) seřazené podle Pořadí:
```
=CHOOSECOLS(SORT(FILTER({'Ceník'!A2:C, 'Ceník'!H2:I}, 'Ceník'!B2:B<>""), 4, TRUE), 1, 2, 3)
```

D2 — kusy z objednávek, které jsou „Ke zpracování“ nebo „Ve výrobě“:
```
=MAP(B2:B, C2:C, LAMBDA(p, v, IF(p="", "", SUMIFS('Položky'!F:F, 'Položky'!D:D, p, 'Položky'!E:E, v, 'Položky'!J:J, "Ke zpracování") + SUMIFS('Položky'!F:F, 'Položky'!D:D, p, 'Položky'!E:E, v, 'Položky'!J:J, "Ve výrobě"))))
```

E2 — Ks z dávky z Ceníku (stejné řazení jako A2):
```
=CHOOSECOLS(SORT(FILTER({'Ceník'!A2:C, 'Ceník'!H2:I}, 'Ceník'!B2:B<>""), 4, TRUE), 5)
```

F2 — kolik várek uvařit:
```
=MAP(D2:D, E2:E, LAMBDA(k, d, IF(OR(k="", d=""), "", IFERROR(ROUNDUP(k/d), ""))))
```

- Řádek 1 tučně a zmrazený.

## 5. Ochrana hlaviček

Nastav chráněné rozsahy **jen s upozorněním** (warning only, nikoho
neblokují): řádek 1 v listech Objednávky, Položky a Ceník a celý list
K výrobě. Popis: „Hlavičky čte web — neměnit názvy.“

## 6. Pořadí listů

Objednávky, Položky, K výrobě, Ceník, Form Responses 1.

## 7. Locale

Nastav locale tabulky na Česko (cs_CZ). Ověř, že vzorce dál fungují
a datum se zobrazuje česky.

## 8. Ověření

1. Ceník má 38 řádků, K výrobě ukazuje 38 řádků ve stejném pořadí
   jako Ceník, ve sloupci D samé nuly.
2. Zkušební data:
   - Objednávky, řádek 2: A2 `TEST-1`, L2 `Ke zpracování`.
   - Položky, řádek 2: A2 `TEST-1`, D2 `Měsíčková mast / balzám`, E2 `30 ml`, F2 `3`.
   - Ceník: u „Měsíčková mast / balzám“ 30 ml dej do Ks z dávky `2`.
3. Zkontroluj: Položky J2 = „Ke zpracování“; v K výrobě u Měsíčková
   30 ml D = 3, E = 2, F = 2; u Měsíčková 50 ml D = 0.
4. Změň Objednávky L2 na `Doručeno` → K výrobě D u Měsíčková 30 ml = 0.
5. Úklid: smaž **celé řádky** 2 v Objednávkách i v Položkách
   (ne jen obsah) a vymaž Ks z dávky v Ceníku. Ověř, že J1 v Položkách
   a vzorce v K výrobě dál fungují.

## 9. Výstup

Napiš krátce:
- seznam listů v pořadí a text řádku 1 u každého,
- výsledek kroků 8.1–8.5,
- cokoli, co jsi musel udělat jinak, než tu stojí, a proč.
