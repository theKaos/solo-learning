# Solo Learning: Japanisch

**Die Story:** Du wachst auf – im Körper eines japanischen Oberschülers, ohne ein
Wort Japanisch zu sprechen. Deine einzige Hilfe ist ein geheimnisvolles **System**
(im Stil von Solo Leveling), das dir Wortkarten schenkt. Überstehe die 8
Begegnungen eines Schultags – vom Wecker über den Sitznachbarn bis zur
finalen Kanji-Prüfung. Deine LP sind dein Selbstvertrauen.

Spielerisch Japanisch lernen: Ein Deckbuilder-Rogue-like im Isekai-Anime-Stil.
Deine Karten tragen japanische Wörter und **Punkte** – wähle deine Aktion
(Angriff, Block oder Heilung), spiele die richtige Karte zur Aufgabe, und die
Punkte wirken. Danach ist der Gegner dran: Spieler und Gegner agieren immer
**strikt abwechselnd**. Überlebe 7 Kämpfe und besiege den Kanji-König!

## Die Kampf-Mechanik

- **Punktekarten:** Jede Karte hat nur einen Punktwert. WOFÜR die Punkte
  wirken, entscheidest du vor dem Ausspielen über die drei Aktions-Buttons
  (⚔️ Angriff / 🛡️ Block / 💚 Heilung).
- **Punkte = Schwierigkeit:** Der Wert wird fest aus dem Wort berechnet –
  dasselbe Wort hat immer dieselben Punkte. Mehrzeichen-Wörter: 4 + Anzahl
  der Zeichen (plus Bonus für Katakana/Kanji). Einzelne Hiragana: 4 + Strichzahl
  des Zeichens (ふ mit 4 Strichen bringt mehr als く mit 1 Strich).
  Kompliziertere Wörter zu lernen lohnt sich also auch spielerisch.
- **Wechselzüge:** Du spielst genau eine Karte, dann agiert der Gegner –
  kein Energie-System, kein „Zug beenden".
- **Verwirrung (Patzer-Mechanik):** Jede richtige Antwort in Folge bringt
  den Gegner aus dem Konzept – seine Patzer-Chance steigt (10 % Basis,
  +10 % pro Serien-Treffer, max. 60 %) und wird **vor** seinem Angriff
  angezeigt. Der Zufall hilft also immer nur dir und ist selbst verdient:
  Gut lernen = Glück erspielen. Eine falsche Antwort setzt die Serie zurück.
- **Block** bleibt stehen, wenn der Gegner patzt – er wird nur verbraucht,
  wenn er wirklich einen Angriff abfängt.

## Das Lernsystem (auch für absolute Anfänger)

1. **Lern-Moment:** Jedes neue Wort wird vor dem Kampf in Ruhe vorgestellt –
   mit Lesung, Bedeutung und (bei Hiragana) einer Eselsbrücke.
2. **Untertitel-Hilfe:** Im Kampf steht die volle Lösung klein auf der
   Karte, bis das Wort **3× richtig** gespielt wurde. Danach bleibt nur
   noch die japanische Lesung (Romaji) stehen – die deutsche Bedeutung
   muss man ab jetzt selbst wissen. (Beim Hiragana-Deck ist die Lesung
   die Antwort, dort verschwindet die Hilfe komplett.)
3. **Gesprächs-Reihenfolge:** Die Vokabel-Decks sind darauf sortiert,
   möglichst schnell ein einfaches japanisches Gespräch führen zu können:
   erst Begrüßung und Höflichkeit, dann über sich sprechen, Fragewörter,
   „ich verstehe (nicht) / langsamer bitte“, dann Alltag und Smalltalk.
   Beim Hiragana-Deck gilt die Lehrbuch-Reihenfolge (あ, い, う …).
4. **Spaced Repetition:** Falsch gespielte Wörter tauchen in Aufgaben,
   Startdecks und Belohnungen bevorzugt wieder auf.

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) (Version 18 oder neuer).

```bash
npm install
npm run dev        # Entwicklung: Vite-Dev-Server mit Hot-Reload
```

