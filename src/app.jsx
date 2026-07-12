/* =========================================================
   SOLO LEARNING: JAPANISCH – React-Anwendung
   ---------------------------------------------------------
   Aufbau dieser Datei:
     1. Balance-Werte & Punkteformel
     2. Begegnungen (Gegner)
     3. Speichern & Laden (localStorage)
     4. Spielzustand & Aktionen (framework-unabhängige Logik)
     5. React-Komponenten (eine pro Bildschirm)
     6. App & Start

   Architektur: Die Spiellogik lebt in einem normalen Objekt
   (`game`) plus Aktions-Funktionen – React ist die reine
   Darstellungsschicht. Nach jeder Zustandsänderung stößt
   refresh() das Neuzeichnen an. So bleibt die Logik leicht
   testbar und unabhängig vom Framework.

   Bauen:  npm run build
   (übersetzt nur das JSX nach public/app.js – React selbst
    liegt getrennt in public/react.js und bleibt unangetastet)
   ========================================================= */

// React kommt aus der Bibliotheksdatei public/react.js (globale Objekte)
const { useEffect, useReducer } = React;
const { createRoot } = ReactDOMClient;

/* ---------- 1. Balance-Werte ---------- */
const PLAYER_MAX_HP  = 50;
const HAND_SIZE      = 5;
const HEAL_AFTER_WIN = 12;  // automatische Heilung nach jedem Sieg
const TOTAL_FIGHTS   = 8;   // 7 Begegnungen + Abschlussprüfung
const MASTERY_GOAL   = 3;   // so oft richtig, bis ein Wort "gemeistert" ist
const START_WORDS    = 6;   // Anzahl verschiedener Vokabeln im Startdeck

// Patzer-Mechanik: Jede richtige Antwort in Folge "verwirrt" den Gegner.
const FUMBLE_BASE       = 0.10;
const FUMBLE_PER_STREAK = 0.10;
const FUMBLE_MAX        = 0.60;

const STARTING_DECK_SIZE = 10;

/* Punkteformel: Der Wert einer Karte hängt NUR vom Wort ab.
   Mehrzeichen-Wörter: 4 + Zeichenanzahl (+1 Katakana, +2 Kanji).
   Einzelne Hiragana: 4 + Strichzahl des Zeichens. */
const KANA_STROKES = {
  "あ": 3, "い": 2, "う": 2, "え": 2, "お": 3,
  "か": 3, "き": 4, "く": 1, "け": 3, "こ": 2,
  "さ": 3, "し": 1, "す": 2, "せ": 3, "そ": 1,
  "た": 4, "ち": 2, "つ": 1, "て": 1, "と": 2,
  "な": 4, "に": 3, "ぬ": 2, "ね": 2, "の": 1,
  "は": 3, "ひ": 1, "ふ": 4, "へ": 1, "ほ": 4,
  "ま": 3, "み": 2, "む": 3, "め": 2, "も": 3,
  "や": 3, "ゆ": 2, "よ": 2,
  "ら": 2, "り": 2, "る": 1, "れ": 2, "ろ": 1,
  "わ": 2, "を": 3, "ん": 1
};

function wordPoints(word) {
  const jp = word.jp;
  if (jp.length === 1) {
    return 4 + (KANA_STROKES[jp] || 2);
  }
  let pts = 4 + Math.min(jp.length, 6);
  if (/[ァ-ヴー]/.test(jp)) pts += 1; // enthält Katakana
  if (/[一-龯]/.test(jp))   pts += 2; // enthält Kanji
  return Math.min(pts, 12);
}

