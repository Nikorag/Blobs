import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 150_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  outputDir: "test-results",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Pixel 7"],
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    // CI builds in an earlier step. Locally this builds first so `npm run e2e` just works.
    // No WEBDIS_URL: the in-memory store is fine for one server process.
    command: process.env.CI ? `npm start -- -p ${PORT}` : `npm run build && npm start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { WEBDIS_URL: "" },
  },
});
