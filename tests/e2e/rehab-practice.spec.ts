import { test, expect, spokenCalls, checkTargetSizes } from "./helpers";

test("root stays on patient Home with a saved caregiver role", async ({
  page,
}) => {
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open("sollu");
      req.onsuccess = () => resolve(req.result);
    });
    await new Promise<void>((resolve) => {
      const tx = database.transaction("kv", "readwrite");
      tx.objectStore("kv").put({ key: "role", value: "care" });
      tx.oncomplete = () => resolve();
    });
    database.close();
  });
  await page.goto("/");
  await expect(page.locator(".home-grid")).toBeVisible();
  await expect(page).toHaveURL("/");
  await page.reload();
  await expect(page.locator(".home-grid")).toBeVisible();
  await expect(page).toHaveURL("/");
  await page.goto("/care");
  await expect(page.locator(".care-shell")).toBeVisible();
  await expect(page).toHaveURL(/\/care$/);
  expect(await spokenCalls(page)).toEqual([]);
});

test("practice keeps missing scores unknown and only learns human-confirmed review words", async ({
  page,
  context,
}) => {
  const inference: string[] = [];
  page.on("request", (request) => {
    if (/api\/(intent|tts)/.test(request.url())) inference.push(request.url());
  });
  await page.goto("/practice");
  await expect(
    page.getByRole("heading", { name: "Communication practice", exact: true }),
  ).toBeVisible();
  await checkTargetSizes(page);
  // One tap on the message card starts the attempt (no dropdown or Start).
  await page.getByRole("button", { name: /Please give me time./ }).click();
  await expect(page.getByText("Not scored", { exact: true })).toBeVisible();
  await checkTargetSizes(page);
  // Tapping a word marks it as not said clearly; nothing is typed.
  await page.getByRole("button", { name: "give", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "give", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("75% text match", { exact: true })).toBeVisible();
  await page
    .getByRole("group", { name: "Did my partner understand?" })
    .getByRole("button", { name: "Yes", exact: true })
    .click();
  await page.getByText("More details (optional)", { exact: true }).click();
  await page
    .getByRole("button", { name: "Tiredness after practice: 7", exact: true })
    .click();
  await expect(
    page.getByText("Time to consider a rest.", { exact: false }),
  ).toBeVisible();
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Save practice", exact: true })
    .click();
  await expect(
    page.getByText("Practice saved on this device.", { exact: false }),
  ).toBeVisible();
  const rows = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open("sollu-rehab");
      req.onsuccess = () => resolve(req.result);
    });
    const records = await new Promise<
      {
        confirmedMissedWords: string[];
        partnerUnderstanding: string;
        transcriptSource: string;
        transcriptReviewed: boolean;
        fatigueAfter: number | null;
        mediaIds: string[];
      }[]
    >((resolve) => {
      const req = database
        .transaction("practice")
        .objectStore("practice")
        .getAll();
      req.onsuccess = () => resolve(req.result);
    });
    database.close();
    return records;
  });
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    confirmedMissedWords: ["give"],
    partnerUnderstanding: "yes",
    transcriptSource: "manual",
    transcriptReviewed: true,
    fatigueAfter: 7,
    mediaIds: [],
  });
  expect(inference).toEqual([]);
  expect(await spokenCalls(page)).toEqual([]);
  await context.setOffline(false);
  await page.reload();
  await expect(
    page.getByText(/Confirmed words for more practice: give/),
  ).toBeVisible();
});

test("typed transcripts stay provisional until a person confirms the review", async ({
  page,
}) => {
  await page.goto("/practice");
  await page.getByRole("button", { name: /Please give me time./ }).click();
  await page.getByText("Type what was heard instead", { exact: true }).click();
  await page
    .getByLabel("Words actually heard (optional)", { exact: true })
    .fill("Please me time");
  await expect(
    page.getByText("75% text match · awaiting transcript review", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "give", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "A person checked that this transcript reflects what was said",
      exact: true,
    })
    .check();
  await page.getByRole("checkbox", { name: "give", exact: true }).check();
  await page
    .getByRole("button", { name: "Save practice", exact: true })
    .click();
  await expect(
    page.getByText("Practice saved on this device.", { exact: false }),
  ).toBeVisible();
  // One tap continues with the next planned message.
  await expect(
    page.getByRole("button", { name: /^Next practice/ }),
  ).toBeVisible();
  expect(await spokenCalls(page)).toEqual([]);
});

