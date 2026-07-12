/* Nachbearbeitung für den Build: Der TypeScript-Compiler maskiert
   Umlaute und japanische Zeichen als \uXXXX – dieses Skript schreibt
   sie wieder als echte Zeichen, damit public/app.js lesbar bleibt. */
const fs = require("fs");

const file = "public/app.js";
const code = fs.readFileSync(file, "utf8");

const readable = code.replace(/\\u([0-9a-fA-F]{4})/g,
  (_, hex) => String.fromCharCode(parseInt(hex, 16)));

fs.writeFileSync(file, readable);
console.log("app.js: Unicode-Zeichen wieder lesbar gemacht.");
