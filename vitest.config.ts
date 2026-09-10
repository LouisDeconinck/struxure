import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
  define: {
    // Mirrors vite.config.ts so components reading the version work in tests.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    globals: true,
    // Node by default: the solver, design checks and stores need no DOM and
    // run faster without one. Component tests opt in per file with
    //   // @vitest-environment jsdom
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
