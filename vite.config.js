import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves project sites under /<repo>/, so set base on build.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mindhub-psych-emr/' : '/',
  plugins: [react()],
}))
