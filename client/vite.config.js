import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Force fresh build - clear Netlify cache
export default defineConfig({
  base: "/",
  plugins: [react()],
  define: {
    __ENV__: JSON.stringify(process.env),
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    minify: "esbuild",
    sourcemap: false,
    // Ensure env vars are included
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});

