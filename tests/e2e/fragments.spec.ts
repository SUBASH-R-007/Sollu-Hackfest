import type { Page } from "@playwright/test";
import {
  assertTrustedPlayback,
  candidates,
  clickAndWaitForSpeech,
  expect,
  readAttempts,
  sentenceAt,
  spokenCalls,
  startTyped,
  openCaregiverSettings,
  test,
} from "./helpers";

async function chooseEnglishOutput(page: Page) {
  await page
    .getByRole("button", { name: "தமிழ் → English", exact: true })
    .click();
  await expect(page.locator(".candidate-list")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".candidate-sentence").first()).toHaveAttribute(
    "lang",
    "en",
  );
}

async function startNextTyped(page: Page, fragment: string) {
  await page.goto("/");
  // Reload correctly restores the unfinished draft. Explicitly discard it
  // through the patient control before starting the next independent example.
  await page
    .getByRole("button", { name: "Start a new message", exact: true })
    .click();
  await page.getByRole("button", { name: /^Type / }).click();
  await page.getByLabel(/Your words/).fill(fragment);
  await page.getByRole("button", { name: "Find my words" }).click();
  await expect(page).toHaveURL(/\/confirm$/);
  await expect(page.locator(".candidate-list")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

test("a fragmented English word has one transparent, silent proposal and preserves the original attempt", async ({
  page,
}) => {
  const raw = "w-w-water";
  await startTyped(page, raw);
  await chooseEnglishOutput(page);
  await expect(candidates(page)).toHaveCount(1);
  await expect(page.locator(".heard-row strong")).toHaveText(raw);
  await expect(page.locator(".candidate-reading")).toContainText(
    "w-w-water → water",
  );
  const sentence = await sentenceAt(page, 0);
  expect(sentence).toBe("I'd like some water.");
  const texts = await page.locator(".candidate-sentence").allTextContents();
  expect(new Set(texts).size).toBe(texts.length);
  expect(await spokenCalls(page)).toEqual([]);

  await clickAndWaitForSpeech(page, candidates(page).first());
  await expect
    .poll(
      async () =>
        (await readAttempts(page)).filter(
          (attempt) => attempt.outcome === "spoken",
        ).length,
    )
    .toBe(1);
  const attempt = (await readAttempts(page)).find(
    (row) => row.outcome === "spoken",
  )!;
  expect(attempt.fragmentRaw).toBe(raw);
  expect(attempt.chosenText).toBe(sentence);
  expect(attempt.chosenReading).toBe("w-w-water → water");
  expect((await spokenCalls(page)).map((call) => call.text)).toEqual([
    sentence,
  ]);
  await assertTrustedPlayback(page);
});

test("health/help wording stays local and unsupported qualifiers ask for clarification", async ({
  page,
}) => {
  const intentRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/intent")
      intentRequests.push(request.url());
  });
  await startTyped(page, "chest pain");
  await chooseEnglishOutput(page);
  await expect(page.locator(".heard-row .mode-badge")).toHaveText(
    "Prepared health/help wording",
  );
  await expect(candidates(page)).toHaveCount(1);
  await expect(
    page.getByText(
      "Health and help messages use prepared wording. Choose only what you mean.",
    ),
  ).toBeVisible();
  expect(await spokenCalls(page)).toEqual([]);
  for (const raw of [
    "no chest pain",
    "chest pain yesterday",
    "take medicine 500 mg",
  ]) {
    await startNextTyped(page, raw);
    await expect(page.locator(".heard-row strong")).toHaveText(raw);
    await expect(candidates(page)).toHaveCount(0);
    expect(await spokenCalls(page)).toEqual([]);
  }
  expect(intentRequests).toEqual([]);
});

test("two-step suggested sentences explain and require the exact Say action", async ({
  page,
}) => {
  await openCaregiverSettings(page);
  await page.getByLabel("Confirm sentence selections before speaking").check();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Settings saved" }),
  ).toBeVisible();
  await startTyped(page, "water");
  await chooseEnglishOutput(page);
  await expect(
    page.getByText(
      "Choose a sentence, then tap Say to speak. Listen lets you hear a preview.",
    ),
  ).toBeVisible();
  const sentence = await sentenceAt(page, 0);
  await candidates(page).first().click();
  expect(await spokenCalls(page)).toEqual([]);
  await clickAndWaitForSpeech(
    page,
    page.getByRole("button", { name: `Say: ${sentence}`, exact: true }),
  );
  await assertTrustedPlayback(page);
  expect((await spokenCalls(page)).map((call) => call.text)).toEqual([
    sentence,
  ]);
});

test("ambiguous fragments ask for another word and a fragmented refusal never becomes a request", async ({
  page,
}) => {
  await startTyped(page, "water ven");
  await expect(candidates(page)).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({
      hasText: "Please add a word, choose a topic, or use My words.",
    }),
  ).toBeVisible();
  expect(await spokenCalls(page)).toEqual([]);

  await startNextTyped(page, "no w-w-water");
  await chooseEnglishOutput(page);
  await expect(candidates(page)).toHaveCount(1);
  await expect(page.locator(".candidate-sentence")).toHaveText(
    "I don't want water.",
  );
  await expect(page.locator(".heard-row strong")).toHaveText("no w-w-water");
  await expect(page.locator(".candidate-reading")).toContainText(
    "w-w-water → water",
  );
  expect(await spokenCalls(page)).toEqual([]);
});

test("Tanglish and Tamil word breaks use the existing Tamil meaning without speaking automatically", async ({
  page,
}) => {
  for (const [index, [raw, reading]] of [
    ["th-thanni", "th-thanni → thanni"],
    ["தண்-ணீர்", "தண்-ணீர் → தண்ணீர்"],
  ].entries()) {
    if (index === 0) await startTyped(page, raw);
    else await startNextTyped(page, raw);
    await expect(candidates(page)).toHaveCount(1);
    await expect(page.locator(".candidate-sentence")).toHaveText(
      "எனக்கு தண்ணி வேணும்.",
    );
    await expect(page.locator(".candidate-sentence")).toHaveAttribute(
      "lang",
      "ta",
    );
    await expect(page.locator(".heard-row strong")).toHaveText(raw);
    await expect(page.locator(".candidate-reading")).toContainText(reading);
    expect(await spokenCalls(page)).toEqual([]);
  }
});
