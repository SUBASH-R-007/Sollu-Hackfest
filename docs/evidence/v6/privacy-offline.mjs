import { chromium, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8792/");
  await page.locator(".home-grid").waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.goto("http://127.0.0.1:8792/practice");
  await page
    .getByRole("button", { name: "Start this practice", exact: true })
    .click();
  await page
    .getByLabel("Words actually heard (optional)", { exact: true })
    .fill("Please give me time");
  await page
    .getByRole("checkbox", {
      name: "A person checked that this transcript reflects what was said",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Save practice", exact: true })
    .click();
  await expect(
    page.getByText("Practice saved on this device.", { exact: false }),
  ).toBeVisible();
  await page.goto("http://127.0.0.1:8792/therapist");
  await page.getByLabel("Caregiver PIN", { exact: true }).fill("2468");
  await page.getByRole("button", { name: "Create PIN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Rehabilitation review", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".rehab-stat")
      .filter({ hasText: "Practice records" })
      .locator("strong"),
  ).toHaveText("1");
  await expect(page.locator('section[aria-labelledby="rehab-word-accuracy-title"]')).toContainText("4 matched / 4 target-word occurrences");
  await page.getByLabel("The person agrees to download this report for their chosen recipient.", { exact: true }).check();
  await page.getByLabel("Report passphrase", { exact: true }).fill("fictional offline verification passphrase");
  await page.getByLabel("Repeat report passphrase", { exact: true }).fill("fictional offline verification passphrase");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download encrypted report", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("sollu-encrypted-report.json");
  const envelope = await readFile(await download.path(), "utf8");
  expect(JSON.parse(envelope).format).toBe("sollu-encrypted-rehabilitation-report");
  expect(envelope).not.toContain("participant-001");
  await page.reload();
  await page.getByLabel("Caregiver PIN", { exact: true }).fill("2468");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(
    page
      .locator(".rehab-stat")
      .filter({ hasText: "Practice records" })
      .locator("strong"),
  ).toHaveText("1");
  console.log(
    "PASS: compiled previously unvisited practice and therapist routes open offline; reviewed practice saves, word metrics compute, encrypted report downloads offline and the practice survives reload. No live audio or model used.",
  );
  await context.close();
} finally {
  await browser.close();
}
