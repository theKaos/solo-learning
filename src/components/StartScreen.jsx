/* Startbildschirm: Story, Deck-Auswahl und Gesamtstatistik */
import { LEARNING_DECKS } from "../decks.js";
import { save, startRun, MASTERY_GOAL } from "../game.js";

export default function StartScreen() {
  // Gemeisterte Wörter über alle Decks zählen
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
