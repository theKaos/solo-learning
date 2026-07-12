/* =========================================================
   SOLO JAPANISCH LEARNING – Spiellogik
   ---------------------------------------------------------
   Aufbau dieser Datei:
     1. Balance-Werte (hier kannst du das Spiel tunen)
     2. Gegner
     3. Speichern & Laden (localStorage)
     4. Spielzustand
     5. Hilfsfunktionen
     6. Startbildschirm
     7. Run & Deck aufbauen
     8. Kampf
     9. Belohnung
    10. Ergebnis
    11. Tastatursteuerung
   ========================================================= */

"use strict";

/* ---------- 1. Balance-Werte ---------- */
const PLAYER_MAX_HP   = 50;
const HAND_SIZE       = 5;
const HEAL_AFTER_WIN  = 12;  // automatische Heilung nach jedem Sieg
const TOTAL_FIGHTS    = 8;   // 7 normale Kämpfe + 1 Boss
const MASTERY_GOAL    = 3;   // so oft richtig, bis ein Wort als "gemeistert" gilt
const START_WORDS     = 6;   // Anzahl verschiedener Vokabeln im Startdeck

// Patzer-Mechanik: Jede richtige Antwort in Folge "verwirrt" den Gegner.
// Seine Chance, den nächsten Angriff zu vermasseln, steigt sichtbar an –
// Zufall wirkt also immer FÜR den Spieler, nie gegen ihn.
const FUMBLE_BASE       = 0.10; // Grundchance auf einen Patzer
const FUMBLE_PER_STREAK = 0.10; // Zuwachs pro richtiger Antwort in Serie
const FUMBLE_MAX        = 0.60; // Obergrenze

// Karten tragen nur PUNKTE – wofür sie eingesetzt werden
// (Angriff, Block oder Heilung), entscheidet der Spieler beim Ausspielen.
const STARTING_DECK_SIZE = 10; // Kartenzahl im Startdeck

/* Punkteformel: Der Wert einer Karte hängt NUR vom Wort ab –
   dasselbe Wort hat also immer dieselben Punkte.
   - Mehrzeichen-Wörter: 4 + Zeichenanzahl (max. 6 gezählt),
     dazu +1 für Katakana (ungewohnte Schrift) und +2 für Kanji.
   - Einzelzeichen (Hiragana-Deck): 4 + Strichzahl des Zeichens –
     ein kompliziertes ふ (4 Striche) bringt mehr als ein einfaches く (1). */
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

/* ---------- 2. Begegnungen im Schultag (steigende Schwierigkeit) ----------
   Du steckst im Körper eines japanischen Schülers – jede "Stunde" des
   Tages ist eine Begegnung, die dein Selbstvertrauen (LP) angreift. */
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
// Interner Speicher-Schlüssel – bleibt aus Kompatibilität unverändert,
// damit bestehende Spielstände beim Umbenennen der App erhalten bleiben
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
  } catch (e) { /* z. B. Speicher voll oder blockiert – Spiel läuft trotzdem */ }
}

const save = loadSave();

// Statistik zu einem Wort holen (und bei Bedarf anlegen).
// intro = wurde das Wort schon im Lern-Moment vorgestellt?
function wordStat(deckId, jp) {
  if (!save.wordStats[deckId]) save.wordStats[deckId] = {};
  if (!save.wordStats[deckId][jp]) save.wordStats[deckId][jp] = { right: 0, wrong: 0, intro: false };
  return save.wordStats[deckId][jp];
}

// Ein Wort gilt als gemeistert, wenn es MASTERY_GOAL-mal richtig gespielt wurde
function isMastered(jp) {
  return wordStat(game.learningDeck.id, jp).right >= MASTERY_GOAL;
}

/* ---------- 4. Spielzustand ---------- */
const game = {
  learningDeck: null,  // das gewählte Lern-Deck (aus decks.js)
  deck: [],            // alle Karten des Spielers in diesem Run
  drawPile: [],
  discardPile: [],
  hand: [],
  task: null,          // { jp, text } – die aktuelle Aufgabe
  playerHp: PLAYER_MAX_HP,
  block: 0,
  mode: "attack",      // gewählte Aktion: "attack" | "block" | "heal"
  streak: 0,           // richtige Antworten in Folge → verwirrt den Gegner
  fightIndex: 0,       // 0-basiert: Kampf Nr. fightIndex+1
  enemy: null,         // { name, sprite, hp, maxHp, atk, boss }
  turn: 0,             // Anzahl der Schlagabtausche in diesem Kampf
  stats: { right: 0, wrong: 0, wrongWords: [] },
  locked: false        // blockiert Eingaben, während der Gegner agiert
};

