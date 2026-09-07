import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    navigationTimeout: 20_000
  },
  webServer: {
    // Runs against `next dev` (not a production build) specifically so the
    // dev-only local-installer download fallback in src/lib/devLocalInstaller.ts
    // is reachable here — that fallback is hard-disabled whenever
    // NODE_ENV=production, by design (see its own doc comment). The
    // production bundle itself is validated separately via `npm run build`.
    command: 'npm run dev -- -p 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 180_000
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } }
  ]
})
