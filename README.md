# Apatiqa Natura — web s ceníkem a objednávkami

Jednostránkový web **apatiqanatura.cz**. Zákaznice si na něm vybere produkty
z ceníku a pošle objednávku. Ceny a produkty se upravují v Google tabulce
a objednávky se do stejné tabulky zapisují.

| Co | Kde |
|---|---|
| Web | https://apatiqanatura.cz |
| Kód webu (repozitář) | https://github.com/danielsojak-wq/apatiqa-natura |
| Tabulka „Objednávky – Apatiqa Natura“ | https://docs.google.com/spreadsheets/d/1P6o3TitO6AAj8HUkCom7DNztkKcQo_IriAUA3kQkWWw/edit |
| Apps Script (skript mezi webem a tabulkou) | v tabulce menu **Rozšíření → Apps Script** (Extensions → Apps Script) |
| Doména a DNS | administrace Webglobe |

**Co chci změnit → kde**

| Chci změnit | Kde | Kapitola |
|---|---|---|
| cenu, produkt, popis, pořadí, schovat produkt | tabulka, list **Ceník** | 6 |
| texty a vzhled stránky | `index.html`, `styles.css` v repozitáři | — |
| co skript dělá s objednávkou | Apps Script, pak nové verze nasazení | 2 |
| adresu skriptu, kterou web volá | `app.js`, konstanta `ENDPOINT` | 3 |
| doménu | GitHub Pages + DNS u Webglobe | 4, 5 |

---

## 1. Co je co

Tři části, každá běží jinde:

| Část | Kde běží | Co dělá |
|---|---|---|
| **Web** — `index.html`, `styles.css`, `app.js`, `assets/` | GitHub Pages, z větve `main` | stránka, ceník, výběr množství, formulář |
| **Google tabulka** | Google Drive | ceník, objednávky, položky, přehled k výrobě |
| **Apps Script** — kopie v `apps-script/Code.gs` | Google, jako „webová aplikace“ s vlastní adresou končící `/exec` | prostředník: čte ceník pro web a zapisuje objednávky do tabulky |

Web nemá vlastní server ani databázi. Adresu Apps Scriptu má uloženou
v konstantě `ENDPOINT` na začátku `app.js`.

### Odkud kam tečou data

```
apatiqanatura.cz                    Apps Script (…/exec)             Google tabulka
────────────────                    ────────────────────             ──────────────
načtení stránky    ── dotaz ────▶   doGet   ── čte ─────────────▶    Ceník
                   ◀── ceník ──
odeslání formuláře ── objednávka ▶  doPost  ── zapisuje ────────▶    Objednávky (1 řádek)
                   ◀── ok + číslo                                    Položky (řádek na položku)
                                                                     K výrobě (vzorce, počítá samo)
```

- Při každém načtení stránky si web řekne skriptu o ceník. Skript přečte
  list **Ceník** a vrátí jen produkty se zaškrtnutým **Aktivní**.
- Po odeslání formuláře pošle web skriptu kontakt a vybrané položky. Skript
  přidělí číslo objednávky (`OBJ-001`, `OBJ-002`, … — vždy nejvyšší
  číslo z Objednávek i Položek + 1, takže číslo objednávky, jejíž řádky
  zůstaly v Položkách, se znovu nepoužije), ceny si vezme z Ceníku (ne
  z prohlížeče) a zapíše jeden
  řádek do **Objednávek** a jeden řádek za každou položku do **Položek**.
- Web zobrazí „Děkuji, objednávka dorazila“, jen když skript potvrdí zápis.
  Jinak zobrazí chybu s telefonem.

### Listy v tabulce