/* ---------- 2. Begegnungen im Schultag ---------- */
const ENEMIES = [
  { name: "Der Wecker",            sprite: "⏰", hp: 15, atk: 4, boss: false },
  { name: "Sitznachbar Kenta",     sprite: "🙋", hp: 18, atk: 4, boss: false },
  { name: "Klassensprecherin Yui", sprite: "📢", hp: 22, atk: 5, boss: false },
  { name: "Pausen-Ansturm",        sprite: "🍞", hp: 26, atk: 5, boss: false },
  { name: "Oni-Sensei (Sport)",    sprite: "🏋️", hp: 28, atk: 6, boss: false },
  { name: "Überraschungs-Quiz",    sprite: "📝", hp: 31, atk: 6, boss: false },
  { name: "Karaoke mit dem Club",  sprite: "🎤", hp: 32, atk: 7, boss: false },
  { name: "DIE KANJI-PRÜFUNG",     sprite: "📋", hp: 38, atk: 8, boss: true  }
];

const MODE_NAMES  = { attack: "Angriff", block: "Block", heal: "Heilung" };

/* ---------- 3. Speichern & Laden ---------- */
// Interner Schlüssel bleibt aus Kompatibilität unverändert,
// damit bestehende Spielstände erhalten bleiben.
const SAVE_KEY = "kotobaClashSave";

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* beschädigte Daten? Dann frisch starten */ }
  return { runs: 0, wins: 0, wordStats: {} };
}

function persistSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) { /* Speicher blockiert – Spiel läuft trotzdem */ }
}

const save = loadSave();

function wordStat(deckId, jp) {
  if (!save.wordStats[deckId]) save.wordStats[deckId] = {};
  if (!save.wordStats[deckId][jp]) save.wordStats[deckId][jp] = { right: 0, wrong: 0, intro: false };
  return save.wordStats[deckId][jp];
}

function isMastered(jp) {
  return wordStat(game.learningDeck.id, jp).right >= MASTERY_GOAL;
}

/* ---------- 4. Spielzustand & Aktionen ---------- */
const game = {
  screen: "start",     // "start" | "study" | "battle" | "reward" | "result"
  learningDeck: null,
  deck: [],
  drawPile: [],
  discardPile: [],
  hand: [],
  task: null,          // { jp, promptWord, isReading }
  playerHp: PLAYER_MAX_HP,
  block: 0,
  mode: "attack",
  streak: 0,
  fightIndex: 0,
  enemy: null,
  turn: 0,
  hitFlash: 0,         // zählt Treffer hoch → startet die Wackel-Animation neu
  log: { text: "", kind: "" },
  studyWords: [],      // neue Wörter für den Lern-Moment
  rewardCards: [],     // Kartenangebote nach einem Sieg
  rewardHealText: "",
  stats: { right: 0, wrong: 0, wrongWords: [] },
  won: false,
  locked: false
};

// refresh() wird von der App-Komponente gesetzt und zeichnet die UI neu
let refresh = () => {};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let nextCardId = 1;
function makeCard(word) {
  return {
    id: nextCardId++,
    jp: word.jp,
    reading: word.reading,
    de: word.de,
    value: wordPoints(word)
  };
}

function setLog(text, kind) {
  game.log = { text, kind: kind || "" };
}

/* Wortauswahl fürs Startdeck: Wiederholung zuerst, dann Neues in
   Lern-Reihenfolge, dann das am wenigsten Geübte. */
function pickStartingWords(count) {
  const all = game.learningDeck.words;
  const st = (w) => wordStat(game.learningDeck.id, w.jp);

  const review = shuffle(all.filter((w) => st(w).wrong > 0 && !isMastered(w.jp)))
    .slice(0, Math.floor(count / 2));
  const chosen = [...review];

  for (const w of all) {
    if (chosen.length >= count) break;
    if (!st(w).intro && !chosen.includes(w)) chosen.push(w);
  }
  if (chosen.length < count) {
    const rest = all.filter((w) => !chosen.includes(w))
      .sort((a, b) => st(a).right - st(b).right);
    chosen.push(...rest.slice(0, count - chosen.length));
  }
  return shuffle(chosen);
}