/* ---------- 5. Hilfsfunktionen ---------- */
const $ = (id) => document.getElementById(id);

function shuffle(arr) {
  // Fisher-Yates-Mischen
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  $(id).classList.remove("hidden");
}

/* ---------- Zufalls-Hintergrund ----------
   Beim Seitenaufruf wird zufällig eines von bis zu 10 Anime-
   Hintergrundbildern aus dem Ordner public/backgrounds/ gewählt
   (bg01.jpg/.png … bg10.jpg/.png – siehe backgrounds/LIESMICH.txt).
   Fehlt ein Bild, wird der nächste Slot probiert; sind gar keine
   Bilder vorhanden, bleibt der dunkle System-Look als Fallback. */
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

/* Wortauswahl fürs STARTDECK:
   1. Zuerst Wiederholung: Wörter mit Fehlern, die noch nicht sitzen
   2. Dann Neues: unbekannte Wörter in Lehrbuch-Reihenfolge (= Reihenfolge in decks.js)
   3. Rest: die am wenigsten geübten Wörter
   So beginnt ein absoluter Anfänger mit あ, い, う … statt mit zufälligen Zeichen. */
function pickStartingWords(count) {
  const all = game.learningDeck.words;
  const st = (w) => wordStat(game.learningDeck.id, w.jp);

  const review = shuffle(all.filter((w) => st(w).wrong > 0 && !isMastered(w.jp)))
    .slice(0, Math.floor(count / 2));
  const chosen = [...review];

  for (const w of all) { // neue Wörter in Lern-Reihenfolge
    if (chosen.length >= count) break;
    if (!st(w).intro && !chosen.includes(w)) chosen.push(w);
  }
  if (chosen.length < count) { // alles schon gesehen? Am wenigsten Geübtes zuerst
    const rest = all.filter((w) => !chosen.includes(w))
      .sort((a, b) => st(a).right - st(b).right);
    chosen.push(...rest.slice(0, count - chosen.length));
  }
  return shuffle(chosen);
}

/* Wortauswahl für BELOHNUNGEN: zwei neue Wörter (in Lern-Reihenfolge)
   plus ein Wiederholungs-Kandidat – so wächst der Wortschatz Schritt
   für Schritt, ohne dass Fehler-Wörter in Vergessenheit geraten. */
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

// Eine Spielkarte aus einer Vokabel bauen –
// der Punktwert kommt immer aus der Formel wordPoints()
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

// Schriftgröße auf der Karte an die Wortlänge anpassen
// (Gesprächswörter wie „おねがいします“ sind länger als einzelne Kana)
function wordSizeClass(jp) {
  if (jp.length > 4) return "xlong";
  if (jp.length > 2) return "long";
  return "";
}

const MODE_ICONS  = { attack: "⚔️", block: "🛡️", heal: "💚" };
const MODE_NAMES  = { attack: "Angriff", block: "Block", heal: "Heilung" };
const MODE_RESULT = { attack: "Schaden", block: "Block", heal: "LP geheilt" };

/* ---------- 6. Startbildschirm ---------- */
function renderStart() {
  const list = $("deck-list");
  list.innerHTML = "";

  LEARNING_DECKS.forEach((deck) => {
    const btn = document.createElement("button");
    btn.className = "deck-option";
    btn.innerHTML = `
      <span class="deck-glyph" aria-hidden="true">${deck.glyph || deck.words[0].jp}</span>
      <span>
        <span class="deck-name">${deck.name}</span>
        <span class="deck-sub">${deck.subtitle} · ${deck.words.length} Wörter</span>
      </span>
      <span class="deck-level">${deck.level}</span>`;
    btn.setAttribute("aria-label",
      `Lern-Deck ${deck.name}, ${deck.level}: ${deck.subtitle}`);
    btn.addEventListener("click", () => startRun(deck));
    list.appendChild(btn);
  });

  // Gemeisterte Wörter über alle Decks zählen
  const mastered = Object.values(save.wordStats).reduce((n, deck) =>
    n + Object.values(deck).filter((s) => s.right >= MASTERY_GOAL).length, 0);

  const g = $("global-stats");
  g.textContent = save.runs === 0
    ? "Dein erster Schultag wartet. がんばって – viel Erfolg!"
    : `Bisher: ${save.runs} Schultage · ${save.wins} bestanden · ${mastered} Wörter gemeistert ★`;

  showScreen("screen-start");
}