| List | Co v něm je | Kdo do něj píše |
|---|---|---|
| **Ceník** | co je na webu a za kolik | mamka (kapitola 6) |
| **Objednávky** | řádek na objednávku | skript; mamka sloupce Stav, Zaplaceno, Termín předání |
| **Položky** (skrytý list) | řádek na objednanou položku, propojené Číslem objednávky; z nich počítá K výrobě | skript; sloupec J (Stav objednávky) je vzorec. Zobrazit: menu Zobrazit → Skryté listy (View → Hidden sheets) |
| **K výrobě** | kolik kusů čeho vyrobit a kolik várek uvařit | nikdo, jen vzorce |
| **Form Responses 1** | pozůstatek starého Google Formuláře, nepoužívá se | — |

### Soubory v repozitáři

| Soubor | Co to je |
|---|---|
| `index.html`, `styles.css` | struktura a vzhled stránky |
| `app.js` | ceník, výběr množství, souhrn, odeslání; nahoře `ENDPOINT` |
| `assets/` | obrázky. Výřezy z tištěného ceníku (1024 px na šířku) — nezvětšovat |
| `apps-script/Code.gs` | **kopie** skriptu. Běží ta verze, která je nasazená v Apps Scriptu. Po každé změně skriptu zkopíruj nový kód i sem, ať se neliší. ID tabulky je v něm v konstantě `ID_TABULKY` |
| `apps-script/UPRAVA-SHEETU.md` | jak se tabulka přestavovala z formuláře na dnešní listy. Historie, znovu nespouštět |
| `PROMPT.md` | původní zadání |
| `CNAME` | vytvoří ho GitHub při nastavení domény (kapitola 4). Nemazat |

---

## 2. Nasazení Apps Scriptu

### Kterým účtem

Skript běží pod účtem, který ho nasadí („Spustit jako: Já“). Ten účet:

- musí mít v tabulce právo **Editor**,
- by měl existovat i za několik let. Pracovní účet, který zanikne s odchodem
  z firmy, vezme skript s sebou a objednávky přestanou chodit,
- u firemních účtů Google Workspace může správce zakázat volbu „Kdokoli“.
  Osobní účet (`@gmail.com`) tohle omezení nemá.

### První nasazení

1. Otevři tabulku → menu **Rozšíření → Apps Script** (Extensions → Apps Script).
   Otevře se editor projektu navázaného na tabulku.
2. Vlevo nahoře klikni na název projektu (**Projekt bez názvu** / Untitled project)
   a přejmenuj ho na `Apatiqa Natura – objednávky`.
3. V souboru `Code.gs` smaž všechno a vlož celý obsah `apps-script/Code.gs`
   z repozitáře. Ulož: **Cmd+S** nebo ikona diskety **Uložit projekt** (Save project).
4. Vyzkoušej čtení ceníku: v liště nad kódem vyber v rozbalovacím seznamu
   funkcí `testCenik` a klikni **Spustit** (Run).
5. Poprvé se objeví okno **Vyžaduje se autorizace** (Authorization required):
   1. **Zkontrolovat oprávnění** (Review permissions),
   2. vyber účet,
   3. u hlášky, že Google aplikaci neověřil, klikni **Rozšířené** (Advanced),
   4. **Přejít na projekt Apatiqa Natura – objednávky (nebezpečné)** (Go to … (unsafe)),
   5. **Povolit** (Allow).

   Hláška o neověřené aplikaci se u vlastních skriptů objevuje vždy.
6. Dole v panelu **Protokol provádění** (Execution log) se vypíše text začínající
   `{"produkty":[{"id":"mesickova-mast-balzam-30-ml",…`. Pokud je tam místo toho
   `"chyba"`, přečti ji a podívej se do kapitoly 7.
7. Vyzkoušej zápis: vyber funkci `testObjednavka` → **Spustit**.
   Protokol vypíše `{"ok":true,"cislo":"OBJ-…"}`. V listu Objednávky přibude
   objednávka „TEST – smazat“ a v Položkách řádek s cenou z Ceníku (ne 1 Kč,
   kterou test schválně podstrčí). Oba řádky smaž celé: pravé tlačítko na číslo
   řádku → **Smazat řádek**.
8. Vpravo nahoře **Nasadit → Nové nasazení** (Deploy → New deployment).
9. Vedle **Vyberte typ** (Select type) klikni na ozubené kolečko →
   **Webová aplikace** (Web app).