/* Belohnungen: zwei neue Wörter + ein Wiederholungs-Kandidat */
function pickRewardWords(count) {
  const all = game.learningDeck.words;
  const st = (w) => wordStat(game.learningDeck.id, w.jp);
  const inDeck = new Set(game.deck.map((c) => c.jp));
  const pool = all.filter((w) => !inDeck.has(w.jp));

  const chosen = pool.filter((w) => !st(w).intro).slice(0, count - 1);
  const rest = shuffle(pool.filter((w) => !chosen.includes(w)))
    .sort((a, b) => (st(b).wrong - st(b).right) - (st(a).wrong - st(a).right));
  chosen.push(...rest.slice(0, count - chosen.length));
  return chosen;
}

function startRun(learningDeck) {
  game.learningDeck = learningDeck;
  game.playerHp = PLAYER_MAX_HP;
  game.fightIndex = 0;
  game.stats = { right: 0, wrong: 0, wrongWords: [] };

  const words = pickStartingWords(START_WORDS);
  game.deck = Array.from({ length: STARTING_DECK_SIZE }, (_, i) =>
    makeCard(words[i % words.length]));

  showStudy();
}

/* Lern-Moment: alle noch nie vorgestellten Wörter im Deck zeigen */
function showStudy() {
  const newWords = [];
  const seenJp = new Set();
  for (const card of game.deck) {
    const s = wordStat(game.learningDeck.id, card.jp);
    if (!s.intro && !seenJp.has(card.jp)) {
      seenJp.add(card.jp);
      newWords.push(card);
      s.intro = true;
    }
  }
  persistSave();

  if (newWords.length === 0) { startBattle(); return; }
  game.studyWords = newWords;
  game.screen = "study";
  refresh();
}

function startBattle() {
  const base = ENEMIES[game.fightIndex];
  game.enemy = { ...base, maxHp: base.hp };
  game.turn = 1;
  game.block = 0;
  game.streak = 0;
  game.drawPile = shuffle([...game.deck]);
  game.discardPile = [];
  game.hand = [];
  game.locked = false;

  setLog(base.boss
    ? "[SYSTEM] Finale Quest: Die Kanji-Prüfung beginnt. Zeig, was du gelernt hast!"
    : `[SYSTEM] Neue Begegnung: ${base.name}!`, "info");

  drawCards(HAND_SIZE);
  newTask();
  game.screen = "battle";
  refresh();
}

function drawCards(n) {
  for (let i = 0; i < n; i++) {
    if (game.drawPile.length === 0) {
      if (game.discardPile.length === 0) break;
      game.drawPile = shuffle(game.discardPile);
      game.discardPile = [];
    }
    game.hand.push(game.drawPile.pop());
  }
}

/* Neue Aufgabe: Zielwort ist IMMER eines aus der Hand,
   Fehler-Wörter werden bevorzugt abgefragt. */
function newTask() {
  if (game.hand.length === 0) { game.task = null; return; }

  const weighted = game.hand.map((card) => {
    const s = wordStat(game.learningDeck.id, card.jp);
    return { card, weight: 1 + s.wrong * 2 };
  });
  const total = weighted.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * total;
  let target = weighted[0].card;
  for (const e of weighted) {
    if (r <= e.weight) { target = e.card; break; }
    r -= e.weight;
  }

  const isReading = game.learningDeck.promptType === "reading";
  game.task = {
    jp: target.jp,
    promptWord: isReading ? target.reading : target.de,
    isReading
  };
}

/* Ein Spielerzug: EINE Karte spielen, danach agiert der Gegner */
function playCard(index) {
  if (game.locked) return;
  const card = game.hand[index];
  if (!card || !game.task) return;

  game.hand.splice(index, 1);
  game.discardPile.push(card);

  const stat = wordStat(game.learningDeck.id, card.jp);
  const correct = card.jp === game.task.jp;

  if (correct) {
    stat.right++;
    game.stats.right++;
    game.streak++;
    applyEffect(card);
  } else {
    stat.wrong++;
    game.stats.wrong++;
    game.streak = 0;
    if (!game.stats.wrongWords.some((w) => w.jp === card.jp)) {
      game.stats.wrongWords.push({ jp: card.jp, reading: card.reading, de: card.de });
    }
    setLog(`Daneben! ${card.jp} (${card.reading}) heißt „${card.de}“. Die Karte verpufft.`, "fail");
  }
  persistSave();

  if (game.enemy.hp <= 0) {
    victory();
    return;
  }

  game.locked = true;
  refresh();
  setTimeout(enemyAct, 1000);
}

