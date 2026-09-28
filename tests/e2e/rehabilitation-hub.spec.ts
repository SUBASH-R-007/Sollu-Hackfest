import type { Page } from "@playwright/test";
import type { PracticeRecord } from "../../apps/web/src/features/rehab/model";
import {
  expect,
  test,
  spokenCalls,
  checkTargetSizes,
  unlockCaregiver,
} from "./helpers";

// Monday noon in the app's browser timezone: week and rolling-day expectations
// are stable, including around midnight and on the CI host's calendar.
const FIXED_NOW = new Date("2026-09-28T12:00:00+05:30").getTime();

async function openHub(page: Page) {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto("/rehabilitation");
  await expect(
    page.getByRole("heading", { name: "My rehabilitation", exact: true }),
  ).toBeVisible();
}

async function practiceCounts(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu-rehab");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await Promise.all(
        ["practice", "media", "reviews"].map(
          (table) =>
            new Promise<number>((resolve, reject) => {
              const request = database
                .transaction(table)
                .objectStore(table)
                .count();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            }),
        ),
      );
    } finally {
      database.close();
    }
  });
}

async function seedProgress(page: Page) {
  const base: PracticeRecord = {
    id: "hub-reviewed",
    patientId: "local-patient",
    createdAt: FIXED_NOW - 60 * 60 * 1000,
    kind: "sentence",
    language: "en",
    communicationMethod: "mixed",
    target: "I need water",
    transcript: "I need",
    transcriptSource: "manual",
    transcriptReviewed: true,
    confirmedMissedWords: ["water"],
    responseSeconds: 9,
    recordingSeconds: null,
    fatigueBefore: null,
    fatigueAfter: null,
    effort: null,
    selfUnderstanding: "unknown",
    partnerUnderstanding: "unknown",
    aacCompleted: null,
    mediaIds: [],
    daypart: "morning",
    place: "home",
    notes: "Fictional browser test record",
  };
  const rows: PracticeRecord[] = [
    base,
    {
      ...base,
      id: "hub-missing-response",
      createdAt: FIXED_NOW - 24 * 60 * 60 * 1000,
      responseSeconds: null,
      transcript: "",
      transcriptSource: "none",
      transcriptReviewed: false,
      confirmedMissedWords: [],
    },
    {
      ...base,
      id: "hub-aac",
      createdAt: FIXED_NOW - 2 * 60 * 60 * 1000,
      communicationMethod: "aac",
      kind: "aac",
      aacCompleted: true,
      transcript: "",
      transcriptSource: "none",
      transcriptReviewed: false,
      confirmedMissedWords: [],
      responseSeconds: 15,
    },
    {
      ...base,
      id: "hub-older-tamil",
      createdAt: FIXED_NOW - 8 * 24 * 60 * 60 * 1000,
      language: "ta",
      communicationMethod: "natural_speech",
      target: "தண்ணீர்",
      transcript: "தண்ணீர்",
      confirmedMissedWords: [],
      responseSeconds: 30,
    },
    {
      ...base,
      id: "hub-future",
      createdAt: FIXED_NOW + 24 * 60 * 60 * 1000,
      responseSeconds: 100,
    },
  ];
  await page.evaluate(async (records) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu-rehab");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("practice", "readwrite");
        const table = transaction.objectStore("practice");
        records.forEach((record) => table.put(record));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  }, rows);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My rehabilitation", exact: true }),
  ).toBeVisible();
}

test("the Rehabilitation tab links practice and live progress without duplicating a saved attempt", async ({
  page,
}) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await page
    .getByRole("navigation", { name: "Mobile navigation", exact: true })
    .getByRole("button", { name: "Rehabilitation", exact: true })
    .click();
  await expect(page).toHaveURL(/\/rehabilitation$/);
  await expect(
    page.getByRole("heading", { name: "My rehabilitation", exact: true }),
  ).toBeVisible();
  await checkTargetSizes(page);
  await page
    .getByRole("navigation", { name: "Rehabilitation navigation", exact: true })
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await expect(page).toHaveURL(/\/practice$/);
  await page
    .getByRole("button", { name: "Start this practice", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save practice", exact: true })
    .click();
  await expect(
    page.getByText("Practice saved on this device.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Rehabilitation navigation", exact: true })
    .getByRole("button", { name: "My rehabilitation", exact: true })
    .click();
  await expect(
    page.getByText("1 / 3 saved practices", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Rehabilitation views", exact: true })
    .getByRole("link", { name: "Progress", exact: true })
    .click();
  await expect(page).toHaveURL(/\/rehabilitation\?tab=progress$/);
  expect(await practiceCounts(page)).toEqual([1, 0, 0]);
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Progress period", exact: true }),
  ).toHaveValue("7");
  expect(await practiceCounts(page)).toEqual([1, 0, 0]);
  expect(await spokenCalls(page)).toEqual([]);
  expect(
    await page.evaluate(() => window.__solluSpeech.recognitionStarts),
  ).toBe(0);
});

test("leaving practice for rehabilitation releases an active synthetic recording without saving it", async ({
  page,
}) => {
  await openHub(page);
  await page
    .getByRole("navigation", { name: "Rehabilitation navigation", exact: true })
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    canvas.getContext("2d")!.fillRect(0, 0, 160, 120);
    const stream = canvas.captureStream(1);
    Reflect.set(window, "__hubRecordingTrack", stream.getVideoTracks()[0]);
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => stream,
    });
  });
  await page
    .getByRole("button", { name: "Start this practice", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: /I agree to record this practice/ })
    .check();
  await page.getByRole("button", { name: "Record video", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Finish recording", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Rehabilitation navigation", exact: true })
    .getByRole("button", { name: "My rehabilitation", exact: true })
    .click();
  await expect(page).toHaveURL(/\/rehabilitation$/);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (Reflect.get(window, "__hubRecordingTrack") as MediaStreamTrack)
            .readyState,
      ),
    )
    .toBe("ended");
  expect(await practiceCounts(page)).toEqual([0, 0, 0]);
  expect(await spokenCalls(page)).toEqual([]);
});

