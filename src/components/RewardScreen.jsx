/* Belohnung nach einem Sieg: eine von drei neuen Wortkarten wählen */
import { game, chooseReward, startBattle, wordSizeClass } from "../game.js";

export default function RewardScreen() {
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
            <span className="card-points">✦ <span className="points-value">{card.value}</span></span>
            <span className="card-meaning">{card.reading} · {card.de}</span>
          </button>
        ))}
      </div>
      <button id="btn-skip-reward" className="btn btn-ghost"
              onClick={startBattle}>Keine Karte nehmen</button>
    </section>
  );
}