function applyEffect(card) {
  const word = `${card.jp} (${card.reading}) = „${card.de}“`;
  if (game.mode === "attack") {
    game.enemy.hp = Math.max(0, game.enemy.hp - card.value);
    game.hitFlash++;
    setLog(`${word} – Treffer! ${card.value} Schaden.`, "ok");
  } else if (game.mode === "block") {
    game.block += card.value;
    setLog(`${word} – ${card.value} Block aufgebaut!`, "ok");
  } else {
    game.playerHp = Math.min(PLAYER_MAX_HP, game.playerHp + card.value);
    setLog(`${word} – ${card.value} LP geheilt!`, "ok");
  }
}

/* ---------- Der Gegnerzug ---------- */
function fumbleChance() {
  return Math.min(FUMBLE_BASE + game.streak * FUMBLE_PER_STREAK, FUMBLE_MAX);
}

function enemyDamage() {
  return game.enemy.atk + Math.floor((game.turn - 1) / 5);
}

function enemyAct() {
  const e = game.enemy;

  if (Math.random() < fumbleChance()) {
    // Patzer! Ein eventueller Block bleibt stehen.
    setLog(`⚡ Patzer! Dein perfektes Japanisch verblüfft ${e.name} – ` +
      `die Attacke geht komplett daneben!`, "info");
  } else {
    const dmg = enemyDamage();
    const taken = Math.max(0, dmg - game.block);
    game.playerHp = Math.max(0, game.playerHp - taken);
    game.block = 0;
    setLog(taken > 0
      ? `${e.name} trifft dich für ${taken} Schaden!`
      : `${e.name} greift an – dein Block hält stand!`,
      taken > 0 ? "fail" : "info");
  }

  if (game.playerHp <= 0) {
    game.locked = true;
    refresh();
    setTimeout(() => { game.locked = false; endRun(false); }, 900);
    return;
  }

  game.turn++;
  drawCards(HAND_SIZE - game.hand.length);
  newTask();
  game.locked = false;
  refresh();
}

function victory() {
  game.locked = true;
  setLog(`[SYSTEM] Quest abgeschlossen: ${game.enemy.name} gemeistert!`, "ok");
  refresh();

  setTimeout(() => {
    game.locked = false;
    game.fightIndex++;
    if (game.fightIndex >= TOTAL_FIGHTS) {
      endRun(true);
    } else {
      prepareReward();
    }
  }, 900);
}

/* ---------- Belohnung ---------- */
function prepareReward() {
  const before = game.playerHp;
  game.playerHp = Math.min(PLAYER_MAX_HP, game.playerHp + HEAL_AFTER_WIN);
  const healed = game.playerHp - before;
  game.rewardHealText = healed > 0
    ? `Kurze Pause auf dem Schulflur: +${healed} LP Selbstvertrauen (${game.playerHp}/${PLAYER_MAX_HP}).`
    : `Dein Selbstvertrauen ist bei vollen ${PLAYER_MAX_HP} LP – weiter geht's!`;

  game.rewardCards = pickRewardWords(3).map(makeCard);
  game.screen = "reward";
  refresh();
}

function chooseReward(card) {
  game.deck.push(card);
  showStudy(); // stellt das neue Wort vor, dann geht's weiter
}

/* ---------- Ergebnis ---------- */
function endRun(won) {
  save.runs++;
  if (won) save.wins++;
  persistSave();
  game.won = won;
  game.screen = "result";
  refresh();
}

