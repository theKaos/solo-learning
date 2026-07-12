import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative Pfade im Build – so funktioniert die App auch in einem
  // Unterordner, z. B. auf GitHub Pages (username.github.io/repo/)
  base: "./"
});
