import { defineConfig } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function availableChrome(): string | undefined {
  const override = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (override && existsSync(override)) return override;
  // Reuse an installed browser. Do not download a browser as a side effect of verification.
  if (process.platform === "win32") {
    const playwrightCache = join(
      process.env.LOCALAPPDATA ?? "",
      "ms-playwright",
    );
    if (existsSync(playwrightCache)) {
      for (const folder of readdirSync(playwrightCache)
        .filter((name) => name.startsWith("chromium-"))
        .sort()
        .reverse()) {
        for (const directory of ["chrome-win64", "chrome-win"]) {
          const path = join(playwrightCache, folder, directory, "chrome.exe");
          if (existsSync(path)) return path;
        }
      }
    }
    const puppeteerCache = join(homedir(), ".cache", "puppeteer", "chrome");
    if (existsSync(puppeteerCache)) {
      for (const folder of readdirSync(puppeteerCache).sort().reverse()) {
        const path = join(puppeteerCache, folder, "chrome-win64", "chrome.exe");
        if (existsSync(path)) return path;
      }
    }
  }
  return undefined;
}

// SOLLU_WEB_PORT / SOLLU_API_PORT let E2E run beside another checkout's dev
// servers instead of silently reusing them. Defaults match `pnpm dev`.
const webPort = process.env.SOLLU_WEB_PORT || "5173";
const apiPort = process.env.SOLLU_API_PORT || "8787";
const baseURL = `http://localhost:${webPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    headless: true,
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { executablePath: availableChrome() },
  },
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      MOCK_PROVIDERS: "1",
      LLM_PROVIDER: "mock",
      // Tests mock policy responses; pin the real server to the checked-in
      // default so a developer's local .env cannot change results.
      ALLOW_CLOUD_AI: "0",
      PORT: apiPort,
      SOLLU_WEB_PORT: webPort,
      SOLLU_API_PORT: apiPort,
      PUBLIC_ORIGIN: baseURL,
    },
  },
});
