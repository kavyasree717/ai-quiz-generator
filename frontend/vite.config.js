import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development the frontend proxies /api calls to the FastAPI backend,
// so you don't need to deal with CORS while running locally.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
