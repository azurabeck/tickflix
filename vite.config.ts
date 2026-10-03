import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
    // `/api/*` são funções serverless da Vercel (pasta api/), que o Vite
    // sozinho não serve — em dev, rode `npm run dev:api` (vercel dev na
    // porta 3000) em OUTRO terminal e o Vite repassa as chamadas pra lá.
    // Sem ele, o proxy do Vite responde 500 (`http proxy error`) em toda
    // chamada de /api — Séries, Animes e a Home sem cache local.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        configure: (proxy) => {
          proxy.on("error", () => {
            console.error("\n[tickflix] A API local (/api) não está rodando. Em outro terminal: npm run dev:api\n");
          });
        },
      },
    },
  },
});
