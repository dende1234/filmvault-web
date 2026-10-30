import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (e2e/). Against a running site with E2E_BASE_URL (e.g.
// a Vercel preview), otherwise against `next start` on port 3100 (run
// `npm run build` first). Tests that need an account read E2E_EMAIL and
// E2E_PASSWORD (a test member in a test Supabase project) and are skipped
// without them.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start -- -p 3100", url: "http://localhost:3100/login", reuseExistingServer: true, timeout: 60_000 },
});
