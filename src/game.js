/* =========================================================
   SOLO LEARNING: JAPANISCH – Spiellogik (framework-frei)
   ---------------------------------------------------------
   Dieses Modul kennt kein React: Es verwaltet den kompletten
   Spielzustand im Objekt `game` und stellt Aktions-Funktionen
   bereit (startRun, playCard, …). Nach jeder Zustandsänderung
   ruft es refresh() auf – die React-Seite (main.jsx) hängt
   dort ihr Neuzeichnen ein.

   Aufbau:
     1. Balance-Werte & Punkteformel
     2. Begegnungen (Gegner)
     3. Speichern & Laden (localStorage)
     4. Spielzustand
     5. Aktionen (das eigentliche Spiel)
   ========================================================= */

/* ---------- 1. Balance-Werte ---------- */
export const PLAYER_MAX_HP  = 50;
export const TOTAL_FIGHTS   = 8;   // 7 Begegnungen + Abschlussprüfung
export const MASTERY_GOAL   = 3;   // so oft richtig, bis ein Wort "gemeistert" ist

const HAND_SIZE      = 5;
const HEAL_AFTER_WIN = 12;         // automatische Heilung nach jedem Sieg
const START_WORDS    = 6;          // verschiedene Vokabeln im Startdeck
const STARTING_DECK_SIZE = 10;

// Patzer-Mechanik: Jede richtige Antwort in Folge "verwirrt" den Gegner.
const FUMBLE_BASE       = 0.10;
const FUMBLE_PER_STREAK = 0.10;
const FUMBLE_MAX        = 0.60;

export const MODE_NAMES = { attack: "Angriff", block: "Block", heal: "Heilung" };

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

export const save = loadSave();

export function wordStat(deckId, jp) {
  if (!save.wordStats[deckId]) save.wordStats[deckId] = {};
  if (!save.wordStats[deckId][jp]) save.wordStats[deckId][jp] = { right: 0, wrong: 0, intro: false };
  return save.wordStats[deckId][jp];
}

export function isMastered(jp) {
  return wordStat(game.learningDeck.id, jp).right >= MASTERY_GOAL;
}

/* ---------- 4. Spielzustand ---------- */
export const game = {
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

// Die React-Seite registriert hier ihre Neuzeichnen-Funktion
let refresh = () => {};
export function setRefresh(fn) { refresh = fn; }

/* ---------- Hilfsfunktionen ---------- */
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

/* ---------- 5. Aktionen ---------- */
export function startRun(learningDeck) {
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

export function startBattle() {
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
export function playCard(index) {
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
export function fumbleChance() {
  return Math.min(FUMBLE_BASE + game.streak * FUMBLE_PER_STREAK, FUMBLE_MAX);
}

export function enemyDamage() {
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

export function chooseReward(card) {
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

export function setMode(mode) {
  game.mode = mode;
  refresh();
}

export function backToStart() {
  game.screen = "start";
  refresh();
}

/* Schriftgröße auf der Karte an die Wortlänge anpassen */
export function wordSizeClass(jp) {
  if (jp.length > 4) return "xlong";
  if (jp.length > 2) return "long";
  return "";
}
