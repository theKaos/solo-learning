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

/* ---------- Zeit-Wiederholung (Leitner-System) ----------
   Jedes Wort hat eine Stufe (Box 0–5). Richtige Antwort → eine Stufe
   hoch, Fehler → zwei Stufen runter. Jede Stufe hat eine WARTEZEIT:
   Erst wenn sie abgelaufen ist, gilt das Wort wieder als "fällig" und
   wird bevorzugt ins Spiel gemischt – genau dann, wenn das Gehirn es
   zu vergessen droht. Ab Stufe 3 gilt ein Wort als gemeistert
   (Karten-Hilfe verschwindet); fällt es zurück, kehrt die Hilfe zurück. */
export const MASTERY_BOX = 3;
const BOX_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30]; // Wartezeit je Stufe
const DAY_MS = 24 * 60 * 60 * 1000;

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
  // Kanji-Einträge bringen ihre Strichzahl direkt mit (siehe decks.js)
  if (word.strokes) {
    return Math.min(4 + word.strokes, 12);
  }
  if (jp.length === 1) {
    return 4 + (KANA_STROKES[jp] || 2);
  }
  let pts = 4 + Math.min(jp.length, 6);
  if (/[ァ-ヴー]/.test(jp)) pts += 1; // enthält Katakana
  if (/[一-龯]/.test(jp))   pts += 2; // enthält Kanji
  return Math.min(pts, 12);
}

/* ---------- 2. Begegnungen im Schultag ----------
   Jede Begegnung hat einen eigenen TWIST – eine kleine Sonderregel,
   damit sich keine Stunde wie die vorherige spielt (Anti-Monotonie). */
const ENEMIES = [
  { name: "Der Wecker",            sprite: "⏰", hp: 15, atk: 4, boss: false,
    twist: "snooze",   twistText: "Snooze: Jede 3. Attacke fällt aus – dafür döst er sich um +3 LP hoch." },
  { name: "Sitznachbar Kenta",     sprite: "🙋", hp: 18, atk: 4, boss: false,
    twist: "none",     twistText: "Freundlich: keine Sonderregel. Wärm dich auf!" },
  { name: "Klassensprecherin Yui", sprite: "📢", hp: 22, atk: 5, boss: false,
    twist: "escalate", twistText: "Durchsage: Mit jeder Attacke wird sie lauter (+1 Schaden, max. +3)." },
  { name: "Pausen-Ansturm",        sprite: "🍞", hp: 26, atk: 5, boss: false,
    twist: "crowd",    twistText: "Gedränge: Du hältst 7 Karten – mehr Auswahl, mehr Ablenkung." },
  { name: "Oni-Sensei (Sport)",    sprite: "🏋️", hp: 28, atk: 6, boss: false,
    twist: "drill",    twistText: "Ausdauer-Drill: Heilung wirkt nur halb. Beiß dich durch!" },
  { name: "Überraschungs-Quiz",    sprite: "📝", hp: 33, atk: 6, boss: false,
    twist: "fleiss",   twistText: "Fleißaufgabe: Richtige Antworten zählen DOPPELT für deine Serie – aber ein Fehler wirft sie wie immer auf null." },
  { name: "Karaoke mit dem Club",  sprite: "🎤", hp: 32, atk: 7, boss: false,
    twist: "rhythm",   twistText: "Rhythmus: Kombo-Bonus verdoppelt – aber Patzer kosten dich 2 LP extra (Buh-Rufe)." },
  { name: "DIE KANJI-PRÜFUNG",     sprite: "📋", hp: 38, atk: 8, boss: true,
    twist: "exam",     twistText: "Alles kommt dran: Bedeutung und Lesung wechseln sich ab – Hilfen flackern weg." }
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
  return { runs: 0, wins: 0, bestScore: 0, wordStats: {} };
}

function persistSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) { /* Speicher blockiert – Spiel läuft trotzdem */ }
}

export const save = loadSave();

