import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, test, unlockCaregiver, spokenCalls } from "./helpers";

async function openDashboard(page: Page) {
  await page.goto("/therapist");
  await unlockCaregiver(page);
  await expect(
    page.getByRole("heading", {
      name: "Communication Progress Report",
      exact: true,
    }),
  ).toBeVisible();
}

async function seedPractice(page: Page) {
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu-rehab");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = Date.now();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("practice", "readwrite");
      transaction.objectStore("practice").put({
        id: "dashboard-fixture",
        patientId: "local-patient",
        createdAt: now,
        kind: "sentence",
        language: "en",
        communicationMethod: "mixed",
        target: "I need water",
        transcript: "I need",
        rawTranscript: "eye knead",
        transcriptSource: "browser",
        transcriptReviewed: true,
        confirmedMissedWords: ["water"],
        responseSeconds: 9,
        recordingSeconds: null,
        fatigueBefore: 2,
        fatigueAfter: 3,
        effort: 2,
        selfUnderstanding: "yes",
        partnerUnderstanding: "partly",
        aacCompleted: null,
        mediaIds: [],
        daypart: "afternoon",
        place: "home",
        notes: "Fictional browser test record",
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
    const main = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = main.transaction("attempts", "readwrite");
      const table = transaction.objectStore("attempts");
      for (const [id, communicationOutcome, demoClock] of [
        ["a", "understood", false],
        ["b", "needs_repair", false],
        ["c", "unconfirmed", false],
        ["d", "understood", true],
      ]) {
        table.put({
          id,
          startedAt: now,
          modality: "text",
          fragmentRaw: "water",
          outputLang: "en",
          place: "home",
          timeBucket: "afternoon",
          demoClock,
          rounds: [
            {
              round: 1,
              source: "mock",
              model: "mock",
              candidates: [],
              latencyMs: 0,
              noneOfThese: false,
              usualShown: false,
              usualChosen: false,
            },
          ],
          taps: 3,
          offline: true,
          demoCached: false,
          outcome: "spoken",
          communicationOutcome,
        });
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    main.close();
  });
  await page.reload();
  await unlockCaregiver(page);
  await expect(page.locator(".rehab-session")).toHaveCount(1);
}

test("therapist saves a condition-aware individual plan and retained personal targets", async ({
  page,
}) => {
  await openDashboard(page);
  await page.locator(".rehab-profile-editor > summary").click();
  await page
    .getByLabel("Preferred name (stays local)", { exact: true })
    .fill("Fictional Alex");
  await page
    .getByRole("combobox", { name: "Communication needs", exact: true })
    .selectOption("als");
  await page
    .getByRole("combobox", { name: "Usual communication method", exact: true })
    .selectOption("aac");
  await page
    .getByLabel("Participation goals — one per line", { exact: true })
    .fill("Join a family conversation");
  await page
    .getByLabel("Personal words or sentences — one per line, up to 20", {
      exact: true,
    })
    .fill("I would like to talk to my family.");
  await page
    .getByRole("button", { name: "Save practice plan", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Individual practice plan saved" }),
  ).toBeVisible();
  await page.reload();
  await unlockCaregiver(page);
  await page.locator(".rehab-profile-editor > summary").click();
  await expect(
    page.getByLabel("Preferred name (stays local)", { exact: true }),
  ).toHaveValue("Fictional Alex");
  await expect(
    page.getByRole("combobox", { name: "Communication needs", exact: true }),
  ).toHaveValue("als");
  await expect(
    page.getByRole("textbox", {
      name: "Personal words or sentences — one per line, up to 20",
      exact: true,
    }),
  ).toHaveValue("I would like to talk to my family.");
  await expect(page.locator(".rehab-profile-editor")).toContainText(
    "Conserve energy",
  );
  expect(await spokenCalls(page)).toEqual([]);
});

test("therapist metrics, reviewer observations, consented redacted export and isolated report import", async ({
  page,
}) => {
  await openDashboard(page);
  await seedPractice(page);
  const scope = page.getByLabel("Report purpose and limitations", {
    exact: true,
  });
  await expect(scope).toContainText(
    "not a diagnostic assessment or treatment recommendation",
  );
  await expect(scope).toContainText("not clinically validated endpoints");
  await page.emulateMedia({ media: "print" });
  await expect(scope).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page
    .getByLabel("Dashboard views")
    .getByRole("button", { name: "Communication log", exact: true })
    .click();
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Median seconds to audio start" })
      .locator("strong"),
  ).toHaveText("—");
  await expect(
    page.getByText(
      "Time measured for 0 of 4 speech-started attempts; 4 missing.",
      { exact: false },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Rehabilitation review", exact: true })
    .click();
  const communication = page.locator(
    'section[aria-labelledby="rehab-communication-title"]',
  );
  await expect(communication).toContainText(
    "1 understood / 2 assessed; 1 not assessed",
  );
  await expect(communication).toContainText(
    "1 demo-time or demo-cached attempts excluded",
  );
  await expect(page.locator(".rehab-word-list")).toContainText("water");
  await page.locator(".rehab-session > summary").click();
  await page.locator(".rehab-review-form > summary").click();
  await page
    .getByLabel("Reviewer name or initials", { exact: true })
    .fill("SLT test");
  await page
    .getByRole("combobox", {
      name: "Meaning understood during this practice",
      exact: true,
    })
    .selectOption("yes");
  await page
    .getByLabel("Observation, support used, and next review notes", {
      exact: true,
    })
    .fill("Fictional review: partner used a written cue.");
  await page
    .getByRole("button", { name: "Save reviewer observation", exact: true })
    .click();
  await expect(page.locator(".rehab-review-note")).toContainText("SLT test");
  await page
    .getByText("Unencrypted JSON / CSV export", { exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Download report JSON", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel(
      "The person agrees to download this report for their chosen recipient.",
      { exact: true },
    )
    .check();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download report JSON", exact: true })
    .click();
  const file = await downloadPromise;
  const parsed = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(parsed.scoringVersion).toBe("text-match-v1");
  expect(parsed.interpretation.title).toBe("Communication Progress Report");
  expect(parsed.interpretation.purpose).toContain(
    "not a diagnostic assessment or treatment recommendation",
  );
  expect(parsed.interpretation.validation).toContain(
    "not clinically validated endpoints",
  );
  expect(parsed.sessions[0].transcriptSource).toBe("browser");
  expect(parsed.sessions[0].textMatch).toBe(66.7);
  expect(parsed.sessions[0]).not.toHaveProperty("target");
  expect(parsed.sessions[0]).not.toHaveProperty("rawTranscript");
  expect(parsed.sessions[0].reviews[0]).not.toHaveProperty("reviewer");
  await page
    .getByLabel(
      "Include practice words, transcripts, goals, notes and reviewer names.",
      { exact: true },
    )
    .check();
  await expect(
    page.getByRole("button", { name: "Download report JSON", exact: true }),
  ).toBeDisabled();
  await page
    .getByText("Import a report for local review", { exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Report file protection", exact: true })
    .selectOption("plain");
  parsed.participant = "Imported patient code";
  await page
    .getByLabel("Choose Sollu report JSON (maximum 2 MB)", { exact: true })
    .setInputFiles({
      name: "report.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(parsed)),
    });
  await page
    .getByLabel("I have permission to keep this report on this device.", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Import read-only snapshot", exact: true })
    .click();
  await expect(page.locator(".rehab-report-profile")).toContainText(
    "Imported patient code",
  );
  await expect(page.locator(".rehab-report-profile")).toContainText(
    "Imported · unverified",
  );
  await expect(page.locator(".rehab-profile-editor")).toHaveCount(0);
  await page.locator(".rehab-session > summary").click();
  await expect(page.locator(".rehab-review-form")).toHaveCount(0);
  await expect(page.locator(".rehab-review-note")).toContainText(
    "Imported, unverified reviewer entry",
  );
  await page
    .getByRole("combobox", { name: "Patient / report snapshot", exact: true })
    .selectOption("local");
  await expect(page.locator(".rehab-session")).toHaveCount(1);
  await expect(page.locator(".rehab-report-profile")).not.toContainText(
    "Imported patient code",
  );
  const importedOption = await page
    .getByRole("combobox", { name: "Patient / report snapshot", exact: true })
    .locator("option")
    .filter({ hasText: "Imported patient code" })
    .getAttribute("value");
  await page
    .getByRole("combobox", { name: "Patient / report snapshot", exact: true })
    .selectOption(importedOption!);
  await page
    .getByRole("button", { name: "Remove imported snapshot", exact: true })
    .click();
  await page.waitForTimeout(425); // Deliberate confirmation passes the app's repeated-tap filter.
  await page
    .getByRole("button", { name: "Confirm remove snapshot", exact: true })
    .click();
  await expect(
    page
      .getByRole("combobox", { name: "Patient / report snapshot", exact: true })
      .locator("option"),
  ).toHaveCount(1);
  expect(await spokenCalls(page)).toEqual([]);
});

test("reviewed word denominators and encrypted report preview preserve privacy and import separation", async ({
  page,
}) => {
  await openDashboard(page);
  await seedPractice(page);
  const words = page.locator(
    'section[aria-labelledby="rehab-word-accuracy-title"]',
  );
  await expect(words).toContainText("2 matched / 3 target-word occurrences");
  await expect(words).toContainText(
    "1 omissions · 0 substitutions · 0 extra transcript words",
  );
  const wordRow = words
    .getByRole("region", {
      name: "Reviewed word accuracy measurements",
      exact: true,
    })
    .getByRole("row")
    .filter({ hasText: "water" });
  await expect(wordRow).toContainText("0 / 1");
  await expect(wordRow).toContainText("0.0%");
  await expect(
    words.getByRole("link", { name: "Practise water", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel(
      "Include practice words, transcripts, goals, notes and reviewer names.",
      { exact: true },
    )
    .check();
  await page
    .getByLabel(
      "The person agrees to download this report for their chosen recipient.",
      { exact: true },
    )
    .check();
  const passphrase = "fictional encrypted report passphrase";
  await page.getByLabel("Report passphrase", { exact: true }).fill(passphrase);
  await page
    .getByLabel("Repeat report passphrase", { exact: true })
    .fill(passphrase);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download encrypted report", exact: true })
    .click();
  const downloaded = await downloadPromise;
  expect(downloaded.suggestedFilename()).toBe("sollu-encrypted-report.json");
  const content = await readFile((await downloaded.path())!, "utf8");
  expect(content).not.toContain("I need water");
  expect(content).not.toContain("participant-001");
  expect(JSON.parse(content).format).toBe(
    "sollu-encrypted-rehabilitation-report",
  );
  await expect(
    page.getByLabel("Report passphrase", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Repeat report passphrase", { exact: true }),
  ).toHaveValue("");
  await page
    .getByText("Import a report for local review", { exact: true })
    .click();
  await page
    .getByLabel("Choose encrypted Sollu report JSON (maximum 3 MB)", {
      exact: true,
    })
    .setInputFiles({
      name: "report.json",
      mimeType: "application/json",
      buffer: Buffer.from(content),
    });
  await page
    .getByLabel("Passphrase to open report", { exact: true })
    .fill("incorrect fictional passphrase");
  await page
    .getByRole("button", { name: "Decrypt and preview report", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "The passphrase is incorrect" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Import read-only snapshot",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByLabel("Passphrase to open report", { exact: true })
    .fill(passphrase);
  await page.waitForTimeout(425); // A deliberate second action clears the repeated-tap guard.
  await page
    .getByRole("button", { name: "Decrypt and preview report", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Import read-only snapshot",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Passphrase to open report", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("I have permission to keep this report on this device.", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Import read-only snapshot", exact: true })
    .click();
  await expect(page.locator(".rehab-report-profile")).toContainText(
    "Imported · unverified",
  );
  await expect(words).toContainText("2 matched / 3 target-word occurrences");
  await expect(
    words.getByRole("link", { name: "Practise water", exact: true }),
  ).toHaveCount(0);
  expect(await spokenCalls(page)).toEqual([]);
});

test("a reviewed dashboard word preselects a manual word practice without recording or speech", async ({
  page,
}) => {
  await openDashboard(page);
  await seedPractice(page);
  await page.evaluate(() => {
    const state = window as unknown as { testMediaRequests: number };
    state.testMediaRequests = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => {
        state.testMediaRequests++;
        return Promise.reject(
          new Error("No device capture is allowed in this test."),
        );
      },
    });
  });
  await page.getByRole("link", { name: "Practise water", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:5173/practice");
  await expect(page.locator(".rehab-target")).toHaveText("water");
  await expect(
    page.getByRole("button", { name: "Start this practice", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("status").filter({ hasText: "A reviewed word is ready" }),
  ).toBeVisible();
  expect(await page.evaluate(() => history.state?.usr ?? null)).toBeNull();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { testMediaRequests: number }).testMediaRequests,
    ),
  ).toBe(0);
  expect(await spokenCalls(page)).toEqual([]);
  await page
    .getByRole("button", { name: "Start this practice", exact: true })
    .click();
  await page
    .getByLabel("Words actually heard (optional)", { exact: true })
    .fill("water");
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
  const records = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu-rehab");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<
      {
        id: string;
        target: string;
        kind: string;
        language: string;
        communicationMethod: string;
        mediaIds: string[];
      }[]
    >((resolve, reject) => {
      const request = database
        .transaction("practice")
        .objectStore("practice")
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return rows;
  });
  expect(records).toHaveLength(2);
  expect(
    records.find((record) => record.id !== "dashboard-fixture"),
  ).toMatchObject({
    target: "water",
    kind: "word",
    language: "en",
    communicationMethod: "mixed",
    mediaIds: [],
  });
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { testMediaRequests: number }).testMediaRequests,
    ),
  ).toBe(0);
  expect(await spokenCalls(page)).toEqual([]);
});

test("deleting a practice record removes its review evidence without touching other local records", async ({
  page,
}) => {
  await openDashboard(page);
  await seedPractice(page);
  await page.locator(".rehab-session > summary").click();
  await page.locator(".rehab-review-form > summary").click();
  await page
    .getByLabel("Reviewer name or initials", { exact: true })
    .fill("Reviewer");
  await page
    .getByRole("button", { name: "Save reviewer observation", exact: true })
    .click();
  await expect(page.locator(".rehab-review-note")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Delete this practice record", exact: true })
    .click();
  await page.waitForTimeout(425); // Fresh deliberate confirmation after the app's repeated-tap filter.
  await page
    .getByRole("button", {
      name: "Confirm delete record and evidence",
      exact: true,
    })
    .click();
  await expect(page.locator(".rehab-session")).toHaveCount(0);
  const counts = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("sollu-rehab");
      r.onsuccess = () => resolve(r.result);
    });
    const counts = await Promise.all(
      ["practice", "reviews", "media"].map(
        (table) =>
          new Promise<number>((resolve) => {
            const r = database.transaction(table).objectStore(table).count();
            r.onsuccess = () => resolve(r.result);
          }),
      ),
    );
    database.close();
    return counts;
  });
  expect(counts).toEqual([0, 0, 0]);
  await expect(
    page.locator('section[aria-labelledby="rehab-communication-title"]'),
  ).toContainText("1 understood / 2 assessed");
});
