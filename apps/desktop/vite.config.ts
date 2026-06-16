import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@habit-ai/db/schema": path.resolve(
        __dirname,
        "../../packages/db/src/schema.ts"
      ),
      "@habit-ai/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
      "@habit-ai/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts"),
    },
  },
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_"],
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    include: ["sql.js"],
    esbuildOptions: {
      target: "es2022",
    },
  },
  build: {
    target: "es2021",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
