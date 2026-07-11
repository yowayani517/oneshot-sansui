import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/** Capacitor Android WebView + service workers often blank the app. */
const isCapacitor = process.env.CAPACITOR === "1";

export default defineConfig({
  // Relative URLs are safer inside the Capacitor asset server.
  base: isCapacitor ? "./" : "/",
  plugins: [
    react(),
    VitePWA({
      disable: isCapacitor,
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "山水 — 墨流し",
        short_name: "山水",
        description: "墨と霞のアトリエ。庭をスクロールし、墨流しで遊ぶ。",
        theme_color: "#f5f1e8",
        background_color: "#f5f1e8",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        lang: "ja",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Large video assets — cache pages/scripts; videos stay network-first
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2,png,webp}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/videos\/.*\.mp4$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "sansui-videos",
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    watch: {
      ignored: ["**/public/**", "**/docs/**", "**/android/**", "**/dist/**"],
    },
  },
  preview: {
    host: true,
  },
});