/* ---------- 7. Run & Deck aufbauen ---------- */
function startRun(learningDeck) {
  game.learningDeck = learningDeck;
  game.playerHp = PLAYER_MAX_HP;
  game.fightIndex = 0;
  game.stats = { right: 0, wrong: 0, wrongWords: [] };

  // Startdeck: 10 Karten, aber nur wenige verschiedene Vokabeln –
  // Wiederholung ist für Anfänger wichtiger als Vielfalt
  const words = pickStartingWords(START_WORDS);
  game.deck = Array.from({ length: STARTING_DECK_SIZE }, (_, i) =>
    makeCard(words[i % words.length]));

  showStudy();
}

/* ---------- Lern-Moment: neue Wörter vorstellen ---------- */
function showStudy() {
  // Alle Wörter im Deck, die noch nie vorgestellt wurden
  const newWords = [];
  const seenJp = new Set();
  for (const card of game.deck) {
    const s = wordStat(game.learningDeck.id, card.jp);
    if (!s.intro && !seenJp.has(card.jp)) {
      seenJp.add(card.jp);
      newWords.push(card);
      s.intro = true; // ab jetzt gilt das Wort als vorgestellt
    }
  }
  persistSave();

  // Nichts Neues? Dann direkt in den Kampf.
  if (newWords.length === 0) { startBattle(); return; }

  const isReading = game.learningDeck.promptType === "reading";
  const list = $("study-list");
  list.innerHTML = "";
  newWords.forEach((w) => {
    const word = game.learningDeck.words.find((x) => x.jp === w.jp);
    const li = document.createElement("li");
    li.className = "study-item";
    li.innerHTML = `
      <span class="study-glyph ${w.jp.length > 3 ? "long" : ""}" lang="ja">${w.jp}</span>
      <span class="study-info">
        <span class="study-reading">${isReading
          ? `gesprochen: „${w.reading}“`
          : `${w.reading} · bedeutet „${w.de}“`}</span>
        ${word && word.mnemonic
          ? `<span class="study-mnemonic">${word.mnemonic}</span>` : ""}
        <span class="study-points">✦ ${w.value} Punkte wert</span>
      </span>`;
    list.appendChild(li);
  });

  showScreen("screen-study");
  $("btn-study-continue").focus();
}

/* ---------- 8. Kampf ---------- */
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
  showScreen("screen-battle");
  renderBattle();
}

function drawCards(n) {
  for (let i = 0; i < n; i++) {
    if (game.drawPile.length === 0) {
      // Ablagestapel neu mischen
      if (game.discardPile.length === 0) break;
      game.drawPile = shuffle(game.discardPile);
      game.discardPile = [];
    }
    game.hand.push(game.drawPile.pop());
  }
}

/* Neue Aufgabe: Zielwort ist IMMER eines aus der Hand.
   Wörter mit vielen Fehlern werden als Ziel bevorzugt. */
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
    text: isReading
      ? `Spiele die Karte, die man „<span class="task-word">${target.reading}</span>“ liest!`
      : `Spiele die Karte, die „<span class="task-word">${target.de}</span>“ bedeutet!`
  };
}

/* Ein Spielerzug: EINE Karte spielen (mit gewählter Aktion),
   danach ist automatisch der Gegner dran – strikt abwechselnd. */
