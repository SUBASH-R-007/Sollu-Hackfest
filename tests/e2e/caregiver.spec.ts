import {
  candidates,
  assertTrustedPlayback,
  clickAndWaitForSpeech,
  expect,
  installSpeechHarness,
  openCaregiverSettings,
  readAttempts,
  sentenceAt,
  spokenCalls,
  startTyped,
  test,
  unlockCaregiver,
} from "./helpers";

test("two isolated devices pair, exchange encrypted words/receipts/questions and acknowledge Help", async ({
  page,
  browser,
}) => {
  const sentFrames: string[] = [];
  page.on("websocket", (socket) =>
    socket.on("framesent", (frame) => {
      sentFrames.push(String(frame.payload));
    }),
  );
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Link phones" }).click();
  await page.getByRole("button", { name: "Create caregiver link" }).click();
  await expect(page.getByLabel("Private pairing link")).toBeVisible();
  const link = await page.getByLabel("Private pairing link").inputValue();
  expect(new URL(link).hash).toContain("k=");
  const caregiver = await browser.newContext({
    baseURL: "http://localhost:5173",
    viewport: { width: 390, height: 844 },
  });
  await installSpeechHarness(caregiver);
  const care = await caregiver.newPage();
  try {
    await care.goto(link);
    await expect(care.locator(".connection-badge")).toHaveText(/Connected/);
    await expect(
      care.getByText("Keep this page open to receive alerts.", { exact: true }),
    ).toBeVisible();
    expect(new URL(care.url()).hash).toBe("");
    await care
      .getByRole("button", { name: "Enable alerts", exact: true })
      .click();
    await expect(
      care.getByRole("button", { name: "Alerts enabled", exact: true }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Back to Home", exact: true })
      .click();
    await page.getByRole("button", { name: /^Type / }).click();
    await page.getByLabel(/Your words/).fill("water");
    await page.getByRole("button", { name: "Find my words" }).click();
    await expect(candidates(page)).toHaveCount(3);
    const chosen = await sentenceAt(page, 0);
    await clickAndWaitForSpeech(page, candidates(page).first());
    await expect(care.locator(".care-latest .care-sentence")).toHaveText(
      chosen,
    );
    await expect(page.locator(".delivery-status")).toContainText(
      "Shown on Priya",
    );
    expect(await spokenCalls(care)).toEqual([]);

    await page.getByRole("button", { name: "Done", exact: true }).click();
    const spokenBeforeQuestion = (await spokenCalls(page)).length;
    await care
      .getByLabel("Your question", { exact: true })
      .fill("Would you like some water?");
    await care.getByRole("button", { name: "Send question" }).click();
    await expect(page.locator(".question-banner")).toContainText(
      "Would you like some water?",
    );
    expect((await spokenCalls(page)).length).toBe(spokenBeforeQuestion);

    await clickAndWaitForSpeech(page, page.locator(".quick-help"));
    await expect(
      care.getByRole("heading", { name: "They need your help." }),
    ).toBeVisible();
    await care.getByRole("button", { name: "I’m coming", exact: true }).click();
    await expect(page.locator(".help-ack")).toContainText("Priya is coming");
    await page
      .getByRole("button", { name: "It was a mistake", exact: true })
      .click();
    await expect(
      care.getByRole("heading", { name: "They need your help." }),
    ).toHaveCount(0);
    expect(await spokenCalls(care)).toEqual([]);
    expect(sentFrames.length).toBeGreaterThanOrEqual(3);
    for (const payload of sentFrames) {
      const frame = JSON.parse(payload) as Record<string, unknown>;
      expect(Object.keys(frame).sort()).toEqual(["ciphertext", "iv", "v"]);
      expect(frame.v).toBe(1);
      expect(typeof frame.ciphertext).toBe("string");
      expect(payload).not.toContain(chosen);
      expect(payload).not.toContain("Would you like some water?");
    }
    await assertTrustedPlayback(page);
  } finally {
    await caregiver.close();
  }
});

test("therapist metrics reflect actual rejected sets and study CSV excludes raw text", async ({
  page,
}) => {
  await startTyped(page, "table");
  await page.getByRole("button", { name: /None of these/ }).click();
  await expect(page.locator(".round-label")).toContainText("Choice round 2");
  await expect(candidates(page)).toHaveCount(3);
  await clickAndWaitForSpeech(page, candidates(page).first());
  await expect.poll(async () => (await readAttempts(page)).length).toBe(1);
  await page.goto("/therapist");
  await unlockCaregiver(page);
  await expect(
    page.getByRole("heading", { name: "Communication log." }),
  ).toBeVisible();
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Attempts" })
      .locator("strong"),
  ).toHaveText("1");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "None of these" })
      .locator("strong"),
  ).toHaveText("1");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Needed another try" })
      .locator("strong"),
  ).toHaveText("1");
  await expect(page.locator(".struggle-card")).toHaveCount(1);
  await page
    .getByText("Sentences they did not choose · round 1", { exact: true })
    .click();
  await expect(page.locator(".struggle-card details li")).toHaveCount(3);
  await expect(
    page.getByLabel("Study export: leave out raw fragments and contact names", {
      exact: true,
    }),
  ).toBeChecked();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/-study\.csv$/);
  const stream = await file.createReadStream();
  const pieces: Buffer[] = [];
  for await (const piece of stream) pieces.push(Buffer.from(piece));
  const csv = Buffer.concat(pieces).toString("utf8");
  expect(csv).toContain("participant-001");
  expect(csv).not.toContain("table");
  expect(csv).not.toContain("Priya");
  expect(csv.trim().split(/\r?\n/)).toHaveLength(2);
  expect(await spokenCalls(page)).toEqual([]); // Reloading this local log never plays an unpicked sentence.
});

test("stage overlay uses the saved attempt tap count and elapsed audio-start time", async ({
  page,
}) => {
  await openCaregiverSettings(page);
  await page
    .getByLabel("Show measured taps and time on screen", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByText("Settings saved on this device.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to Home", exact: true }).click();
  await page.getByRole("button", { name: /^Topics / }).click();
  await page
    .locator(".topic-tile")
    .filter({ has: page.getByText("Medicine", { exact: true }) })
    .click();
  await expect(candidates(page)).toHaveCount(3);
  await clickAndWaitForSpeech(page, candidates(page).first());
  await expect.poll(async () => (await readAttempts(page)).length).toBe(1);
  const attempt = (await readAttempts(page))[0];
  expect(attempt.taps).toBe(3);
  expect(attempt.timeToSpeechMs).toBeGreaterThan(0);
  const overlay = page.getByTestId("stage-overlay");
  await expect(overlay).toContainText(`${attempt.taps} taps`);
  await expect(overlay).toContainText(
    `${(attempt.timeToSpeechMs! / 1000).toFixed(1)}`,
  );
});
