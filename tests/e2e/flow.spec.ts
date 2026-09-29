import { test, expect, spokenCalls, checkTargetSizes } from "./helpers";

// A deterministic on-device recognizer that "hears" a disfluent phrase once,
// then ends each later session silently (as browsers do after a pause).
async function fakeDictation(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    let starts = 0;
    class FakeRecognition {
      processLocally = false;
      lang = "";
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        starts += 1;
        const first = starts === 1;
        setTimeout(() => {
          this.onstart?.();
          if (first) {
            const result = Object.assign(
              [{ transcript: "um I I want w-w-water" }],
              { isFinal: true },
            );
            this.onresult?.({ results: [result] });
          }
        }, 20);
      }
      abort() {}
      stop() {}
    }
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: FakeRecognition,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: FakeRecognition,
    });
  });
}

test("voice flow tidies dictation without adding words and finds sentence choices silently", async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/transcribe")) uploads.push(request.url());
  });
  await fakeDictation(page);
  await page.goto("/flow");
  await expect(
    page.getByRole("heading", { name: "Speak freely. We tidy it up." }),
  ).toBeVisible();
  await checkTargetSizes(page);
  // High accuracy stays unavailable while cloud audio sharing is not allowed.
  await expect(
    page.getByRole("button", { name: /High accuracy \(OpenAI\)/ }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Start speaking", exact: true })
    .click();
  await expect(page.getByLabel("Your words")).toHaveValue("I want water");
  await expect(page.getByText(/Heard: um I I want w-w-water/)).toBeVisible();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  expect(await spokenCalls(page)).toEqual([]);
  await page
    .getByRole("button", { name: "Find what I mean", exact: true })
    .click();
  await expect(page).toHaveURL(/\/confirm$/);
  await expect(page.locator(".heard-row")).toContainText("I want water");
  await expect(page.locator(".candidate-sentence").first()).toBeVisible();
  expect(await spokenCalls(page)).toEqual([]);
  expect(uploads).toEqual([]);
});

test("voice flow speaks only the exact reviewed words on a tap", async ({
  page,
}) => {
  await page.goto("/flow");
  await page.getByLabel("Your words").fill("Please call my son");
  expect(await spokenCalls(page)).toEqual([]);
  await page
    .getByRole("button", { name: /Say exactly: Please call my son/ })
    .click();
  await expect.poll(async () => (await spokenCalls(page)).length).toBe(1);
  expect((await spokenCalls(page))[0].text).toBe("Please call my son");
});
