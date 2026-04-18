import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to your GitHub Pages repo name, e.g. '/program-builder/'
// Or '/' if using a custom domain
export default defineConfig({
  plugins: [react()],
  base: '/program-builder/',
})