function setMode(mode) {
  game.mode = mode;
  refresh();
}

function backToStart() {
  game.screen = "start";
  refresh();
}

/* ---------- Zufalls-Hintergrund ----------
   Zufällig eines von bis zu 10 Bildern aus public/backgrounds/
   (bg01.jpg/.png … bg10.jpg/.png). Ohne Bilder bleibt der dunkle
   System-Look als Fallback. */
const BG_SLOTS = 10;

function tryLoadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

(async function setRandomBackground() {
  const order = shuffle(Array.from({ length: BG_SLOTS }, (_, i) => i + 1));
  for (const n of order) {
    const nn = String(n).padStart(2, "0");
    const src =
      (await tryLoadImage(`backgrounds/bg${nn}.jpg`)) ||
      (await tryLoadImage(`backgrounds/bg${nn}.png`));
    if (src) {
      document.documentElement.style.setProperty("--scene", `url("${src}")`);
      return;
    }
  }
})();

/* =========================================================
   5. React-Komponenten
   ========================================================= */

// Schriftgröße auf der Karte an die Wortlänge anpassen
function wordSizeClass(jp) {
  if (jp.length > 4) return "xlong";
  if (jp.length > 2) return "long";
  return "";
}

/* Eine Wortkarte in der Hand */
function HandCard({ card, index }) {
  const isReading = game.learningDeck.promptType === "reading";
  const mastered = isMastered(card.jp);
  const hintText = isReading ? card.reading : `${card.reading} · ${card.de}`;

  // Lern-Gerüst: volle Hilfe, bis das Wort sitzt (3× richtig).
  // Danach bleibt nur die japanische Lesung stehen –
  // beim Hiragana-Deck (Lesung = Antwort) verschwindet sie ganz.
  let hint = <span className="card-hint">{hintText}</span>;
  if (mastered) {
    hint = isReading ? null : (
      <span className="card-hint mastered-jp"
            title="Gemeistert – nur noch die Lesung als Stütze">{card.reading}</span>
    );
  }

  return (
    <button
      className="card"
      disabled={game.locked || !game.task}
      onClick={() => playCard(index)}
      aria-label={
        `Karte ${index + 1}: ${card.jp}` +
        (mastered ? `, gesprochen ${card.reading}` : `, Hilfe: ${hintText}`) +
        `, ${card.value} Punkte, wirkt als ${MODE_NAMES[game.mode]}`
      }>
      {index < 9 && <span className="card-key" aria-hidden="true">{index + 1}</span>}
      <span className={`card-word ${wordSizeClass(card.jp)}`} lang="ja">{card.jp}</span>
      {hint}
      <span className="card-points">✦ <span className="points-value">{card.value}</span> Punkte</span>
    </button>
  );
}

