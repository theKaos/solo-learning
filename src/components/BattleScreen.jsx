/* Die Begegnung: Gegner, Quest, Aktionswahl und die Kartenhand */
import { useEffect } from "react";
import {
  game, playCard, setMode, dismissMeaning, isMastered, wordSizeClass, comboBonus,
  fumbleChance, enemyDamage, PLAYER_MAX_HP, TOTAL_FIGHTS, MODE_NAMES
} from "../game.js";

/* Eine einzelne Wortkarte in der Hand – im Fächer angeordnet:
   Jede Karte wird abhängig von ihrer Position leicht gedreht und
   abgesenkt, wie in einer echten Kartenhand. Die Werte landen als
   CSS-Variablen auf der Karte; das Stylesheet nutzt sie für Lage
   UND Hover (Karte richtet sich auf und hebt sich aus dem Fächer). */
function HandCard({ card, index, count }) {
  const isReading = game.learningDeck.promptType === "reading";
  const mastered = isMastered(card.jp);
  const hintText = isReading ? card.reading : `${card.reading} · ${card.de}`;

  const mid = (count - 1) / 2;
  const off = index - mid;                    // Position relativ zur Mitte
  const rot = off * (count > 5 ? 5 : 7);      // Drehung in Grad
  const drop = off * off * (count > 5 ? 4 : 6); // Bogen: außen tiefer
  const fanStyle = {
    "--rot": rot + "deg",
    "--drop": drop + "px",
    zIndex: 10 + index
  };

  // Während der Ausspiel-Animation verschwindet die Karte aus der Hand
  const isFlying = game.playAnim && game.playAnim.card.id === card.id;

  // Lern-Gerüst: volle Hilfe, bis das Wort sitzt (Leitner-Stufe 3).
  // Danach bleibt nur die japanische Lesung stehen –
  // beim Hiragana-Deck (Lesung = Antwort) verschwindet sie ganz.
  let hint = <span className="card-hint">{hintText}</span>;
  if (mastered) {
    hint = isReading ? null : (
      <span className="card-hint mastered-jp"
            title="Gemeistert – nur noch die Lesung als Stütze">{card.reading}</span>
    );
  }
  // Prüfungs-Twists blenden die Hilfen aus
  if (game.hintsHidden) {
    hint = <span className="card-hint hint-hidden" title="Prüfungsmodus – keine Hilfen!">？？？</span>;
  }

  return (
    <button
      className={"card fan-card" + (isFlying ? " card-ghost" : "")}
      style={fanStyle}
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
      <span className="card-points">✦ <span className="points-value">{card.value}</span></span>
    </button>
  );
}

export default function BattleScreen() {
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
  const bonus = comboBonus();

  return (
    <section id="screen-battle" className="screen">
    {/* key={shakeId}: bei jedem Treffer gegen dich neu einhängen → Screen-Shake */}
    <div key={game.shakeId} className={game.shakeId > 0 ? "shake-wrap" : ""}>

      {/* Ausspiel-Inszenierung: Die gewählte Karte fliegt vergrößert in
          die Bildschirmmitte. Richtig → goldener Glanz, dann verpufft sie.
          Falsch → sie färbt sich rot, zerbröckelt, und die Bedeutung
          wird sofort groß eingeblendet. */}
      {game.playAnim && (
        <div className="play-overlay">
          <div key={game.playAnim.id} aria-hidden="true"
               className={"play-card " + (game.playAnim.correct ? "anim-correct" : "anim-wrong")}>
            <span className={`card-word ${wordSizeClass(game.playAnim.card.jp)}`} lang="ja">
              {game.playAnim.card.jp}
            </span>
            <span className="card-points">✦ <span className="points-value">{game.playAnim.card.value}</span></span>
          </div>
          {!game.playAnim.correct && (
            <div key={"m" + game.playAnim.id} className="play-meaning-box" role="status">
              <p className="play-meaning">{game.playAnim.meaning}</p>
              <button className="btn btn-primary play-continue" autoFocus
                      onClick={dismissMeaning}>Verstanden – weiter</button>
            </div>
          )}
        </div>
      )}

      {/* Feier-Moment: Wort zum 3. Mal richtig → GEMEISTERT */}
      {game.mastery && (
        <div key={"m" + game.mastery.id} className="mastery-pop" role="status">
          <span className="mastery-star" aria-hidden="true">★</span>
          GEMEISTERT: <span lang="ja">{game.mastery.jp}</span> ({game.mastery.reading})
        </div>
      )}

      <div className="battle-top">
        <span id="run-progress" className="run-progress">
          {e.boss ? "ABSCHLUSSPRÜFUNG" : `Stunde ${game.fightIndex + 1} / ${TOTAL_FIGHTS}`}
        </span>
        <span id="battle-deck-name" className="battle-deck-name">{game.learningDeck.name}</span>
      </div>

      {/* Gegner */}
      <div className="enemy-panel">
        {/* key={hitFlash}: bei jedem Treffer neu einhängen → Animation startet neu */}
        <div id="enemy-sprite" key={game.hitFlash}
             className={"enemy-sprite" + (game.hitFlash > 0 ? " hit" : "")}
             aria-hidden="true">{e.sprite}</div>
        <div className="enemy-info">
          {/* Schwebende Effekt-Zahl über dem Gegner */}
          {game.enemyFx && (
            <span key={game.enemyFx.id} className={"fx fx-" + game.enemyFx.kind}
                  aria-hidden="true">{game.enemyFx.text}</span>
          )}
          <h2 id="enemy-name" className="enemy-name">{e.name}</h2>
          <div className="bar hp-bar" role="img" aria-label="Lebenspunkte des Gegners">
            <div id="enemy-hp-fill" className="bar-fill enemy-fill"
                 style={{ width: (e.hp / e.maxHp * 100) + "%" }}></div>
            <span id="enemy-hp-text" className="bar-text">{e.hp} / {e.maxHp}</span>
          </div>
          <p id="enemy-intent" className="enemy-intent">
            Nächster Angriff: {enemyDamage()} Schaden · <span className="fumble">Patzer-Chance: {fumblePct}%</span>
            {game.streak > 1 && <span className="streak"> 🔥 {game.streak}er-Serie!</span>}
            {bonus > 0 && <span className="combo"> ✦ Kombo-Bonus: +{bonus}</span>}
          </p>
          {e.twist !== "none" && (
            <p className="twist-line">◈ {e.twistText}</p>
          )}
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
          {/* Schwebende Effekt-Zahl beim Spieler */}
          {game.playerFx && (
            <span key={game.playerFx.id} className={"fx fx-" + game.playerFx.kind}
                  aria-hidden="true">{game.playerFx.text}</span>
          )}
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
          {game.hand.map((card, i) =>
            <HandCard key={card.id} card={card} index={i} count={game.hand.length} />)}
        </div>

        <div className="battle-actions">
          <span id="pile-info" className="pile-info">
            Nachziehstapel: {game.drawPile.length} · Ablage: {game.discardPile.length}
          </span>
        </div>
      </div>

    </div>
    </section>
  );
}
