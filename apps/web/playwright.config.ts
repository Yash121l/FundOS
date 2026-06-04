import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // firefox and webkit are reserved for a dedicated cross-browser suite
  ],
  // In CI, the runner must provide a live server at http://localhost:3000 before tests run
  // (via `pnpm build && pnpm start`). Note: this means CI tests run against a production build
  // while local tests run against the dev server — run `pnpm build && pnpm start` locally
  // before e2e tests to validate production-specific behaviour before pushing.
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