export function wordStat(deckId, jp) {
  if (!save.wordStats[deckId]) save.wordStats[deckId] = {};
  if (!save.wordStats[deckId][jp]) {
    save.wordStats[deckId][jp] = { right: 0, wrong: 0, intro: false, box: 0, due: 0 };
  }
  const s = save.wordStats[deckId][jp];
  if (s.box === undefined) { s.box = 0; s.due = 0; } // alte Spielstände nachrüsten
  return s;
}

// Ist die Wartezeit dieses Wortes abgelaufen?
function isDueStat(s) {
  return s.intro && (s.due || 0) <= Date.now();
}

export function isMastered(jp) {
  return wordStat(game.learningDeck.id, jp).box >= MASTERY_BOX;
}

/* Wie viele Wörter eines Decks sind heute zur Wiederholung fällig? */
export function deckDueCount(deck) {
  const stats = save.wordStats[deck.id];
  if (!stats) return 0;
  return deck.words.filter((w) => {
    const s = stats[w.jp];
    return s && s.intro && (s.due || 0) <= Date.now() && s.box > 0;
  }).length;
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
  shakeId: 0,          // zählt hoch, wenn DU getroffen wirst → Screen-Shake
  enemyFx: null,       // schwebende Zahl über dem Gegner  { id, text, kind }
  playerFx: null,      // schwebende Zahl beim Spieler     { id, text, kind }
  mastery: null,       // Feier-Moment: Wort gemeistert    { id, jp, reading }
  playAnim: null,      // Ausspiel-Inszenierung: { id, card, correct, meaning }
  hintsHidden: false,  // Twist "reverse"/"exam": Karten-Hilfen ausgeblendet
  log: { text: "", kind: "" },
  studyWords: [],      // neue Wörter für den Lern-Moment
  rewardCards: [],     // Kartenangebote nach einem Sieg
  rewardHealText: "",
  stats: { right: 0, wrong: 0, maxStreak: 0, wrongWords: [] },
  score: 0,
  won: false,
  locked: false
};

/* Schwebende Effekt-Zahlen (Game-Feel): kleine Ereignisse,
   die die React-Seite als Animation über den Panels anzeigt */
let nextFxId = 1;
function showEnemyFx(text, kind)  { game.enemyFx  = { id: nextFxId++, text, kind }; }
function showPlayerFx(text, kind) { game.playerFx = { id: nextFxId++, text, kind }; }

/* Kombo-Bonus: Ab 3 Treffern in Folge wird jede richtige Karte stärker.
   Beim Karaoke-Twist ("rhythm") zählt der Bonus doppelt. */
export function comboBonus() {
  let bonus = game.streak >= 5 ? 2 : game.streak >= 3 ? 1 : 0;
  if (game.enemy && game.enemy.twist === "rhythm") bonus *= 2;
  return bonus;
}

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

/* Wortauswahl fürs Startdeck: FÄLLIGE Wörter zuerst (Zeit-Wiederholung!),
   dann Neues in Lern-Reihenfolge, dann das am wenigsten Geübte. */
function pickStartingWords(count) {
  const all = game.learningDeck.words;
  const st = (w) => wordStat(game.learningDeck.id, w.jp);

  // 1. Fällig: Wartezeit abgelaufen → jetzt wiederholen, sonst vergessen!
  const due = shuffle(all.filter((w) => isDueStat(st(w))))
    .slice(0, Math.ceil(count / 2));
  const chosen = [...due];

  // 2. Neu: noch nie vorgestellte Wörter in Lern-Reihenfolge
  for (const w of all) {
    if (chosen.length >= count) break;
    if (!st(w).intro && !chosen.includes(w)) chosen.push(w);
  }
  // 3. Auffüllen mit den unsichersten Wörtern (niedrigste Stufe)
  if (chosen.length < count) {
    const rest = all.filter((w) => !chosen.includes(w))
      .sort((a, b) => st(a).box - st(b).box);
    chosen.push(...rest.slice(0, count - chosen.length));
  }
  return shuffle(chosen);
}

