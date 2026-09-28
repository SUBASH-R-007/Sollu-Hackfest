import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const output = fileURLToPath(new URL('.', import.meta.url));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
const results = [];
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [], external = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (entry) => { if (entry.type() === 'error') errors.push(entry.text()); });
    page.on('request', (request) => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== 'localhost') external.push(request.url());
    });
    await page.addInitScript(() => {
      window.__recognitionStarts = 0;
      class Recognition { processLocally = false; start() { window.__recognitionStarts++; } abort() {} stop() {} }
      Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: Recognition });
    });
    await page.goto('http://localhost:5173/settings');
    await page.getByLabel('Caregiver PIN', { exact: true }).fill('2468');
    await page.getByRole('button', { name: 'Create PIN', exact: true }).click();
    const heading = page.getByRole('heading', { name: 'Speech recognition', exact: true });
    const checks = [];
    for (const mode of ['local', 'online']) {
      if (mode === 'online') {
        await page.getByRole('tab', { name: 'Privacy', exact: true }).click();
        const protection = page.getByLabel('Require local speech processing and block cloud sentence requests');
        await protection.click();
        await expect(protection).not.toBeChecked();
        await page.getByRole('radio', { name: /^Google \/ browser online/ }).check();
        await page.getByRole('tab', { name: 'General', exact: true }).click();
      }
      await heading.evaluate((element) => element.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: `${output}/speech-recognition-${mode}-${viewport.width}.png` });
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const serious = audit.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(serious).toEqual([]);
      expect(overflow).toBe(false);
      checks.push({ mode, serious, overflow });
    }
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    expect(await page.evaluate(() => window.__recognitionStarts)).toBe(0);
    results.push({ viewport, checks, errors, externalRequests: external.length, recognitionStarts: 0 });
    await context.close();
  }
  await writeFile(`${output}/speech-recognition-visual.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
