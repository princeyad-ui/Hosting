import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    minify: "esbuild",
    sourcemap: false,
  },
  server: {
    // ✅ Fix CORS and security headers for dev server
    cors: {
      origin: "http://localhost:5000",
      credentials: true,
    },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
