import type { Page } from "@playwright/test";
import {
  test,
  expect,
  spokenCalls,
  assertTrustedPlayback,
  checkTargetSizes,
  clickAndWaitForSpeech,
} from "./helpers";

interface StoredPractice {
  target: string;
  kind: string;
  language: string;
  transcript: string;
  transcriptSource: string;
  transcriptReviewed: boolean;
  confirmedMissedWords: string[];
  aacCompleted: boolean | null;
  responseSeconds: number | null;
  mediaIds: string[];
  notes: string;
}

async function readPractice(page: Page): Promise<StoredPractice[]> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu-rehab");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      if (!database.objectStoreNames.contains("practice")) return [];
      const rows = database
        .transaction("practice", "readonly")
        .objectStore("practice")
        .getAll();
      return await new Promise<StoredPractice[]>((resolve, reject) => {
        rows.onsuccess = () =>
          resolve(
            (rows.result as (StoredPractice & { createdAt: number })[]).sort(
              (a, b) => a.createdAt - b.createdAt,
            ),
          );
        rows.onerror = () => reject(rows.error);
      });
    } finally {
      database.close();
    }
  });
}

async function readProgress(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const row = database
        .transaction("kv", "readonly")
        .objectStore("kv")
        .get("companion-progress:v1");
      return await new Promise<{
        value?: {
          dailyGoal: number;
          days: Record<string, { steps: number; rest: boolean }>;
          items: Record<string, { box: number; due: string }>;
          lessons: Record<string, number>;
        };
      }>((resolve, reject) => {
        row.onsuccess = () => resolve(row.result ?? {});
        row.onerror = () => reject(row.error);
      });
    } finally {
      database.close();
    }
  });
}

/** Companion controls only, at a narrow phone width, with no sideways scroll. */
async function checkCompanionLayout(page: Page) {
  const problems = await page
    .locator(".companion-page [data-tap]")
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const box = element.getBoundingClientRect();
        if (!box.width || !box.height) return [];
        const minHeight = element.matches(
          ".companion-continue, .companion-review, .companion-unit",
        )
          ? 120
          : 72;
        return box.width < 72 || box.height < minHeight
          ? [`${element.textContent?.trim()} ${box.width}x${box.height}`]
          : [];
      }),
    );
  expect(problems, "Companion controls must meet the specified size").toEqual(
    [],
  );
  const overflow = await page
    .locator(".companion-page")
    .evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

const stepHeading = (page: Page, name: string) =>
  page.getByRole("heading", { name, exact: true });

