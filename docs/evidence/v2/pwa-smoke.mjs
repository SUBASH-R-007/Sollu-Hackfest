import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const deadline = setTimeout(() => {
  console.error("Offline verification exceeded 45 seconds");
  void browser.close();
}, 45000);
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8792/");
  await page.locator(".home-grid").waitFor();
  console.log("Online Home loaded");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  console.log("Service worker ready");
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.locator(".home-grid").waitFor();
  const blocked = await page.evaluate(async () => {
    try {
      await fetch("/api/health", {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      return false;
    } catch {
      return true;
    }
  });
  if (!blocked) throw Error("Network not blocked");
  console.log(
    "PASS: compiled Home reloads from service worker with network blocked.",
  );
  await page.goto("http://127.0.0.1:8792/words");
  await page.locator(".personal-search").waitFor();
  await page.locator(".personal-search").fill("தண்ணீர்");
  await page.locator(".personal-grid button").first().click();
  await page.locator(".personal-sentence").waitFor();
  console.log(
    "PASS: previously unvisited vocabulary route opens offline and displays a controlled Tamil sentence.",
  );
  await page.goto("http://127.0.0.1:8792/");
  await page.locator(".type-tile").click();
  await page.locator("#fragment").fill("no water");
  await page.locator("form .primary").click();
  await page.locator(".candidate-card").waitFor();
  const gloss = await page.locator(".candidate-gloss").first().textContent();
  if (!/I (do not|don't) want water\./.test(gloss ?? ""))
    throw Error("Negation was not preserved: " + gloss);
  await page.locator(".none-button").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".candidate-list")?.getAttribute("aria-busy") ===
      "false",
  );
  if (await page.locator(".candidate-card").count())
    throw Error("Rejected refusal repeated offline");
  console.log(
    "PASS: offline Type preserves refusal, then excludes its rejected meaning.",
  );
  console.log(
    "No live speech, clinical efficacy, phone installation or native-language quality claimed.",
  );
} finally {
  clearTimeout(deadline);
  await browser.close();
}