function playCard(index) {
  if (game.locked) return;
  const card = game.hand[index];
  if (!card || !game.task) return;

  // Karte verlässt die Hand – richtig oder falsch
  game.hand.splice(index, 1);
  game.discardPile.push(card);

  const stat = wordStat(game.learningDeck.id, card.jp);
  const correct = card.jp === game.task.jp;

  if (correct) {
    stat.right++;
    game.stats.right++;
    game.streak++; // Serie wächst → Gegner wird nervöser (Patzer-Chance steigt)
    applyEffect(card);
  } else {
    stat.wrong++;
    game.stats.wrong++;
    game.streak = 0; // Serie reißt – der Gegner sammelt sich wieder
    if (!game.stats.wrongWords.some((w) => w.jp === card.jp)) {
      game.stats.wrongWords.push({ jp: card.jp, reading: card.reading, de: card.de });
    }
    setLog(`Daneben! ${card.jp} (${card.reading}) heißt „${card.de}“. Die Karte verpufft.`, "fail");
  }
  persistSave();

  // Gegner besiegt?
  if (game.enemy.hp <= 0) {
    victory();
    return;
  }

  // Jetzt ist der Gegner am Zug
  game.locked = true;
  renderBattle();
  setTimeout(enemyAct, 1000);
}

/* Die gespielten Punkte wirken so, wie der Spieler es GEWÄHLT hat */
function applyEffect(card) {
  const word = `${card.jp} (${card.reading}) = „${card.de}“`;
  if (game.mode === "attack") {
    game.enemy.hp = Math.max(0, game.enemy.hp - card.value);
    setLog(`${word} – Treffer! ${card.value} Schaden.`, "ok");
    animateEnemyHit();
  } else if (game.mode === "block") {
    game.block += card.value;
    setLog(`${word} – ${card.value} Block aufgebaut!`, "ok");
  } else {
    game.playerHp = Math.min(PLAYER_MAX_HP, game.playerHp + card.value);
    setLog(`${word} – ${card.value} LP geheilt!`, "ok");
  }
}

/* ---------- Der Gegnerzug ---------- */

// Aktuelle Patzer-Chance des Gegners (0 … FUMBLE_MAX)
function fumbleChance() {
  return Math.min(FUMBLE_BASE + game.streak * FUMBLE_PER_STREAK, FUMBLE_MAX);
}

function enemyAct() {
  const e = game.enemy;

  if (Math.random() < fumbleChance()) {
    // Patzer! Deine richtigen Antworten haben die Begegnung aus dem
    // Konzept gebracht. Ein eventueller Block bleibt dabei stehen.
    setLog(`⚡ Patzer! Dein perfektes Japanisch verblüfft ${e.name} – ` +
      `die Attacke geht komplett daneben!`, "info");
  } else {
    const dmg = enemyDamage();
    const taken = Math.max(0, dmg - game.block);
    game.playerHp = Math.max(0, game.playerHp - taken);
    game.block = 0; // Block wird beim Abfangen verbraucht
    setLog(taken > 0
      ? `${e.name} trifft dich für ${taken} Schaden!`
      : `${e.name} greift an – dein Block hält stand!`,
      taken > 0 ? "fail" : "info");
  }

  if (game.playerHp <= 0) {
    renderBattle();
    game.locked = true;
    setTimeout(() => { game.locked = false; endRun(false); }, 900);
    return;
  }

  // Zurück zum Spieler: eine Karte nachziehen, neue Aufgabe
  game.turn++;
  drawCards(HAND_SIZE - game.hand.length);
  newTask();
  game.locked = false;
  renderBattle();
}

function animateEnemyHit() {
  const el = $("enemy-sprite");
  el.classList.remove("hit");
  // Trick: Reflow erzwingen, damit die Animation neu startet
  void el.offsetWidth;
  el.classList.add("hit");
}

// Wie hart schlägt der Gegner beim nächsten Angriff zu?
function enemyDamage() {
  // leichter Anstieg über die Zeit, damit man nicht ewig heilen/stallen kann
  return game.enemy.atk + Math.floor((game.turn - 1) / 5);
}

function victory() {
  game.locked = true;
  setLog(`[SYSTEM] Quest abgeschlossen: ${game.enemy.name} gemeistert!`, "ok");
  renderBattle();

  setTimeout(() => {
    game.locked = false;
    game.fightIndex++;
    if (game.fightIndex >= TOTAL_FIGHTS) {
      endRun(true);
    } else {
      showReward();
    }
  }, 900);
}

