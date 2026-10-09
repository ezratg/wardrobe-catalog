import { defineConfig, devices } from "@playwright/test";

const PORT = 3123;

export default defineConfig({
  testDir: "e2e",
  timeout: 300_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Use a pre-installed Chromium when one is provided (e.g. in CI images).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `rm -rf .e2e-data && npm run build && npx next start -p ${PORT}`,
    env: { DATA_DIR: ".e2e-data" },
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
  },
});