test("progress filters keep language, method and missing response measurements separate", async ({
  page,
}) => {
  await openHub(page);
  await seedProgress(page);
  await page
    .getByRole("navigation", { name: "Rehabilitation views", exact: true })
    .getByRole("link", { name: "Progress", exact: true })
    .click();
  const measurements = page.getByRole("group", {
    name: "Practice measurements",
    exact: true,
  });
  const saved = measurements.locator(".hub-metric").filter({
    has: page.getByRole("heading", { name: "Saved practices", exact: true }),
  });
  const response = measurements.locator(".hub-metric").filter({
    has: page.getByRole("heading", { name: "Response time", exact: true }),
  });
  await expect(saved.locator("strong")).toHaveText("3");
  await page
    .getByRole("combobox", { name: "Progress period", exact: true })
    .selectOption("28");
  await expect(saved.locator("strong")).toHaveText("4");
  await page
    .getByRole("combobox", { name: "Progress language", exact: true })
    .selectOption("en");
  await expect(saved.locator("strong")).toHaveText("3");
  await page
    .getByRole("combobox", { name: "Progress method", exact: true })
    .selectOption("mixed");
  await expect(saved.locator("strong")).toHaveText("2");
  await expect(response.locator("strong")).toHaveText("9.0 s");
  await expect(response).toContainText("1 recorded");
  // A method/language combination with no records must remain unmeasured.
  await page
    .getByRole("combobox", { name: "Progress language", exact: true })
    .selectOption("ta");
  await expect(saved.locator("strong")).toHaveText("0");
  await expect(response.locator("strong")).toHaveText("Not recorded");
  await expect(response).toContainText("0 recorded");
  await page
    .getByRole("combobox", { name: "Progress language", exact: true })
    .selectOption("en");
  await page.getByRole("link", { name: "Practise water", exact: true }).click();
  await expect(page).toHaveURL(/\/practice$/);
  await expect(
    page.getByRole("textbox", { name: "My practice words", exact: true }),
  ).toHaveValue("water");
  await expect(
    page.getByRole("button", { name: "Start this practice", exact: true }),
  ).toBeVisible();
  expect(await practiceCounts(page)).toEqual([5, 0, 0]);
  expect(await spokenCalls(page)).toEqual([]);
  expect(
    await page.evaluate(() => window.__solluSpeech.recognitionStarts),
  ).toBe(0);
});

test("weekly progress refreshes after the device returns in a new calendar week", async ({
  page,
}) => {
  await openHub(page);
  await seedProgress(page);
  await expect(
    page.getByText("2 / 3 saved practices", { exact: true }),
  ).toBeVisible();
  await page.clock.setFixedTime(FIXED_NOW + 7 * 24 * 60 * 60 * 1000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByText("0 / 3 saved practices", { exact: true }),
  ).toBeVisible();
  expect(await practiceCounts(page)).toEqual([5, 0, 0]);
  expect(await spokenCalls(page)).toEqual([]);
});

