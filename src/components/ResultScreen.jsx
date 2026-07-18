/* Ergebnisbildschirm: Sieg oder Niederlage samt Lernstatistik und Score */
import { game, save, backToStart } from "../game.js";

export default function ResultScreen() {
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

      {/* Run-Score: 10×Richtige + 15×längste Serie + 25×Begegnungen + Sieg-Bonus */}
      <div className="score-banner">
        <span className="score-value">✦ {game.score} Punkte</span>
        <span className="score-best">
          {game.score >= (save.bestScore || 0)
            ? "Neuer Bestwert!"
            : `Bestwert: ${save.bestScore}`}
        </span>
      </div>

      <div id="result-stats" className="result-stats">
        <div className="stat-tile"><span className="stat-value">{game.stats.right}</span>
          <span className="stat-label">Richtig</span></div>
        <div className="stat-tile"><span className="stat-value">{game.stats.wrong}</span>
          <span className="stat-label">Falsch</span></div>
        <div className="stat-tile"><span className="stat-value">{accuracy}%</span>
          <span className="stat-label">Trefferquote</span></div>
        <div className="stat-tile"><span className="stat-value">{game.stats.maxStreak}</span>
          <span className="stat-label">Längste Serie</span></div>
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
