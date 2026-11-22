import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Assets must be requested from the site root. Netlify serves the deploy at
  // "/" and the SPA rewrite points at "/index.html", so a relative base ("./")
  // would break /assets/*.css on nested paths such as /admin.
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Leftover backup folders / build output must never trigger HMR reloads
      ignored: ['**/node_modules_old/**', '**/dist/**'],
    },
  },
})
