import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Dominio propio pisocheck.es: la app se sirve en la raíz
  base: '/',
  plugins: [react()],
})
