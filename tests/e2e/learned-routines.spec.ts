import type { Page } from "@playwright/test";
import { getVocabularyCandidate, type Attempt } from "../../packages/shared/src/index";
import type { Settings } from "../../apps/web/src/db";
import type { PracticeRecord } from "../../apps/web/src/features/rehab/model";
import {
  test,
  expect,
  openCaregiverSettings,
  unlockCaregiver,
  spokenCalls,
} from "./helpers";

async function deviceSettings(page: Page): Promise<Settings> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Settings>((resolve, reject) => {
        const request = database
          .transaction("kv")
          .objectStore("kv")
          .get("settings");
        request.onsuccess = () => resolve(request.result.value);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
}

// Relative dates are constructed in the browser's local zone, matching the app's
// saved daypart and date rules without relying on the machine running Playwright.
async function seedRoutineEvidence(
  page: Page,
  kind: "practice" | "communication",
) {
  const candidate = getVocabularyCandidate("daily.coffee", "en")!;
  return page.evaluate(
    async ({ mode, coffee }) => {
      const dates = [5, 4, 3].map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(8, 10, 0, 0);
        return date.getTime();
      });
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(
          mode === "practice" ? "sollu-rehab" : "sollu",
        );
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const table = mode === "practice" ? "practice" : "attempts";
          const transaction = database.transaction(table, "readwrite");
          const store = transaction.objectStore(table);
          for (const [index, at] of dates.entries()) {
            if (mode === "practice") {
              const record: PracticeRecord = {
                id: `routine-test-practice-${index}`,
                patientId: "local-patient",
                createdAt: at,
                kind: "sentence",
                language: "en",
                communicationMethod: "natural_speech",
                target: coffee.text,
                transcript: coffee.text,
                transcriptSource: "manual",
                transcriptReviewed: true,
                confirmedMissedWords: [],
                responseSeconds: 2,
                recordingSeconds: null,
                fatigueBefore: 0,
                fatigueAfter: 0,
                effort: 1,
                selfUnderstanding: "yes",
                partnerUnderstanding: "yes",
                aacCompleted: null,
                mediaIds: [],
                daypart: "morning",
                place: "home",
                notes:
                  "Fictional practice fixture; never everyday routine evidence.",
              };
              store.put(record);
            } else {
              const attempt: Attempt = {
                id: `routine-test-communication-${index}`,
                startedAt: at,
                endedAt: at + 10000,
                outcome: "spoken",
                modality: "text",
                fragmentRaw: "coffee",
                sttRetries: 0,
                outputLang: "en",
                place: "home",
                timeBucket: "morning",
                demoClock: false,
                rounds: [
                  {
                    round: 1,
                    source: "local",
                    latencyMs: 0,
                    candidates: [coffee],
                    chosenIndex: 0,
                    noneOfThese: false,
                    usualShown: false,
                    usualChosen: false,
                  },
                ],
                chosenText: coffee.text,
                chosenIntent: coffee.intent,
                taps: 3,
                offline: false,
                demoCached: false,
                communicationOutcome: "understood",
              };
              store.put(attempt);
              // Demo repeats must not inflate the displayed evidence count.
              store.put({
                ...attempt,
                id: `routine-test-demo-${index}`,
                demoClock: true,
              });
            }
          }
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }
      return dates.map((at) => {
        const date = new Date(at);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      });
    },
    { mode: kind, coffee: candidate },
  );
}