test("a companion lesson plays only after a tap and saves practice on the device", async ({
  page,
}) => {
  const inference: string[] = [];
  page.on("request", (request) => {
    if (/api\/(intent|tts)/.test(request.url())) inference.push(request.url());
  });
  await page.goto("/companion");
  await expect(
    page.getByRole("heading", { name: "Speech companion", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("0 of 5 today", { exact: true })).toBeVisible();
  await expect(page.getByText("Suggested next", { exact: true })).toBeVisible();
  await checkTargetSizes(page);
  expect(await spokenCalls(page)).toEqual([]);

  // Continue starts the suggested unit (Basics) when nothing is due.
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(stepHeading(page, "Listen and repeat")).toBeVisible();
  await expect(page.getByText("Step 1 of 5", { exact: true })).toBeVisible();
  // Exact names: the app's communication dock has its own "■ Stop".
  await expect(
    page.getByRole("button", { name: "Stop", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Rest", exact: true }),
  ).toBeVisible();
  await checkTargetSizes(page);
  // Nothing plays until the person taps Listen.
  await page.waitForTimeout(600);
  expect(await spokenCalls(page)).toEqual([]);

  // a. Listen & repeat: one exact-phrase preview after a trusted tap.
  await clickAndWaitForSpeech(
    page,
    page.getByRole("button", { name: "Listen: Yes", exact: true }),
  );
  const calls = await spokenCalls(page);
  expect(calls).toHaveLength(1);
  expect(calls[0].text).toBe("Yes");
  await assertTrustedPlayback(page);
  await page.getByRole("button", { name: "Said it", exact: true }).click();

  // b. Choose the phrase: kind feedback, then Next (no auto-advance).
  await expect(stepHeading(page, "Choose the phrase")).toBeVisible();
  await checkTargetSizes(page);
  await page
    .getByRole("group", { name: "Choose the phrase" })
    .getByRole("button", { name: "Yes", exact: true })
    .click();
  await expect(
    page.getByText("Yes, that's it.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // a. again, this time "Not yet" — it simply comes back for review.
  await expect(stepHeading(page, "Listen and repeat")).toBeVisible();
  await expect(page.getByText("Step 3 of 5", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Not yet", exact: true }).click();

  // c. Build the sentence from shuffled tiles; a placed tile can be removed.
  await expect(stepHeading(page, "Build the sentence")).toBeVisible();
  await checkTargetSizes(page);
  const tiles = page.getByRole("group", { name: "Word tiles" });
  await tiles.getByRole("button", { name: "moment", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove: moment", exact: true })
    .click();
  for (const word of ["Wait", "a", "moment", "please"])
    await tiles.getByRole("button", { name: word, exact: true }).click();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(
    page.getByText("Well done — that's the sentence.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // d. Say it your way: speaking, typing or pointing all count.
  await expect(stepHeading(page, "Say it your way")).toBeVisible();
  await page.getByRole("button", { name: "Pointed", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pointed", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "I did it", exact: true }).click();

  // Calm summary, no sound.
  await expect(stepHeading(page, "Lesson finished")).toBeVisible();
  await expect(
    page.getByText("Phrases practised: 3", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("No", { exact: true })).toBeVisible();
  await checkTargetSizes(page);
  expect(await spokenCalls(page)).toHaveLength(1);

  const rows = await readPractice(page);
  expect(rows).toHaveLength(3);
  expect(rows[0]).toMatchObject({
    target: "Yes",
    kind: "word",
    language: "en",
    transcript: "Yes",
    transcriptSource: "manual",
    transcriptReviewed: true,
    confirmedMissedWords: [],
    responseSeconds: null,
    mediaIds: [],
    notes: "Speech companion: Basics",
  });
  expect(rows[1]).toMatchObject({
    target: "No",
    transcript: "",
    transcriptSource: "none",
    confirmedMissedWords: ["no"],
  });
  expect(rows[2]).toMatchObject({
    target: "Wait a moment, please",
    kind: "aac",
    aacCompleted: true,
  });

  const progress = (await readProgress(page)).value;
  expect(progress?.lessons).toEqual({ "basics:en": 1 });
  expect(progress?.items["en:quick.no"]?.box).toBe(1);
  expect(progress?.items["en:quick.yes"]?.box).toBe(2);
  expect(Object.values(progress?.days ?? {})).toEqual([
    { steps: 5, rest: false },
  ]);

  await page.getByRole("button", { name: "Back to companion" }).click();
  await expect(
    page.getByText("Goal reached. Well done.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/1 day in a row — rest days are fine/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Goal reached. Well done.", { exact: true }),
  ).toBeVisible();
  expect(inference).toEqual([]);
});

test("goals, rest days and Stop are one tap and never play sound", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/companion");
  await expect(
    page.getByRole("heading", { name: "Speech companion", exact: true }),
  ).toBeVisible();
  await checkCompanionLayout(page);

  await page.getByRole("button", { name: "Set daily goal: 3" }).click();
  await expect(
    page.getByRole("button", { name: "Set daily goal: 3" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("0 of 3 today", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Rest today" }).click();
  await expect(
    page.getByText("Rest day saved. Resting helps too.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/1 day in a row — rest days are fine/),
  ).toBeVisible();

  // The companion's content language switches without changing the app language.
  await page.getByRole("button", { name: "தமிழ்", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "தமிழ்", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(stepHeading(page, "Listen and repeat")).toBeVisible();
  await expect(page.getByText("ஆமா", { exact: true })).toBeVisible();
  await checkCompanionLayout(page);

  await page.getByRole("button", { name: "Rest", exact: true }).click();
  await expect(stepHeading(page, "Resting")).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(stepHeading(page, "Listen and repeat")).toBeVisible();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Speech companion", exact: true }),
  ).toBeVisible();

  const progress = (await readProgress(page)).value;
  expect(progress?.dailyGoal).toBe(3);
  expect(Object.values(progress?.days ?? {})).toEqual([
    { steps: 0, rest: true },
  ]);
  expect(await readPractice(page)).toEqual([]);
  expect(await spokenCalls(page)).toEqual([]);
});