test("recording requires consent and denial leaves practice usable without sending audio", async ({
  page,
}) => {
  await page.goto("/practice");
  await page.getByRole("button", { name: /Please give me time./ }).click();
  // The explicit "Agree and record" tap is this attempt’s recording consent.
  await page
    .getByRole("button", { name: "Agree and record audio", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Deliberate E2E fixture" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save practice", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", {
      name: "I practised using my communication aid",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Save practice", exact: true })
    .click();
  await expect(
    page.getByText("Practice saved on this device.", { exact: false }),
  ).toBeVisible();
  expect(await spokenCalls(page)).toEqual([]);
});

test("a synthetic camera clip is saved only with the attempt and permission resets for the next attempt", async ({
  page,
}) => {
  await page.goto("/practice");
  // Exercise the real browser MediaRecorder with a generated canvas stream; no physical device/person.
  await page.evaluate(() => {
    const NativeRecorder = window.MediaRecorder;
    let encodedBytes = 0;
    Object.defineProperty(window, "__rehabEncodedBytes", {
      configurable: true,
      get: () => encodedBytes,
    });
    // Observe real encoder output so the test never stops a clip before its first
    // encoded chunk. Camera preview time alone does not prove encoder readiness.
    window.MediaRecorder = class extends NativeRecorder {
      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        super(stream, options);
        this.addEventListener("dataavailable", (event) => {
          encodedBytes += event.data.size;
        });
      }
    };
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    const paint = canvas.getContext("2d")!;
    let frame = 0;
    // Explicit requests make generated frames deterministic in headless Chrome.
    // Its automatic canvas capture clock can advance the preview while providing
    // no frames to MediaRecorder, yielding a zero-byte clip unrelated to device capture.
    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
    const timer = setInterval(() => {
      paint.fillStyle = frame++ % 2 ? "#245f48" : "#def2dd";
      paint.fillRect(0, 0, 160, 120);
      track.requestFrame();
    }, 80);
    const originalStop = track.stop.bind(track);
    track.stop = () => {
      clearInterval(timer);
      originalStop();
    };
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => stream,
    });
  });
  await page.getByRole("button", { name: /Please give me time./ }).click();
  await page.getByText("Type what was heard instead", { exact: true }).click();
  await page
    .getByLabel("Words actually heard (optional)", { exact: true })
    .fill("Earlier separate attempt");
  await page
    .getByRole("button", { name: "Agree and record video", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Finish recording", exact: true }),
  ).toBeVisible();
  // Canvas stream timestamps begin at captureStream(), before the recording starts.
  // Require new frames after recording begins rather than accepting an old stream timestamp.
  const previewStart = await page
    .locator(".rehab-preview")
    .evaluate((video) => (video as HTMLVideoElement).currentTime);
  await expect
    .poll(() =>
      page
        .locator(".rehab-preview")
        .evaluate((video) => (video as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(previewStart + 0.5);
  await expect
    .poll(() =>
      page.evaluate(() => Number(Reflect.get(window, "__rehabEncodedBytes"))),
    )
    .toBeGreaterThan(0);
  await expect(
    page.getByLabel("Words actually heard (optional)", { exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "Finish recording", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Review recording", exact: true }),
  ).toBeVisible();
  await page.getByText("Optional browser transcript", { exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "Allow browser speech recognition for this attempt",
      exact: true,
    })
    .check();
  await expect(
    page.getByRole("button", { name: "Start browser transcript", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Review recording", exact: true })
    .click();
  await expect(
    page.getByText("Review finished.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save practice", exact: true })
    .click();
  await expect(
    page.getByText("Practice saved on this device.", { exact: false }),
  ).toBeVisible();
  const evidence = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open("sollu-rehab");
      req.onsuccess = () => resolve(req.result);
    });
    const rows = await new Promise<
      {
        kind: string;
        blob: Blob;
        durationSeconds: number;
        consentAt: number;
        createdAt: number;
      }[]
    >((resolve) => {
      const req = database.transaction("media").objectStore("media").getAll();
      req.onsuccess = () => resolve(req.result);
    });
    database.close();
    return rows.map((row) => ({
      kind: row.kind,
      size: row.blob.size,
      duration: row.durationSeconds,
      consented: row.consentAt <= row.createdAt,
    }));
  });
  expect(evidence).toHaveLength(1);
  expect(evidence[0].kind).toBe("video");
  expect(evidence[0].size).toBeGreaterThan(0);
  expect(evidence[0].consented).toBe(true);
  await page
    .getByRole("button", { name: "Choose another practice", exact: true })
    .click();
  await page.getByRole("button", { name: /Please give me time./ }).click();
  // A new attempt has no clip; recording again needs its own explicit tap.
  await expect(
    page.getByRole("button", { name: "Agree and record audio", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".rehab-evidence")).toHaveCount(0);
  expect(await spokenCalls(page)).toEqual([]);
});
