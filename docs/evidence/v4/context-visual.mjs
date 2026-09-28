import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Isolated fictional browser data; no API key and no sentence-provider calls.
const output = fileURLToPath(new URL(".", import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const results = [];
try {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    const context = await browser.newContext({
      viewport,
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
    });
    const page = await context.newPage();
    const errors = [];
    let intentRequests = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/intent") intentRequests++;
    });
    await page.addInitScript(() => {
      window.__contextSpeechCalls = 0;
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          getVoices: () => [],
          cancel: () => {},
          speak: () => {
            window.__contextSpeechCalls++;
          },
          addEventListener: () => {},
          removeEventListener: () => {},
        },
        configurable: true,
      });
    });
    await page.route("**/api/llm/settings", (route) =>
      route.fulfill({
        json: {
          provider: "mock",
          model: "catalog",
          timeoutMs: 15000,
          revision: 1,
          cloudConsent: false,
          providers: [
            {
              id: "mock",
              label: "Free vocabulary",
              defaultModel: "catalog",
              keyConfigured: false,
              keySource: "none",
              requiresKey: false,
            },
          ],
        },
      }),
    );
    await page.goto("http://localhost:5173/settings?tab=context");
    await page.getByLabel("Caregiver PIN", { exact: true }).fill("2468");
    await page.getByRole("button", { name: "Create PIN", exact: true }).click();
    await page
      .getByRole("heading", {
        name: "Give a few words more context",
        exact: true,
      })
      .waitFor();
    const tab = page.getByRole("tab", { name: "Context engine", exact: true });
    await tab.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(
      page.getByRole("tab", { name: "Sentence engine", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    const previousTab = await page
      .getByRole("tab", { name: "Sentence engine", exact: true })
      .getAttribute("aria-selected");
    await page.keyboard.press("ArrowRight");
    await expect(tab).toHaveAttribute("aria-selected", "true");
    const returnedTab = await tab.getAttribute("aria-selected");
    await page.keyboard.press("Home");
    await expect(
      page.getByRole("tab", { name: "General", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    const homeTab = await page
      .getByRole("tab", { name: "General", exact: true })
      .getAttribute("aria-selected");
    await page.keyboard.press("End");
    await expect(
      page.getByRole("tab", { name: "Privacy", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    const lastTab = await page
      .getByRole("tab", { name: "Privacy", exact: true })
      .getAttribute("aria-selected");
    await tab.click();
    await page
      .getByRole("combobox", { name: "Clock source", exact: true })
      .selectOption("demo");
    await page.getByLabel("Demo starting time", { exact: true }).fill("12:55");
    await page
      .getByRole("combobox", { name: "Current place", exact: true })
      .selectOption("home");
    const device = viewport.width === 390 ? "mobile" : "desktop";
    await page
      .getByRole("heading", {
        name: "Give a few words more context",
        exact: true,
      })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${output}/context-controls-${device}.png`,
      fullPage: viewport.width > 600,
    });
    await page
      .getByRole("heading", { name: "Preview of these settings", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/context-preview-${device}.png` });
    await page
      .getByRole("button", { name: "Add routine", exact: true })
      .click();
    await page
      .getByLabel("Activity", { exact: true })
      .fill("Tea in the garden");
    await page
      .getByRole("combobox", { name: "Routine topic", exact: true })
      .selectOption("drink");
    await page
      .getByRole("combobox", { name: "Routine place", exact: true })
      .selectOption("home");
    await page
      .getByRole("group", { name: "Routine editor", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/context-routine-${device}.png` });
    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      speechCalls: window.__contextSpeechCalls,
      unlabeledControls: [
        ...document.querySelectorAll("input,select,textarea"),
      ].filter(
        (element) =>
          !element.labels?.length &&
          !element.getAttribute("aria-label") &&
          !element.getAttribute("aria-labelledby"),
      ).length,
    }));
    const result = {
      device,
      ...layout,
      previousTab,
      returnedTab,
      homeTab,
      lastTab,
      intentRequests,
      errors,
    };
    results.push(result);
    if (
      layout.viewport !== layout.document ||
      layout.speechCalls ||
      layout.unlabeledControls ||
      intentRequests ||
      errors.length ||
      [previousTab, returnedTab, homeTab, lastTab].some(
        (value) => value !== "true",
      )
    )
      throw new Error(JSON.stringify(result));
    await context.close();
  }
} finally {
  await writeFile(
    `${output}/context-visual-checks.json`,
    JSON.stringify(results, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