/* ---------- Kampf rendern ---------- */
function setLog(msg, kind) {
  const log = $("battle-log");
  log.textContent = msg;
  log.className = "battle-log" + (kind ? " " + kind : "");
}

function renderBattle() {
  const e = game.enemy;

  $("run-progress").textContent = e.boss
    ? "ABSCHLUSSPRÜFUNG"
    : `Stunde ${game.fightIndex + 1} / ${TOTAL_FIGHTS}`;
  $("battle-deck-name").textContent = game.learningDeck.name;

  // Gegner
  $("enemy-sprite").textContent = e.sprite;
  $("enemy-name").textContent = e.name;
  $("enemy-hp-fill").style.width = (e.hp / e.maxHp * 100) + "%";
  $("enemy-hp-text").textContent = `${e.hp} / ${e.maxHp}`;
  const fumblePct = Math.round(fumbleChance() * 100);
  $("enemy-intent").innerHTML =
    `Nächster Angriff: ${enemyDamage()} Schaden · ` +
    `<span class="fumble">Patzer-Chance: ${fumblePct}%</span>` +
    (game.streak > 1 ? ` <span class="streak">🔥 ${game.streak}er-Serie!</span>` : "");

  // Aufgabe
  $("task-text").innerHTML = game.task
    ? game.task.text
    : "Keine Karten mehr – beende deinen Zug.";

  // Spieler
  $("player-hp-fill").style.width = (game.playerHp / PLAYER_MAX_HP * 100) + "%";
  $("player-hp-text").textContent = `${game.playerHp} / ${PLAYER_MAX_HP} LP`;
  $("block-badge").innerHTML = `<span>🛡️ ${game.block} Block</span>`;
  $("block-badge").classList.toggle("empty", game.block === 0);

  // Aktions-Auswahl (Angriff / Block / Heilung)
  document.querySelectorAll(".btn-mode").forEach((btn) => {
    const active = btn.dataset.mode === game.mode;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });

  // Hand
  const hand = $("hand");
  hand.innerHTML = "";
  const isReading = game.learningDeck.promptType === "reading";
  game.hand.forEach((card, i) => {
    const btn = document.createElement("button");
    btn.className = "card";

    // Lern-Gerüst: solange ein Wort nicht sitzt (3× richtig), steht die
    // volle Lösung klein auf der Karte. Ist es gemeistert, bleibt nur noch
    // die japanische Lesung stehen – die deutsche Übersetzung musst du
    // ab jetzt selbst wissen. (Beim Hiragana-Deck IST die Lesung die
    // Antwort, dort verschwindet die Hilfe deshalb komplett.)
    const mastered = isMastered(card.jp);
    const hintText = isReading ? card.reading : `${card.reading} · ${card.de}`;
    let hint = `<span class="card-hint">${hintText}</span>`;
    if (mastered) {
      hint = isReading
        ? ""
        : `<span class="card-hint mastered-jp" title="Gemeistert – nur noch die Lesung als Stütze">${card.reading}</span>`;
    }

    btn.innerHTML = `
      ${i < 9 ? `<span class="card-key" aria-hidden="true">${i + 1}</span>` : ""}
      <span class="card-word ${wordSizeClass(card.jp)}" lang="ja">${card.jp}</span>
      ${hint}
      <span class="card-points">✦ <span class="points-value">${card.value}</span> Punkte</span>`;
    btn.setAttribute("aria-label",
      `Karte ${i + 1}: ${card.jp}` +
      (mastered ? `, gesprochen ${card.reading}` : `, Hilfe: ${hintText}`) +
      `, ${card.value} Punkte, wirkt als ${MODE_NAMES[game.mode]}`);
    btn.disabled = game.locked || !game.task;
    btn.addEventListener("click", () => playCard(i));
    hand.appendChild(btn);
  });

  // Stapel-Info
  $("pile-info").textContent =
    `Nachziehstapel: ${game.drawPile.length} · Ablage: ${game.discardPile.length}`;
}

