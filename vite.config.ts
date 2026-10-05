import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` → dist/ (normal multi-file build, served with `npm run preview`)
// `npm run build:single` → dist-single/index.html (one self-contained file you can double-click)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'single' ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000 } : {},
}))
