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
      // baseline (~43/45/49/44 after the vitest 3->4 bump, which changed how
      // @vitest/coverage-v8 remaps branches/functions and dropped the
      // reported numbers well below the old 47/71/73/47 baseline for the same
      // tests and source — see PR resolving the Dependabot vitest alerts).
      thresholds: {
        statements: 40,
        branches: 40,
        functions: 44,
        lines: 40,
      },
    },
  },
});