10. Vyplň:
    - **Popis** (Description): `Objednávky z webu`
    - **Spustit jako** (Execute as): **Já (tvůj e-mail)** (Me)
    - **Kdo má přístup** (Who has access): **Kdokoli** (Anyone).
      Ne „Kdokoli s účtem Google“ — zákaznice nejsou přihlášené a jejich
      objednávky by neprošly.
11. Klikni **Nasadit** (Deploy). Pokud se znovu ptá na oprávnění, projdi
    stejné kroky jako v bodě 5.
12. Zkopíruj **Adresa URL webové aplikace** (Web app URL). Končí `/exec`.
    Tahle adresa patří do `ENDPOINT` (kapitola 3).
13. Kontrola: otevři tu adresu v anonymním okně prohlížeče. Musí se ukázat
    text začínající `{"produkty":[`.

Proč „Kdokoli“ a „Já“: web volá skript bez přihlášení, takže přístup musí
mít kdokoli. Do tabulky ale skript zapisuje pod tvým účtem, takže zákaznice
k tabulce přístup nemají.

### Úprava skriptu později — adresa se nesmí změnit

**Každé „Nové nasazení“ vytvoří novou adresu (URL).** Web ale volá tu, která
je v `ENDPOINT`. A samotné uložení kódu v editoru na webu nic nezmění —
web volá nasazenou verzi, ne uloženou.

Po každé změně kódu proto:

1. Ulož kód (**Cmd+S**).
2. **Nasadit → Spravovat nasazení** (Deploy → Manage deployments).
3. Vlevo vyber aktivní nasazení „Objednávky z webu“ a nahoře klikni na ikonu
   tužky **Upravit** (Edit).
4. **Verze** (Version) → **Nová verze** (New version). „Spustit jako“
   a „Kdo má přístup“ nech beze změny.
5. **Nasadit** (Deploy). Adresa zůstane stejná, `ENDPOINT` neměníš.
6. Nový kód zkopíruj i do `apps-script/Code.gs` v repozitáři.

Když přesto omylem vznikne nové nasazení s novou adresou: buď novou adresu
dej do `ENDPOINT` (kapitola 3), nebo v **Spravovat nasazení** nové nasazení
archivuj (**Archivovat** / Archive) a uprav původní podle bodů 3–5.

---

## 3. Adresa skriptu v `app.js`

Na začátku souboru `app.js` je řádek:

```js
const ENDPOINT = '';
```

Mezi apostrofy patří adresa z kapitoly 2, bod 12:

```js
const ENDPOINT = 'https://script.google.com/macros/s/AKfy…dlouhé ID…/exec';
```

Úprava přímo na GitHubu, bez počítače s kódem:

1. https://github.com/danielsojak-wq/apatiqa-natura → klikni na soubor `app.js`.
2. Vpravo nad kódem ikona tužky **Edit this file**.
3. Uprav řádek s `ENDPOINT`.
4. Vpravo nahoře **Commit changes…** → v okně znovu **Commit changes**.
5. Záložka **Actions**: běh **pages build and deployment** musí doběhnout
   se zelenou fajfkou (obvykle 1–2 minuty).
6. GitHub Pages si soubory pamatuje až 10 minut. Zkoušej v anonymním okně.

**Čím se to projeví**

- **Platná adresa:** místo „Načítám ceník…“ se objeví ceník z tabulky.
  Odeslaná objednávka přibude v listu Objednávky s číslem `OBJ-…`
  a zákaznice uvidí „Děkuji, objednávka dorazila“.
- **Prázdná nebo neplatná adresa:** místo ceníku hláška, že se ceník
  nepodařilo načíst, a telefon +420 776 349 774. Objednat přes web nejde.
- Adresa musí končit **`/exec`**. Adresa končící `/dev` funguje jen
  přihlášenému autorovi skriptu, zákaznicím ne.

---

## 4. GitHub Pages

