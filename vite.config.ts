import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["@mapbox/node-pre-gyp", "@mswjs/interceptors", "nock"], // ✅ 번들링 제외
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8086",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  define: {
   // "window.jQuery": "jquery",
    //"window.$": "jquery",
    //"window.i18next": "i18next",
  },
})
