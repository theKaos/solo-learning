/* =========================================================
   SOLO LEARNING: JAPANISCH – Einstiegspunkt (Vite + React)
   ---------------------------------------------------------
   Verdrahtet die Spiellogik (game.js) mit den React-
   Komponenten.
   ========================================================= */
import { useEffect, useReducer } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

import { game, setRefresh } from "./game.js";
import StartScreen from "./components/StartScreen.jsx";
import StudyScreen from "./components/StudyScreen.jsx";
import BattleScreen from "./components/BattleScreen.jsx";
import RewardScreen from "./components/RewardScreen.jsx";
import ResultScreen from "./components/ResultScreen.jsx";

/* Die App zeigt je nach Spielphase den passenden Bildschirm.
   Die Spiellogik meldet Änderungen über refresh() – hier
   verbunden mit einem simplen "Neu zeichnen"-Zähler. */
function App() {
  const [, force] = useReducer((n) => n + 1, 0);
  useEffect(() => { setRefresh(force); }, [force]);

  switch (game.screen) {
    case "study":  return <StudyScreen />;
    case "battle": return <BattleScreen />;
    case "reward": return <RewardScreen />;
    case "result": return <ResultScreen />;
    default:       return <StartScreen />;
  }
}

createRoot(document.getElementById("app")).render(<App />);