Repozitář musí být veřejný (bezplatný GitHub dává Pages jen veřejným
repozitářům). Nic tajného v něm není: adresa skriptu ani ID tabulky nejsou
hesla. **Tabulka ale nesmí být sdílená „Kdokoli s odkazem“** — jsou v ní
jména, telefony a adresy zákaznic. Sdílení zkontroluješ v tabulce tlačítkem
**Sdílet** (Share) → **Obecný přístup** (General access) má být **Omezený** (Restricted).

1. https://github.com/danielsojak-wq/apatiqa-natura → záložka **Settings** →
   v levém menu v sekci *Code and automation* položka **Pages**.
2. **Build and deployment** → **Source**: `Deploy from a branch`.
   **Branch**: `main`, složka `/ (root)` → **Save**.
3. Za 1–2 minuty se nahoře objeví *Your site is live at …*.
4. **Custom domain**: napiš `apatiqanatura.cz` → **Save**.
   GitHub tím do repozitáře přidá soubor `CNAME` (jako nový commit).
   Nemaž ho — bez něj doména přestane fungovat. Než budeš příště nahrávat
   změny z počítače, stáhni si ho (`git pull`).
5. Pod polem proběhne **DNS check**. Dokud nejsou nastavené DNS záznamy
   (kapitola 5), skončí chybou. Po jejich nastavení ukáže
   **DNS check successful**.
6. **Enforce HTTPS**: zaškrtni, jakmile to jde. GitHub po úspěšném DNS checku
   vystavuje certifikát — od pár minut do 24 hodin. Do té doby je políčko
   šedé s vysvětlením, že HTTPS zatím není dostupné.
   Když je šedé i po 24 hodinách: smaž doménu z pole **Custom domain**
   → **Save**, pak ji tam znovu napiš → **Save**. Tím se vystavení certifikátu
   spustí znovu.
7. `www.apatiqanatura.cz` GitHub přesměruje na `apatiqanatura.cz` sám,
   pokud existuje CNAME záznam pro `www` (kapitola 5).

---

## 5. DNS u Webglobe

Přihlas se do administrace Webglobe, otevři doménu `apatiqanatura.cz`
a její DNS záznamy.

### Cílový stav

| Typ | Název (host) | Hodnota |
|---|---|---|
| A | *(doména samotná)* | `185.199.108.153` |
| A | *(doména samotná)* | `185.199.109.153` |
| A | *(doména samotná)* | `185.199.110.153` |
| A | *(doména samotná)* | `185.199.111.153` |
| CNAME | `www` | `danielsojak-wq.github.io` |

- „Doména samotná“ se ve formulářích zapisuje buď prázdným polem pro název,
  nebo znakem `@` — podle toho, co formulář přijme. Obojí znamená
  `apatiqanatura.cz`.
- Hodnota CNAME je jen `danielsojak-wq.github.io`, bez názvu repozitáře.
  Pokud ji formulář odmítne, zkus ji s tečkou na konci:
  `danielsojak-wq.github.io.`
- TTL nech výchozí.

### Co musí pryč

- **Staré přesměrování domény.** Pokud má doména ve Webglobe nastavené
  přesměrování na jiný web, zruš ho. Přesměrování funguje přes vlastní
  A záznam Webglobe, který by se pral s GitHubem: část návštěv by končila
  na starém cíli a GitHub by nevystavil certifikát pro HTTPS.
- **Starý A záznam** pro doménu samotnou — každý A záznam s jinou adresou
  než čtyři výše smaž.
- **AAAA záznam** (IPv6) pro doménu samotnou, pokud tam je, smaž taky.
- Pro `www` nesmí kromě CNAME existovat žádný jiný záznam (A, AAAA).

**Nesahej** na záznamy typu MX a TXT — týkají se e-mailu a ověření domény,
ne webu.

### Kontrola

V Terminálu na Macu:

```
dig +short apatiqanatura.cz
dig +short www.apatiqanatura.cz
```

