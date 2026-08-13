import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'ui/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Scoped to the pure-function areas this suite actually exercises (see
      // CLAUDE.md Testing) — route handlers, the Agents SDK Durable Object, and
      // Workflows aren't unit-testable without Miniflare bindings, so including
      // them would dilute the threshold rather than measure anything real.
      include: ['src/utils/**', 'src/ai/**', 'src/eval/**', 'src/redteam/**'],
      // Floor, not a target: set a few points below the current measured
      // baseline (~47/71/73/47 at the time this gate was added) so it catches
      // regressions without blocking on coverage this pass didn't add.
      thresholds: {
        statements: 40,
        branches: 65,
        functions: 65,
        lines: 40,
      },
    },
  },
});
