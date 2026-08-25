import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages sirve el sitio bajo /pisocheck/
  base: '/pisocheck/',
  plugins: [react()],
})
