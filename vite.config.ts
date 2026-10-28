import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// W trybie deweloperskim obsługuje /api/story tym samym kodem, który na Vercelu działa jako funkcja.
function devStoryApi(apiKey: string | undefined): Plugin {
  return {
    name: "spacer-dev-story-api",
    configureServer(server) {
      server.middlewares.use("/api/story", async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const { handleStoryRequest } = (await server.ssrLoadModule("/server/storyHandler.ts")) as typeof import("./server/storyHandler");
        const response = await handleStoryRequest(
          new Request("http://localhost/api/story", {
            method: req.method,
            headers: { "content-type": "application/json" },
            body: Buffer.concat(chunks),
          }),
          apiKey,
        );
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    worker: { format: "es" },
    plugins: [
      react(),
      devStoryApi(env.ANTHROPIC_API_KEY),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon.svg"],
        manifest: {
          name: "Spacer",
          short_name: "Spacer",
          description: "Głosowy przewodnik po okolicy, w której jesteś.",
          lang: "pl",
          start_url: "/",
          display: "standalone",
          background_color: "#f6f3ec",
          theme_color: "#2f6b4f",
          icons: [
            { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          ],
        },
        workbox: {
          // API i zewnętrzne usługi zawsze przez sieć — cache'ujemy aplikację i pliki silnika głosu.
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // Modele Piper (ok. 60 MB) i pliki WASM: pobierane raz, potem z pamięci telefonu.
              urlPattern: ({ url }) =>
                url.hostname === "huggingface.co" ||
                (url.hostname === "cdnjs.cloudflare.com" && url.pathname.includes("/onnxruntime-web/")) ||
                (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/piper-wasm@")),
              handler: "CacheFirst",
              options: {
                cacheName: "spacer-voice-models",
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 20 },
              },
            },
          ],
        },
      }),
    ],
  };
});
