import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd());
  const isDev = mode !== "production";
  // In dev, proxy /api → backend so we can use relative URLs and keep cookies/headers simple.
  // In prod, the frontend is served from a static host (Cloudflare Pages, etc.) and hits
  // VITE_API_BASE_URL directly — no proxy involved.
  const proxyTarget = env.VITE_PROXY_URL || env.VITE_API_BASE_URL;

  // Upload source maps to Sentry only when all three pieces are present.
  // In Vercel: SENTRY_AUTH_TOKEN comes from the project env (Sensitive),
  // SENTRY_ORG/SENTRY_PROJECT can be set in the Vercel project too.
  // eslint-disable-next-line no-undef
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
  // eslint-disable-next-line no-undef
  const sentryOrg = process.env.SENTRY_ORG;
  // eslint-disable-next-line no-undef
  const sentryProject = process.env.SENTRY_PROJECT;
  const sentryUploadEnabled =
    !isDev && sentryAuthToken && sentryOrg && sentryProject;

  return {
    plugins: [
      react(),
      ...(sentryUploadEnabled
        ? [
            sentryVitePlugin({
              org: sentryOrg,
              project: sentryProject,
              authToken: sentryAuthToken,
              // Sourcemaps are emitted by `build.sourcemap: true` below;
              // the plugin uploads them and then deletes them from the
              // output dir so they aren't shipped to the browser.
              sourcemaps: {
                filesToDeleteAfterUpload: ["**/*.map"],
              },
              // Tag the release with the git sha (Vercel injects this).
              // eslint-disable-next-line no-undef
              release: { name: process.env.VERCEL_GIT_COMMIT_SHA },
              telemetry: false,
            }),
          ]
        : []),
    ],
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
    esbuild: {
      // Strip console.* and debugger statements from production bundles.
      // Tests/dev still see them.
      drop: isDev ? [] : ["console", "debugger"],
    },
    build: {
      // Source maps must be generated for Sentry to symbolicate stack
      // traces. The Sentry plugin deletes them from the dist/ output
      // after upload so they aren't publicly served.
      sourcemap: sentryUploadEnabled ? true : false,
      target: "es2020",
      chunkSizeWarningLimit: 800,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.js"],
      css: false,
    },
  };
});
