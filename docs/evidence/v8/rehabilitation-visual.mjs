import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL(".", import.meta.url));
const origin = "http://127.0.0.1:5173";
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
      external = [],
      views = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (entry) => {
      if (entry.type() === "error") errors.push(entry.text());
    });
    page.on("request", (request) => {
      if (
        /^https?:/.test(request.url()) &&
        !["localhost", "127.0.0.1"].includes(new URL(request.url()).hostname)
      )
        external.push(request.url());
    });
    await page.addInitScript(() => {
      window.__rehabSpeech = 0;
      window.__rehabRecognition = 0;
      class Recognition {
        processLocally = false;
        start() {
          window.__rehabRecognition++;
        }
        abort() {}
        stop() {}
      }
      Object.defineProperty(window, "SpeechRecognition", {
        configurable: true,
        value: Recognition,
      });
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          getVoices: () => [],
          cancel() {},
          speak() {
            window.__rehabSpeech++;
          },
          addEventListener() {},
          removeEventListener() {},
        },
      });
    });
    async function unlock() {
      await page.getByLabel("Caregiver PIN", { exact: true }).fill("2468");
      const create = page.getByRole("button", {
        name: "Create PIN",
        exact: true,
      });
      await (
        (await create.isVisible())
          ? create
          : page.getByRole("button", { name: "Unlock", exact: true })
      ).click();
    }
    async function checkView(name, heading) {
      if (heading) {
        const title = page.getByRole("heading", { name: heading, exact: true });
        await expect(title).toBeVisible();
        await title.evaluate((element) =>
          element.scrollIntoView({ block: "start" }),
        );
      } else {
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      await page.screenshot({
        path: `${output}/${name}-${viewport.width}.png`,
      });
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const serious = audit.violations
        .filter((v) => ["serious", "critical"].includes(v.impact))
        .map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }));
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      expect(serious).toEqual([]);
      expect(overflow).toBe(false);
      expect(await page.evaluate(() => window.__rehabSpeech)).toBe(0);
      expect(await page.evaluate(() => window.__rehabRecognition)).toBe(0);
      const navigationTargets = await page
        .locator(
          'nav[aria-label="Mobile navigation"] button, nav[aria-label="Main navigation"] button, .rehabilitation-nav button, .hub-view-tabs a',
        )
        .evaluateAll((elements) =>
          elements
            .map((element) => {
              const box = element.getBoundingClientRect();
              return {
                name: element.textContent.trim(),
                width: box.width,
                height: box.height,
              };
            })
            .filter((box) => box.width > 0 && box.height > 0),
        );
      expect(
        navigationTargets.filter((box) => box.width < 72 || box.height < 72),
      ).toEqual([]);
      views.push({
        name,
        serious,
        overflow,
        speech: 0,
        recognition: 0,
        navigationTargets,
      });
    }

    await page.goto(`${origin}/rehabilitation`);
    await expect(
      page.getByRole("heading", { name: "My rehabilitation", exact: true }),
    ).toBeVisible();
    // A new isolated profile starts with Tamil interface labels.
    await page.locator(".language-switch").click();
    await checkView("rehabilitation-navigation");
    await checkView("rehabilitation-empty", "My rehabilitation");
    const primaryNavigation = page.getByRole("navigation", {
      name: viewport.width < 760 ? "Mobile navigation" : "Main navigation",
      exact: true,
    });
    await expect(
      primaryNavigation.getByRole("button", {
        name: "Rehabilitation",
        exact: true,
      }),
    ).toHaveAttribute("aria-current", "page");

    await page
      .getByRole("navigation", {
        name: "Rehabilitation navigation",
        exact: true,
      })
      .getByRole("button", { name: "Practice", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start this practice", exact: true })
      .click();
    await page
      .getByLabel("Words actually heard (optional)", { exact: true })
      .fill("Please me time");
    await page
      .getByLabel(
        "A person checked that this transcript reflects what was said",
        { exact: true },
      )
      .check();
    await page
      .getByRole("button", { name: "Save practice", exact: true })
      .click();
    await expect(
      page.getByText("Practice saved on this device.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "See my updated progress", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Progress period", exact: true }),
    ).toHaveValue("7");
    await checkView("rehabilitation-progress", "Your recorded progress");
    await checkView("rehabilitation-words", "Words to revisit");
    await page
      .getByRole("navigation", { name: "Rehabilitation views", exact: true })
      .getByRole("link", { name: "Overview", exact: true })
      .click();
    await expect(
      page.getByText("1 / 3 saved practices", { exact: true }),
    ).toBeVisible();
    await checkView("rehabilitation-overview", "My rehabilitation");

    await page
      .getByRole("navigation", {
        name: "Rehabilitation navigation",
        exact: true,
      })
      .getByRole("button", { name: "Clinician dashboard", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Clinical review workspace",
        exact: true,
      }),
    ).toHaveCount(0);
    await unlock();
    await expect(
      page.getByRole("heading", { name: "Clinician dashboard", exact: true }),
    ).toBeVisible();
    await checkView("clinician-overview", "Clinical review workspace");
    await checkView("clinician-queue", "Review queue");
    await page
      .locator('[aria-label="Dashboard views"]')
      .getByRole("button", { name: "Rehabilitation review", exact: true })
      .click();
    await expect(
      page.getByLabel("Report purpose and limitations"),
    ).toContainText("not clinically validated endpoints");
    await checkView("clinician-report", "Communication Progress Report");

    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    results.push({
      viewport,
      views,
      errors,
      externalRequests: external.length,
    });
    await context.close();
  }
  await writeFile(
    `${output}/rehabilitation-visual.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
