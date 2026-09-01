import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Field Atlas is a static client instrument; base is relative so the built
// `dist/` hosts from any path.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2021',
    // Keep the expensive Canvas viz out of the initial chunk.
    chunkSizeWarningLimit: 700,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