/* ---------- 9. Belohnung ---------- */
function showReward() {
  // Automatische Heilung nach dem Sieg
  const before = game.playerHp;
  game.playerHp = Math.min(PLAYER_MAX_HP, game.playerHp + HEAL_AFTER_WIN);
  const healed = game.playerHp - before;
  $("reward-heal").textContent = healed > 0
    ? `Kurze Pause auf dem Schulflur: +${healed} LP Selbstvertrauen (${game.playerHp}/${PLAYER_MAX_HP}).`
    : `Dein Selbstvertrauen ist bei vollen ${PLAYER_MAX_HP} LP – weiter geht's!`;

  // Drei Kartenangebote: zwei neue Wörter + ein Wiederholungs-Kandidat
  const words = pickRewardWords(3);
  const list = $("reward-list");
  list.innerHTML = "";

  words.forEach((word) => {
    const card = makeCard(word);
    const btn = document.createElement("button");
    btn.className = "card";
    btn.innerHTML = `
      <span class="card-word ${wordSizeClass(card.jp)}" lang="ja">${card.jp}</span>
      <span class="card-points">✦ <span class="points-value">${card.value}</span> Punkte</span>
      <span class="card-meaning">${card.reading} · ${card.de}</span>`;
    btn.setAttribute("aria-label",
      `Neue Karte: ${card.jp}, gesprochen ${card.reading}, bedeutet ${card.de}. ` +
      `${card.value} Punkte – einsetzbar als Angriff, Block oder Heilung.`);
    btn.addEventListener("click", () => {
      game.deck.push(card);
      showStudy(); // stellt das neue Wort vor, dann geht's in den Kampf
    });
    list.appendChild(btn);
  });

  showScreen("screen-reward");
}

/* ---------- 10. Ergebnis ---------- */
function endRun(won) {
  save.runs++;
  if (won) save.wins++;
  persistSave();

  const title = $("result-title");
  title.textContent = won ? "LEVEL UP!" : "OHNMACHT…";
  title.className = "result-title " + (won ? "win" : "lose");
  $("result-sub").textContent = won
    ? "Du hast den Schultag überstanden und die Prüfung bestanden. お見事 – das System ist beeindruckt!"
    : "Der Tag hat dich überrollt – aber jedes gelernte Wort bleibt. Morgen klingelt der Wecker erneut!";

  const total = game.stats.right + game.stats.wrong;
  const accuracy = total > 0 ? Math.round(game.stats.right / total * 100) : 0;
  $("result-stats").innerHTML = `
    <div class="stat-tile"><span class="stat-value">${game.stats.right}</span>
      <span class="stat-label">Richtig</span></div>
    <div class="stat-tile"><span class="stat-value">${game.stats.wrong}</span>
      <span class="stat-label">Falsch</span></div>
    <div class="stat-tile"><span class="stat-value">${accuracy}%</span>
      <span class="stat-label">Trefferquote</span></div>
    <div class="stat-tile"><span class="stat-value">${game.fightIndex}</span>
      <span class="stat-label">Kämpfe gewonnen</span></div>`;

  // Falsch beantwortete Wörter zum Wiederholen auflisten
  const box = $("review-box");
  const list = $("review-list");
  list.innerHTML = "";
  if (game.stats.wrongWords.length > 0) {
    box.classList.remove("hidden");
    game.stats.wrongWords.forEach((w) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="review-jp" lang="ja">${w.jp}</span>
        <span class="review-reading">${w.reading}</span>
        <span class="review-de">${w.de}</span>`;
      list.appendChild(li);
    });
  } else {
    box.classList.add("hidden");
  }

  showScreen("screen-result");
}

/* ---------- 11. Aktionswahl & Tastatursteuerung ---------- */
function setMode(mode) {
  game.mode = mode;
  if (!$("screen-battle").classList.contains("hidden")) renderBattle();
}

document.querySelectorAll(".btn-mode").forEach((btn) => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

document.addEventListener("keydown", (event) => {
  // Nur im Kampf aktiv
  if ($("screen-battle").classList.contains("hidden")) return;

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
});

/* ---------- Start ---------- */
$("btn-skip-reward").addEventListener("click", startBattle);
$("btn-study-continue").addEventListener("click", startBattle);
$("btn-restart").addEventListener("click", renderStart);

renderStart();
