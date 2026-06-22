import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// В деве проксируем /api на бэкенд бота, чтобы не возиться с CORS локально.
// В проде /api проксируется на том же домене через nginx/Caddy (см. nginx.conf и docker-compose).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
