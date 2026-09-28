import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('.', import.meta.url));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
const results = [];
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
    const page = await context.newPage();
    const errors = [], external = [], views = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (entry) => { if (entry.type() === 'error') errors.push(entry.text()); });
    page.on('request', (request) => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== 'localhost') external.push(request.url());
    });
    await page.addInitScript(() => {
      window.__jurySpeech = 0;
      window.__juryRecognition = 0;
      class Recognition { processLocally = false; start() { window.__juryRecognition++; } abort() {} stop() {} }
      Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: Recognition });
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [], cancel() {}, speak() { window.__jurySpeech++; }, addEventListener() {}, removeEventListener() {},
      } });
    });
    async function unlock() {
      await page.getByLabel('Caregiver PIN', { exact: true }).fill('2468');
      const create = page.getByRole('button', { name: 'Create PIN', exact: true });
      await (await create.isVisible() ? create : page.getByRole('button', { name: 'Unlock', exact: true })).click();
    }
    async function checkView(name, heading) {
      if (heading) await page.getByRole('heading', { name: heading, exact: true }).evaluate((element) => element.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: `${output}/${name}-${viewport.width}.png` });
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const serious = audit.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(serious).toEqual([]);
      expect(overflow).toBe(false);
      expect(await page.evaluate(() => window.__jurySpeech)).toBe(0);
      expect(await page.evaluate(() => window.__juryRecognition)).toBe(0);
      views.push({ name, serious, overflow, speech: 0, recognition: 0 });
    }
    await page.goto('http://localhost:5173/settings');
    await unlock();
    // Fresh profiles start in Tamil; use the patient language control for English UI.
    await page.locator('.language-switch').click();
    await checkView('supported-selection', 'Choosing messages together');
    await page.getByRole('tab', { name: 'Privacy', exact: true }).click();
    await expect(page.getByText('Automatic history expiry is not implemented', { exact: false })).toBeVisible();
    await checkView('privacy', 'Local-only privacy protection');

    await page.goto('http://localhost:5173/practice');
    await page.getByRole('button', { name: 'Start this practice', exact: true }).click();
    await page.getByLabel('Words actually heard (optional)', { exact: true }).fill('Please me time');
    await page.getByLabel('A person checked that this transcript reflects what was said', { exact: true }).check();
    await page.getByRole('button', { name: 'Save practice', exact: true }).click();
    await expect(page.getByText('Practice saved on this device.', { exact: false })).toBeVisible();
    await page.goto('http://localhost:5173/therapist');
    await unlock();
    await expect(page.getByLabel('Report purpose and limitations')).toContainText('not clinically validated endpoints');
    await checkView('communication-report', 'Communication Progress Report');

    await page.goto('http://localhost:5173/');
    await expect(page.getByText('Local-only speech protection is on.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: /^Type / }).click();
    await page.getByLabel(/Your words/).fill('chest pain');
    await page.getByRole('button', { name: 'Find my words' }).click();
    await expect(page.locator('.candidate-list')).toHaveAttribute('aria-busy', 'false');
    const englishOutput = page.getByRole('button', { name: 'தமிழ் → English', exact: true });
    if (await englishOutput.isVisible()) await englishOutput.click();
    await expect(page.locator('.candidate-sentence')).toHaveAttribute('lang', 'en');
    await checkView('prepared-help', 'Is this what you mean?');

    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    results.push({ viewport, views, errors, externalRequests: external.length });
    await context.close();
  }
  await writeFile(`${output}/jury-visual.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
