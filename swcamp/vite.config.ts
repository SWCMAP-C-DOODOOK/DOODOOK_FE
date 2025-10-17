import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    proxy: {
      '/api':     { target: 'http://3.39.237.77', changeOrigin: true },
      '/healthz': { target: 'http://3.39.237.77', changeOrigin: true,
      },
    },
  },
});