První příkaz musí vypsat přesně čtyři řádky `185.199.108.153` až
`185.199.111.153` a nic jiného. Druhý začíná `danielsojak-wq.github.io.`
Změny v DNS se šíří postupně; než zmizí staré záznamy, může to trvat
až 24 hodin.

---

## 6. Ceny a produkty (pro mamku)

Ceník se mění **jen v listu Ceník**, v kódu webu se nic neupravuje.
Změna se na webu projeví při dalším načtení stránky.

Jeden řádek = jedna varianta (například Měsíčková mast 30 ml). Produkt
s více velikostmi má víc řádků se stejným textem ve sloupci Produkt;
na webu z nich je jedna karta s více cenami.

| Sloupec | Co do něj patří |
|---|---|
| **Kategorie** | nadpis sekce na webu (Masti a balzámy, Péče o vlasy …). Stejný text = stejná sekce. Nový text = nová sekce |
| **Produkt** | název, jak se ukáže na webu. U všech velikostí jednoho produktu přesně stejný text |
| **Varianta** | velikost, např. `30 ml`, `50 g` |
| **Cena** | cena v Kč, jen číslo |
| **Popis** | text pod názvem. Vyplň ho u jedné varianty, web ho ukáže u celého produktu |
| **Ikona** | název obrázku, např. `mesickova.png`. Obrázek musí být ve složce `assets/` na webu — nový obrázek nahrává Daniel. Prázdné = bez obrázku. Vyplň u jedné varianty |
| **Aktivní** | zaškrtnuté = na webu. **Odškrtnuté = na webu se schová**, v tabulce i v K výrobě zůstane |
| **Pořadí** | menší číslo = výš na stránce. Čísluje se po 10 (10, 20, 30 …), aby šlo něco vložit mezi, např. 15. Pořadí sekcí určuje nejmenší číslo v sekci |
| **Ks z dávky** | kolik kusů vyjde z jedné várky. Na webu se nezobrazuje, počítá s ním list K výrobě |

**Ikony, které na webu jsou** (do sloupce Ikona se píše přesně takhle):

- byliny: `mesickova.png`, `hermankova.png`, `levandulova.png`, `repikova.png`,
  `rozmarynova.png`, `tymianova.png`, `rebrickova.png`, `koprivova.png`,
  `trezalkova.png`, `kostivalova.png`, `kastanova.png`, `preslicka.png`,
  `babci.png` (rostlina, ze které je bakuchiol)
- suroviny: `kakao.png`, `argan.png`, `pomeranc.png`, `kava-skorice.png`
- obecné motivy: `lucni-kviti.png`, `kapka-oleje.png`, `kapky-na-listu.png`,
  `zelena-snitka.png`, `svazek-bylin.png`

Obecné motivy jsou u produktů, u kterých název neříká hlavní surovinu
(sérum, odličovací olej, lesk na rty, deodorant, repelent). Kdyby měly
mít bylinu, ze které jsou, přepiš Ikonu na tu bylinu, nebo si nech
nakreslit novou (Daniel). Větší verze tří bylin pro herbářové archy
nahoře na stránce jsou v `assets/herbar/`.

### Běžné úkony

- **Změna ceny:** přepiš číslo ve sloupci Cena. Dřívějších objednávek se to
  netýká — Položky mají uloženou cenu z doby objednání.
- **Dočasně vyprodáno:** odškrtni Aktivní. Až bude zase skladem, zaškrtni.
- **Nový produkt:** přidej řádek (kamkoli), vyplň Kategorie, Produkt,
  Varianta, Cena, zaškrtni Aktivní a dej Pořadí.
- **Produkt natrvalo pryč:** smaž řádek. Bezpečnější je jen odškrtnout Aktivní.

### Na co pozor

- **Hlavičky (řádek 1) neměň v žádném listu.** Tabulka při pokusu upozorní
  „Hlavičky čte web — neměnit názvy“ → klikni **Zrušit**.
