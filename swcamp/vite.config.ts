import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    cors: {
      origin: true,            // reflect request origin
      credentials: true,       // allow cookies through the dev server
    },
    proxy: {
      "/api": {
        target: "http://3.39.237.77",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost",   // make Set-Cookie domain usable at http://localhost:5173
        cookiePathRewrite: "/",
        configure: (proxy) => {
          // strip COOP/COEP coming from upstream (avoids noisy browser warning in dev)
          proxy.on("proxyRes", (proxyRes) => {
            delete proxyRes.headers["cross-origin-opener-policy"];
            delete proxyRes.headers["cross-origin-embedder-policy"];
          });
        },
      },
      "/healthz": {
        target: "http://3.39.237.77",
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: { host: "localhost" },
  },
});