test("local routine learning requires real communication evidence and fresh review without changing sharing", async ({
  page,
}) => {
  const inference: string[] = [];
  const engineChanges: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/(intent|tts|llm\/test)(?:[/?]|$)/u.test(request.url()))
      inference.push(request.url());
    if (
      /\/api\/llm\/settings(?:[/?]|$)/u.test(request.url()) &&
      request.method() !== "GET"
    )
      engineChanges.push(request.url());
  });

  await page.goto("/practice");
  await expect(
    page.getByRole("heading", { name: "Communication practice", exact: true }),
  ).toBeVisible();
  await seedRoutineEvidence(page, "practice");
  expect(await spokenCalls(page)).toEqual([]);
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Context engine", exact: true }).click();
  const before = await deviceSettings(page);
  expect(before.sharePersonalContext).toBe(false);
  expect(before.shareRecentContext).toBe(false);
  const scan = page.getByRole("button", {
    name: "Review local communication patterns",
    exact: true,
  });
  const suggested = page.getByRole("list", {
    name: "Suggested routines from communication",
    exact: true,
  });
  await expect(suggested).toHaveCount(0);
  await scan.click();
  await expect(
    page.getByText(/Checked 0 local records\. No new eligible patterns/),
  ).toBeVisible();
  await expect(suggested).toHaveCount(0);
  expect((await deviceSettings(page)).routines).toEqual(before.routines);

  const dates = await seedRoutineEvidence(page, "communication");
  // Seeding history does not activate monitoring or save a routine by itself.
  await expect(suggested).toHaveCount(0);
  expect((await deviceSettings(page)).routines).toEqual(before.routines);
  // The same tap control intentionally filters repeats within 400 ms.
  await page.waitForTimeout(425);
  await scan.click();
  await expect(suggested).toContainText("3 understood choices across 3 dates");
  for (const date of dates) await expect(suggested).toContainText(date);
  await expect(suggested.getByRole("listitem")).toHaveCount(1);
  expect((await deviceSettings(page)).routines).toEqual(before.routines);
  await page
    .getByRole("button", { name: "Review Coffee", exact: true })
    .click();
  const editor = page.getByRole("group", {
    name: "Review learned routine",
    exact: true,
  });
  const save = editor.getByRole("button", {
    name: "Save reviewed routine",
    exact: true,
  });
  const review = editor.getByRole("checkbox", {
    name: "We reviewed these details together and want this routine used as a context clue.",
    exact: true,
  });
  await expect(save).toBeDisabled();
  await review.check();
  await expect(save).toBeEnabled();
  await editor
    .getByLabel("Learned routine label", { exact: true })
    .fill("Coffee break");
  await expect(review).not.toBeChecked();
  await expect(save).toBeDisabled();
  await editor
    .getByLabel("Learned routine time", { exact: true })
    .fill("08:20");
  await editor
    .getByRole("combobox", { name: "Learned routine place", exact: true })
    .selectOption("outside");
  for (const day of [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ])
    await editor
      .getByRole("checkbox", { name: day, exact: true })
      .setChecked(day === "Monday" || day === "Thursday");
  await review.check();
  await save.click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Reviewed routine saved on this device" }),
  ).toBeVisible();
  const saved = await deviceSettings(page);
  expect(
    saved.routines.filter((routine) => routine.source === "learned"),
  ).toEqual([
    expect.objectContaining({
      label: "Coffee break",
      time: "08:20",
      place: "outside",
      days: [1, 4],
      topic: "drink",
      confirmed: true,
      isSample: false,
    }),
  ]);
  expect(saved.routines).toHaveLength(before.routines.length + 1);
  expect({ ...saved, routines: before.routines }).toEqual(before);
  expect(await spokenCalls(page)).toEqual([]);
  expect(inference).toEqual([]);
  expect(engineChanges).toEqual([]);

  await page.reload();
  await unlockCaregiver(page);
  const persisted = await deviceSettings(page);
  expect(persisted).toEqual(saved);
  await expect(
    page.getByLabel("Saved routines", { exact: true }),
  ).toContainText("Coffee break");
  await expect(
    page.getByLabel("Use personal context and communication preferences", {
      exact: true,
    }),
  ).not.toBeChecked();
  await page
    .getByRole("button", {
      name: "Review local communication patterns",
      exact: true,
    })
    .click();
  await expect(suggested).toHaveCount(0);
  await expect(page.getByText(/No new eligible patterns/)).toBeVisible();
  expect(await spokenCalls(page)).toEqual([]);
  expect(inference).toEqual([]);
  expect(engineChanges).toEqual([]);
});