- **Listy nepřejmenovávej.**
- **Nepřejmenovávej produkt ani variantu, dokud k nim jsou rozpracované
  objednávky.** K výrobě páruje objednané kusy podle textu — přejmenované by
  přestal počítat. A zákaznice, která má zrovna stránku otevřenou, by
  objednávku neodeslala, dokud stránku nenačte znovu.
- Řádek bez ceny (nebo s cenou 0) se na webu neukáže.
- Do listu Objednávky **nevkládej sloupce před sloupec Stav**. Vzorec
  v Položkách (sloupec J) bere stav jako 12. sloupec Objednávek. Nové sloupce
  přidávej až za Termín předání.

### Objednávky a výroba

- Nová objednávka přibude dole v listu Objednávky se Stavem **Ke zpracování**.
  Jednotlivé kusy jsou v Položkách se stejným číslem objednávky.
- **Stav** přepínej v rozbalovacím seznamu: Ke zpracování → Ve výrobě →
  Vyrobeno → Doručeno. **Zaplaceno** zaškrtni. **Termín předání** piš volně.
- **K výrobě** ukazuje jen produkty, které je potřeba vyrobit: sčítá kusy
  z objednávek ve stavu Ke zpracování a Ve výrobě. Když objednávku přepneš
  na Vyrobeno, její kusy z K výrobě zmizí; když není co vyrábět, stojí tam
  „Nic k výrobě“. **Dávek uvařit** se spočítá, jen když je v Ceníku
  vyplněné **Ks z dávky**. Vzorec je jediný, v buňce A2.
- **Zrušená objednávka:** smaž její řádek v Objednávkách i všechny řádky se
  stejným číslem v Položkách (skrytý list, viz výše). Celé řádky, ne jen
  obsah. Když řádky v Položkách zůstanou, nic se nerozbije: číslo se znovu
  nepoužije a K výrobě je nepočítá (jejich Stav objednávky je prázdný).
  V Položkách jen zbydou zbytečné řádky.

---

## 7. Když přestanou chodit objednávky

### Rychlá kontrola (2 minuty)

1. Otevři https://apatiqanatura.cz v anonymním okně. Je vidět ceník,
   nebo hláška s telefonem?
2. Otevři v prohlížeči adresu z `ENDPOINT` (v `app.js` na GitHubu).
   Má se ukázat text začínající `{"produkty":[`.
3. Apps Script → v levém menu **Spuštění** (Executions): seznam volání
   `doGet` (načtení ceníku) a `doPost` (objednávka) s časem a stavem.

Podle toho, co uvidíš, je to nejspíš jedna z těchto tří příčin.

### A) Přejmenovaná hlavička v tabulce

Skript hledá sloupce podle textu v řádku 1. Velikost písmen, diakritika
a mezery nevadí (`celkem (kc)` projde), jiné slovo ano.

**Jak se to projeví navenek**

- Přejmenovaná **Produkt**, **Varianta** nebo **Cena** v Ceníku: web místo
  ceníku ukáže telefon. Adresa z `ENDPOINT` vrátí
  `{"chyba":"V listu „Ceník“ chybí sloupce: Cena."}`.
- Přejmenovaná **Číslo objednávky**, **Jméno a příjmení**, **Telefon** nebo
  **Objednáno** v Objednávkách, případně **Číslo objednávky**, **Produkt**,
  **Varianta** nebo **Počet** v Položkách: ceník funguje, ale odeslání skončí
  hláškou „Objednávku se nepodařilo odeslat … zavolejte“. Nic se nezapíše.
- Kterákoli jiná hlavička (E-mail, Zdroj, Datum …): objednávky chodí, jen
  ten sloupec zůstává prázdný. Poznáš to jen v tabulce.

**Kde to ověřit:** Apps Script → **Spuštění** → poslední `doPost` → rozklikni.
Stav bude **Dokončeno** (skript chybu zachytí a pošle webu odpověď), ale
v protokolu je řádek s chybou, např.
`V listu „Objednávky“ chybí sloupce: Telefon.`

