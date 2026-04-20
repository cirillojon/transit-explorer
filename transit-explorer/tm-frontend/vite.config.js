import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd());
  const isDev = mode !== "production";

  // In dev, proxy /api → backend so we can use relative URLs and keep cookies/headers simple.
  // In prod, the frontend is served from a static host (Cloudflare Pages, etc.) and hits
  // VITE_API_BASE_URL directly — no proxy involved.
  const proxyTarget = env.VITE_PROXY_URL || env.VITE_API_BASE_URL;

  return {
    plugins: [react()],
    server: {
      host: true,
      proxy:
        isDev && proxyTarget
          ? {
              "/api": {
                target: proxyTarget,
                changeOrigin: true,
                secure: false,
              },
            }
          : undefined,
    },
    build: {
      sourcemap: false,
      target: "es2020",
      chunkSizeWarningLimit: 800,
    },
  };
});