test("the clinician tab requires the local caregiver lock before showing records", async ({
  page,
}) => {
  await openHub(page);
  await seedProgress(page);
  await page
    .getByRole("navigation", { name: "Mobile navigation", exact: true })
    .getByRole("button", { name: "Clinician", exact: true })
    .click();
  await expect(page).toHaveURL(/\/clinician$/);
  await expect(page.getByLabel("Caregiver PIN", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Clinician dashboard", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Communication Progress Report",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.locator(".rehab-session")).toHaveCount(0);
  await page.getByLabel("Caregiver PIN", { exact: true }).fill("2468");
  await page.getByRole("button", { name: "Create PIN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Clinician dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Clinical review workspace",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .locator(".stat-card")
      .filter({ has: page.getByText("Practice records", { exact: true }) })
      .locator("strong"),
  ).toHaveText("3");
  await expect(
    page
      .locator(".stat-card")
      .filter({
        has: page.getByText("Awaiting reviewer entry", { exact: true }),
      })
      .locator("strong"),
  ).toHaveText("3");
  const queue = page.getByRole("region", { name: "Review queue", exact: true });
  await expect(queue.locator(".clinician-queue > li")).toHaveCount(3);
  await queue
    .getByRole("combobox", { name: "Show records", exact: true })
    .selectOption("evidence");
  await expect(
    queue.getByText(
      "No records match this review filter in the selected period.",
      { exact: true },
    ),
  ).toBeVisible();
  await queue
    .getByRole("combobox", { name: "Show records", exact: true })
    .selectOption("all");
  await queue
    .getByRole("button", { name: "Review record: I need water", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/clinician\?view=rehab$/);
  await expect(
    page.getByRole("heading", {
      name: "Communication Progress Report",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".rehab-session[open]")).toHaveCount(1);
  await expect(page.locator(".rehab-session[open]")).toBeFocused();
  await page
    .getByLabel("Dashboard views", { exact: true })
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  await expect(page).toHaveURL(/\/clinician\?view=overview$/);
  await page
    .getByRole("button", { name: "Review individual plan", exact: true })
    .click();
  await expect(page.locator(".rehab-profile-editor")).toHaveAttribute(
    "open",
    "",
  );
  await expect(
    page.getByLabel("Preferred name (stays local)", { exact: true }),
  ).toBeVisible();
  expect(await practiceCounts(page)).toEqual([5, 0, 0]);
  expect(await spokenCalls(page)).toEqual([]);
  expect(
    await page.evaluate(() => window.__solluSpeech.recognitionStarts),
  ).toBe(0);
});

test("a sentence practised with AAC counts participation without creating speech accuracy scores", async ({
  page,
}) => {
  await openHub(page);
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu-rehab");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("profiles", "readwrite");
        transaction.objectStore("profiles").put({
          id: "local-patient",
          displayName: "Fictional AAC example",
          condition: "other",
          language: "en",
          communicationMethod: "aac",
          goals: [],
          clinicianInstructions: "",
          weeklyTarget: 3,
          practiceMinutes: 3,
          fatigueLimit: 5,
          updatedAt: Date.now(),
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  });
  await page.goto("/practice");
  await expect(
    page.getByRole("combobox", { name: "Practice message", exact: true }),
  ).toHaveValue("sentence-time");
  await page
    .getByRole("button", { name: "Start this practice", exact: true })
    .click();
  await page
    .getByLabel("Words actually heard (optional)", { exact: true })
    .fill("Please me time");
  await page
    .getByRole("checkbox", {
      name: "A person checked that this transcript reflects what was said",
      exact: true,
    })
    .check();
  await expect(page.locator(".rehab-score > strong")).toHaveText(
    "Not scored · communication aid",
  );
  await expect(
    page.getByRole("checkbox", { name: "give", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "I practised using my communication aid",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Save practice", exact: true })
    .click();
  await page
    .getByRole("button", { name: "See my updated progress", exact: true })
    .click();
  await expect(page).toHaveURL(/\/rehabilitation\?tab=progress$/);
  const words = page.getByRole("region", {
    name: "Words to revisit",
    exact: true,
  });
  await expect(words).toContainText("0 reviewed comparisons");
  await expect(words).toContainText("1 AAC");
  await expect(words).toContainText("0 / 0 target words matched");
  await expect(words.locator(".hub-word-rate > strong")).toHaveText(
    "Not measured",
  );
  await expect(words.getByRole("link", { name: /^Practise / })).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Rehabilitation navigation", exact: true })
    .getByRole("button", { name: "Clinician dashboard", exact: true })
    .click();
  await unlockCaregiver(page);
  await expect(
    page
      .locator(".stat-card")
      .filter({ has: page.getByText("Practice records", { exact: true }) })
      .locator("strong"),
  ).toHaveText("1");
  await expect(
    page
      .locator(".stat-card")
      .filter({ has: page.getByText("Reviewed transcripts", { exact: true }) })
      .locator("strong"),
  ).toHaveText("0 / 0");
  expect(await practiceCounts(page)).toEqual([1, 0, 0]);
  expect(await spokenCalls(page)).toEqual([]);
  expect(
    await page.evaluate(() => window.__solluSpeech.recognitionStarts),
  ).toBe(0);
});
