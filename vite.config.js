import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base = "/SpiderZ/" damit Assets unter github.io/SpiderZ/assets/ laden (Sub-Pfad-Deploy)
export default defineConfig({
  base: '/SpiderZ/',
  plugins: [react()],
})