**Oprava:** vrať hlavičce přesný text podle tabulky níže. Nic se znovu
nenasazuje.

| List | Hlavičky v řádku 1 (tučně = bez nich skript nefunguje) |
|---|---|
| Objednávky | **Číslo objednávky** · Datum · **Jméno a příjmení** · **Telefon** · E-mail · Způsob předání · Adresa · Poznámka · **Objednáno** · Celkem (Kč) · Zdroj · Stav · Zaplaceno · Termín předání |
| Položky | **Číslo objednávky** · Datum · Kategorie · **Produkt** · **Varianta** · **Počet** · Cena za kus (Kč) · Celkem (Kč) · ID · *(J: vzorec „Stav objednávky“)* |
| Ceník | Kategorie · **Produkt** · **Varianta** · **Cena** · Popis · Ikona · Aktivní · Pořadí · Ks z dávky |

### B) Nové nasazení Apps Scriptu a stará adresa v `ENDPOINT`

Vznikne, když se po úpravě skriptu klikne **Nasadit → Nové nasazení**
místo **Spravovat nasazení → Nová verze** (kapitola 2).

**Jak se to projeví navenek** — podle toho, co se stalo se starým nasazením:

- **Staré nasazení dál existuje:** web funguje, ale na starém kódu. Úprava
  skriptu se „neprojevila“.
- **Staré nasazení je archivované:** web místo ceníku ukáže telefon
  a odeslání hlásí chybu. Adresa z `ENDPOINT` v prohlížeči ukáže chybovou
  stránku Googlu místo textu s produkty.

Stejně se projeví i kód, který je v editoru uložený, ale nenasazený:
změna na webu není vidět.

**Kde to ověřit:** Apps Script → **Nasadit → Spravovat nasazení** ukáže
aktivní nasazení a jeho adresu. Porovnej ji s `ENDPOINT` v `app.js` —
dlouhé ID mezi `/s/` a `/exec` musí být stejné. V **Spuštění** zároveň od
určitého dne nepřibývají žádná volání `doGet` ani `doPost`, protože web
volá jinam.

**Oprava:** buď aktivní adresu dej do `ENDPOINT` (kapitola 3), nebo
v **Spravovat nasazení** uprav nasazení, jehož adresa v `ENDPOINT` je,
na **Nová verze** (kapitola 2).

### C) Vypršené nebo odvolané oprávnění skriptu

Skript běží pod účtem, který ho nasadil. Přestane fungovat, když:

- tomu účtu někdo odebere přístup k tabulce,
- se v nastavení Google účtu projektu odebere přístup
  (myaccount.google.com → **Zabezpečení** → připojení a aplikace třetích stran),
- účet zanikne nebo je zablokovaný (typicky pracovní účet po odchodu z firmy),
- do skriptu přibude kód, který potřebuje nové oprávnění, a nikdo ho neschválil.

**Jak se to projeví navenek:** obojí najednou — web místo ceníku ukáže telefon
a odeslání hlásí chybu. Adresa z `ENDPOINT` v anonymním okně ukáže místo
textu s produkty stránku Googlu o nutné autorizaci (*Authorization is
required…*) nebo o chybějícím oprávnění.

**Kde to ověřit:** Apps Script → **Spuštění**: volání se stavem **Neúspěšné**
(Failed) a chybou o oprávnění (*You do not have permission…*,
*Authorization is required…*). Pokud se volání nespustí vůbec, nemusí
v seznamu být nic.

**Oprava:**

1. Přihlas se účtem, který skript nasadil, otevři editor a spusť `testCenik`.
   Projdi povolení jako v kapitole 2, bod 5.
2. Když chybí přístup k tabulce: v tabulce **Sdílet** (Share) → přidej ten
   účet jako **Editor**.
3. Adresa zůstává stejná, nové nasazení není potřeba.

Když účet, který skript nasadil, už neexistuje: nasaď skript z jiného účtu
podle kapitoly 2 (vznikne nová adresa) a tu dej do `ENDPOINT` (kapitola 3).
