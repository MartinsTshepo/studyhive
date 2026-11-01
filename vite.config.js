import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // GitHub Pages serves a project site from /<repo-name>/, so production builds
  // must prefix asset URLs with it. Both `vite build` and `vite preview` run in
  // "production" mode (so preview mirrors the deployed site); `npm run dev` stays on "/".
  // If you rename the repo or add a custom domain, change this to match (custom domain: '/').
  base: mode === 'production' ? '/studyhive/' : '/',
  plugins: [react()],
}))