/* Belohnungen: erst ein fälliges Wort, dann Neues in Lern-Reihenfolge */
function pickRewardWords(count) {
  const all = game.learningDeck.words;
  const st = (w) => wordStat(game.learningDeck.id, w.jp);
  const inDeck = new Set(game.deck.map((c) => c.jp));
  const pool = all.filter((w) => !inDeck.has(w.jp));

  const chosen = shuffle(pool.filter((w) => isDueStat(st(w)))).slice(0, 1);
  for (const w of pool) {
    if (chosen.length >= count) break;
    if (!st(w).intro && !chosen.includes(w)) chosen.push(w);
  }
  const rest = shuffle(pool.filter((w) => !chosen.includes(w)))
    .sort((a, b) => st(a).box - st(b).box);
  chosen.push(...rest.slice(0, count - chosen.length));
  return chosen.slice(0, count);
}

/* ---------- 5. Aktionen ---------- */
export function startRun(learningDeck) {
  game.learningDeck = learningDeck;
  game.playerHp = PLAYER_MAX_HP;
  game.fightIndex = 0;
  game.stats = { right: 0, wrong: 0, maxStreak: 0, wrongWords: [] };

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

/* Handgröße dieser Begegnung – der Gedränge-Twist erhöht sie */
function handSize() {
  return game.enemy && game.enemy.twist === "crowd" ? 7 : HAND_SIZE;
}

export function startBattle() {
  const base = ENEMIES[game.fightIndex];
  game.enemy = { ...base, maxHp: base.hp, rampBonus: 0 };
  game.turn = 1;
  game.block = 0;
  game.streak = 0;
  game.enemyFx = null;
  game.playerFx = null;
  game.mastery = null;
  game.drawPile = shuffle([...game.deck]);
  game.discardPile = [];
  game.hand = [];
  game.locked = false;

  setLog(base.boss
    ? "[SYSTEM] Finale Quest: Die Kanji-Prüfung beginnt. Zeig, was du gelernt hast!"
    : `[SYSTEM] Neue Begegnung: ${base.name}!`, "info");

  drawCards(handSize());
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
   Fehler-Wörter werden bevorzugt abgefragt.
   Die Twists "reverse" und "exam" drehen die Fragerichtung um
   bzw. blenden die Karten-Hilfen aus. */
function newTask() {
  if (game.hand.length === 0) { game.task = null; return; }

  const weighted = game.hand.map((card) => {
    const s = wordStat(game.learningDeck.id, card.jp);
    // Fehler-Wörter und fällige Wörter werden bevorzugt abgefragt
    return { card, weight: 1 + s.wrong * 2 + (isDueStat(s) ? 2 : 0) };
  });
  const total = weighted.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * total;
  let target = weighted[0].card;
  for (const e of weighted) {
    if (r <= e.weight) { target = e.card; break; }
    r -= e.weight;
  }

  const deckIsReading = game.learningDeck.promptType === "reading";
  const twist = game.enemy ? game.enemy.twist : "none";

  // Fragerichtung dieser Aufgabe bestimmen
  let askReading = deckIsReading;
  game.hintsHidden = false;

  if (twist === "exam") {
    if (deckIsReading) {
      game.hintsHidden = game.turn % 2 === 0;  // Hilfen flackern jede 2. Runde weg
    } else {
      askReading = game.turn % 2 === 0;        // Bedeutung und Lesung im Wechsel
    }
  }

  game.task = {
    jp: target.jp,
    promptWord: askReading ? target.reading : target.de,
    isReading: askReading
  };
}

/* Ein Spielerzug: EINE Karte spielen, danach agiert der Gegner.
   Zwischen Klick und Wirkung liegt die Ausspiel-Inszenierung:
   Die Karte fliegt vergrößert in die Bildschirmmitte – bei richtiger
   Antwort glänzt sie golden und verpufft, bei falscher färbt sie
   sich rot, zerbröckelt, und die Bedeutung wird sofort eingeblendet. */
export function playCard(index) {
  if (game.locked) return;
  const card = game.hand[index];
  if (!card || !game.task) return;

  // Richtig ist die Karte, deren Wort zur Frage passt – bei Wörtern mit
  // gleicher Lesung/Bedeutung zählt jede semantisch passende Karte
  const correct = card.jp === game.task.jp ||
    (game.task.isReading
      ? card.reading === game.task.promptWord
      : card.de === game.task.promptWord);

  game.locked = true;
  game.playAnim = {
    id: nextFxId++,
    card,
    correct,
    meaning: `${card.jp} (${card.reading}) heißt „${card.de}“`
  };
  refresh();

  // Richtig: Nach der Gold-Animation löst der Zug automatisch auf.
  // Falsch: Die Erklärung BLEIBT STEHEN, bis der Spieler sie über
  // den Weiter-Button schließt (dismissMeaning).
  if (correct) {
    setTimeout(() => resolvePlay(card, correct), 1200);
  }
}

/* Der Spieler hat die Erklärung der falschen Karte gelesen
   und schließt sie – erst jetzt geht der Zug weiter. */
export function dismissMeaning() {
  if (!game.playAnim || game.playAnim.correct) return;
  resolvePlay(game.playAnim.card, false);
}

function resolvePlay(card, correct) {
  game.playAnim = null;
  const idx = game.hand.indexOf(card);
  if (idx >= 0) {
    game.hand.splice(idx, 1);
    game.discardPile.push(card);
  }

  const stat = wordStat(game.learningDeck.id, card.jp);

  if (correct) {
    stat.right++;
    game.stats.right++;
    // Fleißaufgabe (Überraschungs-Quiz): richtige Antworten zählen
    // doppelt für die Serie – im Quiz zu glänzen lohnt sich!
    game.streak += game.enemy.twist === "fleiss" ? 2 : 1;
    game.stats.maxStreak = Math.max(game.stats.maxStreak, game.streak);

    // Leitner: eine Stufe hoch, neue Wartezeit starten
    const wasBelow = stat.box < MASTERY_BOX;
    stat.box = Math.min(5, stat.box + 1);
    stat.due = Date.now() + BOX_INTERVALS_DAYS[stat.box] * DAY_MS;
    applyEffect(card);

    // Feier-Moment: Das Wort hat gerade die Meister-Stufe erreicht!
    if (wasBelow && stat.box >= MASTERY_BOX) {
      game.mastery = { id: nextFxId++, jp: card.jp, reading: card.reading };
    }
  } else {
    stat.wrong++;
    game.stats.wrong++;
    game.streak = 0;
    // Leitner: zwei Stufen zurück und sofort wieder fällig
    stat.box = Math.max(0, stat.box - 2);
    stat.due = 0;
    if (!game.stats.wrongWords.some((w) => w.jp === card.jp)) {
      game.stats.wrongWords.push({ jp: card.jp, reading: card.reading, de: card.de });
    }
    let failText = `Daneben! ${card.jp} (${card.reading}) heißt „${card.de}“. Die Karte verpufft.`;
    showPlayerFx("✖ verpufft", "fizzle");
    // Karaoke-Twist: Buh-Rufe bei Fehlern
    if (game.enemy.twist === "rhythm") {
      game.playerHp = Math.max(0, game.playerHp - 2);
      game.shakeId++;
      failText += " Buh-Rufe: −2 LP!";
    }
    setLog(failText, "fail");
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
  const bonus = comboBonus();
  const bonusText = bonus > 0 ? ` (+${bonus} Kombo)` : "";
  let value = card.value + bonus;

  if (game.mode === "attack") {
    game.enemy.hp = Math.max(0, game.enemy.hp - value);
    game.hitFlash++;
    showEnemyFx(`−${value}`, "dmg");
    setLog(`${word} – Treffer! ${value} Schaden${bonusText}.`, "ok");
  } else if (game.mode === "block") {
    game.block += value;
    showPlayerFx(`+${value} 🛡️`, "block");
    setLog(`${word} – ${value} Block aufgebaut${bonusText}!`, "ok");
  } else {
    // Ausdauer-Drill: Heilung wirkt nur halb
    if (game.enemy.twist === "drill") value = Math.ceil(value / 2);
    game.playerHp = Math.min(PLAYER_MAX_HP, game.playerHp + value);
    showPlayerFx(`+${value} 💚`, "heal");
    setLog(`${word} – ${value} LP geheilt${bonusText}!`, "ok");
  }
}

/* ---------- Der Gegnerzug ---------- */
export function fumbleChance() {
  return Math.min(FUMBLE_BASE + game.streak * FUMBLE_PER_STREAK, FUMBLE_MAX);
}

export function enemyDamage() {
  return game.enemy.atk + (game.enemy.rampBonus || 0) + Math.floor((game.turn - 1) / 5);
}

function enemyAct() {
  const e = game.enemy;

  if (e.twist === "snooze" && game.turn % 3 === 0) {
    // Wecker-Twist: Snooze – Attacke fällt aus, er heilt sich
    e.hp = Math.min(e.maxHp, e.hp + 3);
    showEnemyFx("+3 💤", "heal");
    setLog(`${e.name} drückt Snooze und döst kurz weg: +3 LP.`, "info");
  } else if (Math.random() < fumbleChance()) {
    // Patzer! Ein eventueller Block bleibt stehen.
    setLog(`⚡ Patzer! Dein perfektes Japanisch verblüfft ${e.name} – ` +
      `die Attacke geht komplett daneben!`, "info");
  } else {
    const dmg = enemyDamage();
    const taken = Math.max(0, dmg - game.block);
    game.playerHp = Math.max(0, game.playerHp - taken);
    game.block = 0;
    if (taken > 0) {
      showPlayerFx(`−${taken}`, "dmg");
      game.shakeId++; // Screen-Shake: DU wurdest getroffen
    } else {
      showPlayerFx("Block!", "block");
    }
    setLog(taken > 0
      ? `${e.name} trifft dich für ${taken} Schaden!`
      : `${e.name} greift an – dein Block hält stand!`,
      taken > 0 ? "fail" : "info");
    // Yui-Twist: Sie wird mit jeder Attacke lauter
    if (e.twist === "escalate" && (e.rampBonus || 0) < 3) {
      e.rampBonus = (e.rampBonus || 0) + 1;
    }
  }

  if (game.playerHp <= 0) {
    game.locked = true;
    refresh();
    setTimeout(() => { game.locked = false; endRun(false); }, 900);
    return;
  }

  game.turn++;
  drawCards(handSize() - game.hand.length);
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

  // Die neue Karte wird IMMER im Lern-Moment vorgestellt – auch wenn
  // das Wort in einem früheren Run schon einmal eingeführt wurde.
  // (Vorher übersprang showStudy() bereits bekannte Wörter, sodass es
  // direkt in die nächste Runde ging und die Eselsbrücke fehlte.)
  const s = wordStat(game.learningDeck.id, card.jp);
  s.intro = true;
  persistSave();

  game.studyWords = [card];
  game.screen = "study";
  refresh();
}

/* ---------- Ergebnis ---------- */
/* Run-Score: belohnt richtige Antworten, lange Serien und Fortschritt.
   Formel: 10 × Richtige + 15 × längste Serie + 25 × Begegnungen + 100 Sieg-Bonus */
function computeScore(won) {
  return game.stats.right * 10 +
         game.stats.maxStreak * 15 +
         game.fightIndex * 25 +
         (won ? 100 : 0);
}

function endRun(won) {
  save.runs++;
  if (won) save.wins++;
  game.score = computeScore(won);
  save.bestScore = Math.max(save.bestScore || 0, game.score);
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
