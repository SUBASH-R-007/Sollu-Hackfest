import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

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
    const errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("request", (r) => {
      if (/\/api\/(intent|tts)/.test(r.url())) requests.push(r.url());
    });
    await page.addInitScript(() => {
      window.__rehabSpeech = 0;
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          getVoices: () => [],
          cancel: () => {},
          speak: () => {
            window.__rehabSpeech++;
          },
          addEventListener: () => {},
          removeEventListener: () => {},
        },
      });
    });
    const device = viewport.width < 600 ? "mobile" : "desktop";
    await page.goto("http://localhost:5173/practice");
    await page
      .getByRole("heading", { name: "Communication practice", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Start this practice", exact: true })
      .click();
    await page
      .getByLabel("Words actually heard (optional)", { exact: true })
      .fill("Please me time");
    await page
      .getByRole("checkbox", {
        name: "A person checked that this transcript reflects what was said",
        exact: true,
      })
      .check();
    await page.getByRole("checkbox", { name: "give", exact: true }).check();
    await page
      .getByRole("combobox", { name: /^Did my partner understand/ })
      .selectOption("yes");
    await page.locator(".rehab-score").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/practice-review-${device}.png` });
    const practiceAxe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    await page
      .getByRole("button", { name: "Save practice", exact: true })
      .click();
    await expect(
      page.getByText("Practice saved on this device.", { exact: false }),
    ).toBeVisible();
    await page.goto("http://localhost:5173/therapist");
    await page.getByLabel("Caregiver PIN", { exact: true }).fill("2468");
    await page.getByRole("button", { name: "Create PIN", exact: true }).click();
    await page
      .getByRole("heading", { name: "Rehabilitation review", exact: true })
      .waitFor();
    await page
      .getByRole("heading", { name: "Therapist dashboard", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${output}/therapist-overview-${device}.png`,
    });
    await page
      .getByText("Individual profile & practice plan", { exact: true })
      .click();
    await page
      .getByRole("combobox", { name: /^Communication needs/ })
      .selectOption("als");
    await page
      .getByRole("combobox", { name: /^Usual communication method/ })
      .selectOption("aac");
    await page
      .getByRole("combobox", { name: /^Communication needs/ })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/therapist-plan-${device}.png` });
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      speech: window.__rehabSpeech,
    }));
    const dashboardAxe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const violations = [...practiceAxe.violations, ...dashboardAxe.violations]
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      }));
    results.push({ device, layout, errors, requests, violations });
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  `${output}/rehab-visual-checks.json`,
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
if (
  results.some(
    (r) =>
      r.errors.length ||
      r.requests.length ||
      r.violations.length ||
      r.layout.speech ||
      r.layout.document > r.layout.viewport,
  )
)
  process.exitCode = 1;
