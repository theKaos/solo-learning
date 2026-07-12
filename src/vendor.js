/* Baut die React-Bibliothek zu public/react.js zusammen und stellt
   sie als globale Objekte bereit (window.React, window.ReactDOMClient).
   Muss nur neu gebaut werden, wenn die React-Version wechselt:
   npm run build:react */
import * as React from "react";
import { createRoot } from "react-dom/client";

window.React = React;
window.ReactDOMClient = { createRoot };