function StartScreen() {
  const mastered = Object.values(save.wordStats).reduce((n, deck) =>
    n + Object.values(deck).filter((s) => s.right >= MASTERY_GOAL).length, 0);

  return (
    <section id="screen-start" className="screen">
      <header className="start-header">
        <p className="logo-jp" aria-hidden="true">ソロ日本語学習</p>
        <h1 className="logo">SOLO LEARNING<span className="logo-accent">: JAPANISCH</span></h1>
        <p className="tagline">Falsche Welt. Falscher Körper. Null Japanisch.</p>
      </header>

      <div className="how-to" role="note">
        <h2 className="section-title">[ SYSTEM-MELDUNG ]</h2>
        <p>
          Du bist heute Morgen aufgewacht – <strong>im Körper eines japanischen
          Oberschülers</strong>. Du verstehst kein einziges Wort. Deine einzige Hilfe:
          ein geheimnisvolles <strong>System</strong>, das dir Wortkarten schenkt.
          Überstehe 8 Begegnungen des Schultags – vom Wecker bis zur Kanji-Prüfung.
        </p>
        <p>
          In jeder Begegnung zeigt dir das System eine <strong>Quest</strong>: Wähle deine
          Aktion (Angriff, Block oder Heilung) und spiele die passende Wortkarte. Richtig =
          die Punkte wirken. Falsch = die Karte verpufft, und dein Gegenüber kontert – ihr
          agiert immer abwechselnd. Deine LP stehen für dein <strong>Selbstvertrauen</strong>.
        </p>
        <p>
          <strong>Verwirrung:</strong> Jede richtige Antwort in Folge bringt dein Gegenüber
          aus dem Konzept – die Patzer-Chance steigt sichtbar. Gut lernen = Glück verdienen!
          Neue Wörter stellt dir das System vorher in Ruhe vor (mit Eselsbrücke), und die
          Lösung steht klein auf der Karte, bis ein Wort dreimal richtig gespielt wurde.
        </p>
      </div>

      <h2 className="section-title">Wähle dein Lern-Deck</h2>
      <div id="deck-list" className="deck-list">
        {LEARNING_DECKS.map((deck) => (
          <button key={deck.id} className="deck-option"
                  onClick={() => startRun(deck)}
                  aria-label={`Lern-Deck ${deck.name}, ${deck.level}: ${deck.subtitle}`}>
            <span className="deck-glyph" aria-hidden="true">{deck.glyph || deck.words[0].jp}</span>
            <span>
              <span className="deck-name">{deck.name}</span>
              <span className="deck-sub">{deck.subtitle} · {deck.words.length} Wörter</span>
            </span>
            <span className="deck-level">{deck.level}</span>
          </button>
        ))}
      </div>

      <footer id="global-stats" className="global-stats">
        {save.runs === 0
          ? "Dein erster Schultag wartet. がんばって – viel Erfolg!"
          : `Bisher: ${save.runs} Schultage · ${save.wins} bestanden · ${mastered} Wörter gemeistert ★`}
      </footer>
    </section>
  );
}

function StudyScreen() {
  const isReading = game.learningDeck.promptType === "reading";

  return (
    <section id="screen-study" className="screen">
      <h2 className="study-title">[ SYSTEM ] Neues Wissen erhalten <span className="jp-inline">学習</span></h2>
      <p className="study-hint">
        Das System überträgt dir neue Wörter – sie erwarten dich in der nächsten
        Begegnung. Nimm dir einen Moment: Ein Untertitel auf der Karte hilft dir,
        bis das Wort sitzt (3× richtig gespielt).
      </p>
      <ul id="study-list" className="study-list">
        {game.studyWords.map((w) => {
          const entry = game.learningDeck.words.find((x) => x.jp === w.jp);
          return (
            <li key={w.jp} className="study-item">
              <span className={`study-glyph ${w.jp.length > 3 ? "long" : ""}`} lang="ja">{w.jp}</span>
              <span className="study-info">
                <span className="study-reading">
                  {isReading ? `gesprochen: „${w.reading}“` : `${w.reading} · bedeutet „${w.de}“`}
                </span>
                {entry && entry.mnemonic &&
                  <span className="study-mnemonic">{entry.mnemonic}</span>}
                <span className="study-points">✦ {w.value} Punkte wert</span>
              </span>
            </li>
          );
        })}
      </ul>
      <button id="btn-study-continue" className="btn btn-primary" autoFocus
              onClick={startBattle}>Verstanden – Quest starten!</button>
    </section>
  );
}