Vite zeigt dir die Adresse an (normalerweise **http://localhost:5173**) –
jede Codeänderung erscheint sofort im Browser.

Für die fertige Version:

```bash
npm run build      # baut die optimierte App in den Ordner dist/
npm run preview    # dist/ probeweise ansehen
npm start          # oder: Express-Server, der dist/ ausliefert
```

## Projektstruktur (Standard-Vite-Layout)

| Datei / Ordner     | Aufgabe                                            |
| ------------------ | -------------------------------------------------- |
| `index.html`       | Vite-Einstiegsseite (lädt `src/main.jsx`)          |
| `vite.config.js`   | Vite-Konfiguration (React-Plugin, relative Pfade)  |
| `src/main.jsx`     | Einstiegspunkt: verbindet Logik & Komponenten      |
| `src/game.js`      | Die komplette Spiellogik – framework-frei          |
| `src/decks.js`     | Die Lern-Decks als reine Daten                     |
| `src/components/`  | Ein React-Baustein pro Bildschirm (Start, Lern-Moment, Begegnung, Belohnung, Ergebnis) |
| `src/style.css`    | Der komplette Look (System-UI / Isekai-Anime)      |
| `server.js`        | Optionaler Express-Server für die gebaute App (`dist/`) |
| `dist/`            | Entsteht durch `npm run build` – die fertige App   |

**Architektur:** `game.js` kennt kein React – es verwaltet den
Spielzustand und die Aktionen und meldet Änderungen über `setRefresh()`.
Die Komponenten in `src/components/` sind die reine Darstellungsschicht.

## Bereitstellung über GitHub

Die Spiellogik läuft komplett im Browser – du hast deshalb zwei Möglichkeiten:

### Variante A: GitHub Pages (kostenlos, empfohlen)

1. `npm run build` ausführen – die fertige App liegt danach in `dist/`.
2. Neues Repository auf GitHub anlegen und dieses Projekt pushen.
3. Den Inhalt von `dist/` veröffentlichen, z. B. so: `dist/` in `docs/`
   umbenennen (oder kopieren) und in **Settings → Pages → Source:
   "Deploy from a branch"**, Branch `main`, Ordner `/docs` wählen.
   (Dank `base: "./"` in `vite.config.js` funktionieren alle Pfade
   auch im Unterordner.)
4. Nach etwa einer Minute ist das Spiel unter
   `https://DEIN-NAME.github.io/REPO-NAME/` erreichbar.

Komfortabler auf Dauer: eine GitHub Action, die bei jedem Push
automatisch `npm run build` ausführt und `dist/` deployt
(Vorlage: „Deploy static content to Pages" im Actions-Tab).

### Variante B: Node-Hosting (z. B. Render, Railway)

1. Repository auf GitHub pushen.
2. Beim Hoster "New Web Service" → GitHub-Repo verbinden.
3. Build-Befehl: `npm install && npm run build` · Start-Befehl: `npm start`.

Sinnvoll erst, wenn später echte Server-Funktionen dazukommen
(z. B. Online-Highscores).

## Spiel anpassen

**Neues Lern-Deck hinzufügen:** In `src/decks.js` einfach einen weiteren
Block in `LEARNING_DECKS` eintragen – die Spiellogik übernimmt ihn automatisch.

**Balance ändern:** Alle Stellschrauben stehen oben in `src/game.js`
(`PLAYER_MAX_HP`, `FUMBLE_BASE`/`FUMBLE_PER_STREAK`/`FUMBLE_MAX`,
Punkteformel, Gegnerliste …). Läuft `npm run dev`, übernimmt Vite jede
Änderung sofort; für die fertige Version `npm run build` ausführen.

## Steuerung

- **Maus/Touch:** Aktion wählen, dann Karte anklicken
- **Tastatur:** `A` = Angriff, `B` = Block, `H` = Heilung,
  `1`–`9` spielt die jeweilige Handkarte, `Tab`/`Enter` funktioniert überall
