import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