function BattleScreen() {
  // Tastatursteuerung: 1–9 spielt Karten, A/B/H wählt die Aktion
  useEffect(() => {
    function onKey(event) {
      const key = event.key.toLowerCase();
      if (event.key >= "1" && event.key <= "9") {
        playCard(Number(event.key) - 1);
      } else if (key === "a") {
        setMode("attack");
      } else if (key === "b" || key === "v") {
        setMode("block");
      } else if (key === "h") {
        setMode("heal");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const e = game.enemy;
  const fumblePct = Math.round(fumbleChance() * 100);

  return (
    <section id="screen-battle" className="screen">
      <div className="battle-top">
        <span id="run-progress" className="run-progress">
          {e.boss ? "ABSCHLUSSPRÜFUNG" : `Stunde ${game.fightIndex + 1} / ${TOTAL_FIGHTS}`}
        </span>
        <span id="battle-deck-name" className="battle-deck-name">{game.learningDeck.name}</span>
      </div>

      {/* Gegner */}
      <div className="enemy-panel">
        <div id="enemy-sprite" key={game.hitFlash}
             className={"enemy-sprite" + (game.hitFlash > 0 ? " hit" : "")}
             aria-hidden="true">{e.sprite}</div>
        <div className="enemy-info">
          <h2 id="enemy-name" className="enemy-name">{e.name}</h2>
          <div className="bar hp-bar" role="img" aria-label="Lebenspunkte des Gegners">
            <div id="enemy-hp-fill" className="bar-fill enemy-fill"
                 style={{ width: (e.hp / e.maxHp * 100) + "%" }}></div>
            <span id="enemy-hp-text" className="bar-text">{e.hp} / {e.maxHp}</span>
          </div>
          <p id="enemy-intent" className="enemy-intent">
            Nächster Angriff: {enemyDamage()} Schaden · <span className="fumble">Patzer-Chance: {fumblePct}%</span>
            {game.streak > 1 && <span className="streak"> 🔥 {game.streak}er-Serie!</span>}
          </p>
        </div>
      </div>

      {/* System-Meldung */}
      <p id="battle-log" className={"battle-log " + game.log.kind}
         role="status" aria-live="polite">{game.log.text}</p>

      {/* Quest */}
      <div className="task-banner">
        <span className="task-label">Quest</span>
        <p id="task-text" className="task-text">
          {game.task
            ? (game.task.isReading
                ? <>Spiele die Karte, die man „<span className="task-word">{game.task.promptWord}</span>“ liest!</>
                : <>Spiele die Karte, die „<span className="task-word">{game.task.promptWord}</span>“ bedeutet!</>)
            : "Einen Moment …"}
        </p>
      </div>

      {/* Spieler */}
      <div className="player-panel">
        <div className="player-stats">
          <div className="bar hp-bar player-hp" role="img" aria-label="Dein Selbstvertrauen (Lebenspunkte)">
            <div id="player-hp-fill" className="bar-fill player-fill"
                 style={{ width: (game.playerHp / PLAYER_MAX_HP * 100) + "%" }}></div>
            <span id="player-hp-text" className="bar-text">{game.playerHp} / {PLAYER_MAX_HP} LP</span>
          </div>
          <div className="player-badges">
            <span id="block-badge"
                  className={"badge block-badge" + (game.block === 0 ? " empty" : "")}
                  title="Block: fängt den nächsten Angriff des Gegners ab">
              <span>🛡️ {game.block} Block</span>
            </span>
          </div>
        </div>

        {/* Aktionswahl */}
        <div className="mode-select" role="group" aria-label="Aktion für die nächste Karte wählen">
          {["attack", "block", "heal"].map((m) => (
            <button key={m} data-mode={m}
                    className={"btn-mode" + (game.mode === m ? " active" : "")}
                    aria-pressed={game.mode === m}
                    onClick={() => setMode(m)}>
              {m === "attack" && <>⚔️ Angriff <kbd>A</kbd></>}
              {m === "block" && <>🛡️ Block <kbd>B</kbd></>}
              {m === "heal" && <>💚 Heilung <kbd>H</kbd></>}
            </button>
          ))}
        </div>
        <p className="mode-hint">Wähle deine Aktion – dann spiele die richtige Karte. Danach ist der Gegner dran.</p>

        <div id="hand" className="hand" role="group" aria-label="Deine Handkarten">
          {game.hand.map((card, i) => <HandCard key={card.id} card={card} index={i} />)}
        </div>

        <div className="battle-actions">
          <span id="pile-info" className="pile-info">
            Nachziehstapel: {game.drawPile.length} · Ablage: {game.discardPile.length}
          </span>
        </div>
      </div>
    </section>
  );
}

function RewardScreen() {
  return (
    <section id="screen-reward" className="screen">
      <h2 className="reward-title">Quest abgeschlossen <span className="jp-inline">完了</span></h2>
      <p id="reward-heal" className="reward-heal">{game.rewardHealText}</p>
      <p className="reward-hint">Das System bietet dir eine Belohnung an – wähle eine neue Karte:</p>
      <div id="reward-list" className="reward-list">
        {game.rewardCards.map((card) => (
          <button key={card.id} className="card" onClick={() => chooseReward(card)}
                  aria-label={
                    `Neue Karte: ${card.jp}, gesprochen ${card.reading}, bedeutet ${card.de}. ` +
                    `${card.value} Punkte – einsetzbar als Angriff, Block oder Heilung.`
                  }>
            <span className={`card-word ${wordSizeClass(card.jp)}`} lang="ja">{card.jp}</span>
            <span className="card-points">✦ <span className="points-value">{card.value}</span> Punkte</span>
            <span className="card-meaning">{card.reading} · {card.de}</span>
          </button>
        ))}
      </div>
      <button id="btn-skip-reward" className="btn btn-ghost"
              onClick={startBattle}>Keine Karte nehmen</button>
    </section>
  );
}

function ResultScreen() {
  const total = game.stats.right + game.stats.wrong;
  const accuracy = total > 0 ? Math.round(game.stats.right / total * 100) : 0;

  return (
    <section id="screen-result" className="screen">
      <h2 id="result-title" className={"result-title " + (game.won ? "win" : "lose")}>
        {game.won ? "LEVEL UP!" : "OHNMACHT…"}
      </h2>
      <p id="result-sub" className="result-sub">
        {game.won
          ? "Du hast den Schultag überstanden und die Prüfung bestanden. お見事 – das System ist beeindruckt!"
          : "Der Tag hat dich überrollt – aber jedes gelernte Wort bleibt. Morgen klingelt der Wecker erneut!"}
      </p>

      <div id="result-stats" className="result-stats">
        <div className="stat-tile"><span className="stat-value">{game.stats.right}</span>
          <span className="stat-label">Richtig</span></div>
        <div className="stat-tile"><span className="stat-value">{game.stats.wrong}</span>
          <span className="stat-label">Falsch</span></div>
        <div className="stat-tile"><span className="stat-value">{accuracy}%</span>
          <span className="stat-label">Trefferquote</span></div>
        <div className="stat-tile"><span className="stat-value">{game.fightIndex}</span>
          <span className="stat-label">Begegnungen gemeistert</span></div>
      </div>

      {game.stats.wrongWords.length > 0 && (
        <div id="review-box" className="review-box">
          <h3 className="section-title">Diese Wörter solltest du wiederholen</h3>
          <ul id="review-list" className="review-list">
            {game.stats.wrongWords.map((w) => (
              <li key={w.jp}>
                <span className="review-jp" lang="ja">{w.jp}</span>
                <span className="review-reading">{w.reading}</span>
                <span className="review-de">{w.de}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button id="btn-restart" className="btn btn-primary"
              onClick={backToStart}>Zurück zum Start</button>
    </section>
  );
}

/* =========================================================
   6. App & Start
   ========================================================= */
function App() {
  // force() zeichnet die App neu – die Spiellogik ruft es als refresh() auf
  const [, force] = useReducer((n) => n + 1, 0);
  useEffect(() => { refresh = force; }, [force]);

  switch (game.screen) {
    case "study":  return <StudyScreen />;
    case "battle": return <BattleScreen />;
    case "reward": return <RewardScreen />;
    case "result": return <ResultScreen />;
    default:       return <StartScreen />;
  }
}

createRoot(document.getElementById("app")).render(<App />);
