import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('.', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
const results = [];
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
    const page = await context.newPage();
    const errors = [], external = [], speech = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', (request) => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== 'localhost') external.push(request.url());
    });
    await page.addInitScript(() => {
      window.__privacySpeech = 0;
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [], cancel() {}, speak() { window.__privacySpeech++; }, addEventListener() {}, removeEventListener() {},
      } });
    });
    const device = viewport.width < 600 ? 'mobile' : 'desktop';
    await page.goto('http://localhost:5173/practice');
    await page.getByRole('button', { name: 'Start this practice', exact: true }).click();
    await page.getByLabel('Words actually heard (optional)', { exact: true }).fill('Please me time');
    await page.getByLabel('A person checked that this transcript reflects what was said', { exact: true }).check();
    await page.getByRole('button', { name: 'Save practice', exact: true }).click();
    await expect(page.getByText('Practice saved on this device.', { exact: false })).toBeVisible();
    await page.goto('http://localhost:5173/therapist');
    await page.getByLabel('Caregiver PIN', { exact: true }).fill('2468');
    await page.getByRole('button', { name: 'Create PIN', exact: true }).click();
    await page.getByRole('heading', { name: 'Word accuracy & transcript differences', exact: true }).evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${output}/word-accuracy-${device}.png` });
    await expect(page.getByRole('region', { name: 'Reviewed word accuracy measurements' })).toContainText('give');
    const views = [];
    async function checkView(name) {
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const violations = audit.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => ({ id: v.id, targets: v.nodes.map((node) => node.target) }));
      const width = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      views.push({ name, violations, ...width });
      expect(violations).toEqual([]);
      expect(width.document).toBeLessThanOrEqual(width.viewport);
    }
    await checkView('word accuracy and reports');
    await page.getByRole('region', { name: 'Reviewed word accuracy measurements' }).evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${output}/word-table-${device}.png` });
    await page.getByRole('heading', { name: /Encrypted report —/ }).evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${output}/encrypted-report-${device}.png` });
    await page.goto('http://localhost:5173/settings?tab=privacy');
    await page.getByLabel('Caregiver PIN', { exact: true }).fill('2468');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    await expect(page.getByText('Blocked by server policy, including OpenAI.', { exact: false })).toBeVisible();
    await page.getByRole('heading', { name: 'Local-only privacy protection', exact: true }).evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${output}/privacy-controls-${device}.png` });
    await checkView('privacy controls');
    speech.push(await page.evaluate(() => window.__privacySpeech));
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    expect(speech.every((count) => count === 0)).toBe(true);
    results.push({ viewport, views, errors, externalRequests: external.length, speech });
    await context.close();
  }
  await writeFile(`${output}/privacy-visual-checks.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
