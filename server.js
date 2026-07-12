/* =========================================================
   SOLO LEARNING: JAPANISCH – Server
   ---------------------------------------------------------
   Ein bewusst kleiner Express-Server: Er liefert die fertig
   gebaute App aus dem Ordner "dist" aus (entsteht durch
   `npm run build`). Für die Entwicklung brauchst du ihn
   nicht – dafür gibt es `npm run dev` (Vite-Dev-Server).

   Produktion:  npm install → npm run build → npm start
   Spielen:     http://localhost:3000
   ========================================================= */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Die gebaute App aus /dist ausliefern
app.use(express.static(path.join(__dirname, "dist")));

app.listen(PORT, () => {
  console.log(`Solo Learning: Japanisch läuft auf http://localhost:${PORT}`);
  console.log(`(Falls "dist" fehlt: zuerst "npm run build" ausführen.)`);
});
