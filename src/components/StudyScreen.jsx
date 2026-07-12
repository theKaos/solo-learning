/* Lern-Moment: Das System stellt neue Wörter in Ruhe vor,
   bevor sie in der nächsten Begegnung abgefragt werden. */
import { game, startBattle } from "../game.js";

export default function StudyScreen() {
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
          // Eselsbrücke (falls vorhanden) aus den Deck-Daten holen
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
