import AxeBuilder from "@axe-core/playwright";
import {
  candidates,
  assertTrustedPlayback,
  checkTargetSizes,
  clickAndWaitForSpeech,
  expect,
  installSpeechHarness,
  openCaregiverSettings,
  readAttempts,
  selectPagedTile,
  sentenceAt,
  spokenCalls,
  startTyped,
  test,
} from "./helpers";

test("rehearsal warm-up stays silent and cached Type suggestions work offline", async ({
  page,
  context,
}) => {
  await openCaregiverSettings(page);
  await page
    .getByRole("button", { name: "Demo & rehearsal", exact: true })
    .click();
  const inferenceRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/intent"))
      inferenceRequests.push(request.url());
  });
  await page.getByRole("button", { name: "Warm up three scenarios" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "of 3 local vocabulary sets stored" }),
  ).toContainText("1 of 3 local vocabulary sets stored");
  expect(inferenceRequests).toEqual([]);
  expect(await spokenCalls(page)).toEqual([]);
  await startTyped(page, "water");
  await expect(candidates(page)).toHaveCount(1);
  const onlineSentence = await sentenceAt(page, 0);
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "My space", exact: true })
    .click();
  await context.setOffline(true);
  await page.getByRole("button", { name: /^Type / }).click();
  await page.getByLabel(/Your words/).fill("water");
  await page.getByRole("button", { name: "Find my words" }).click();
  await expect(page.locator(".heard-row .mode-badge")).toContainText("CACHED");
  expect(await sentenceAt(page, 0)).toBe(onlineSentence);
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
  const completed = (await readAttempts(page)).find(
    (attempt) => attempt.outcome === "spoken",
  )!;
  expect(completed.demoCached).toBe(true);
  expect(completed.rounds[0].latencyMs).toBe(0);
  await assertTrustedPlayback(page);
});

test("Home has four inputs, no autoplay, accessible names, contrast and large touch targets", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "What would you like to say?" }),
  ).toBeVisible();
  await expect(page.locator(".home-grid .big-tile")).toHaveCount(4);
  await expect(page.locator(".quick-help")).toHaveText(/I need help/);
  expect(await spokenCalls(page)).toEqual([]);
  await checkTargetSizes(page);
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    report.violations
      .filter((item) => item.impact === "serious" || item.impact === "critical")
      .map((item) => ({
        id: item.id,
        nodes: item.nodes.map((node) => ({
          target: node.target,
          problem: node.failureSummary,
        })),
      })),
  ).toEqual([]);
  const contrast = await new AxeBuilder({ page })
    .withRules(["color-contrast-enhanced"])
    .analyze();
  expect(
    contrast.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => ({
        target: node.target,
        problem: node.failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("Type → three guesses → explicit neutral preview → chosen sentence only", async ({
  page,
}) => {
  await startTyped(page);
  await expect(candidates(page)).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: /None of these/ }),
  ).toBeVisible();
  const texts = await page.locator(".candidate-sentence").allTextContents();
  expect(new Set(texts).size).toBe(3);
  await page.waitForTimeout(350);
  expect(await spokenCalls(page)).toEqual([]);
  await checkTargetSizes(page);
  await clickAndWaitForSpeech(page, page.locator(".listen-button").first());
  await expect(page).toHaveURL(/\/confirm$/);
  expect((await spokenCalls(page))[0].volume).toBeLessThan(1);
  await clickAndWaitForSpeech(page, candidates(page).nth(1));
  await expect(page).toHaveURL(/\/speaking$/);
  await expect.poll(async () => (await readAttempts(page)).length).toBe(1);
  const attempts = await readAttempts(page);
  expect(attempts[0].chosenText).toBe(texts[1]);
  expect(attempts[0].rounds[0].candidates).toHaveLength(3);
  expect((await spokenCalls(page)).map((call) => call.text)).toEqual([
    texts[0],
    texts[1],
  ]);
  await assertTrustedPlayback(page);
});

test("fewer valid candidates have no invented filler", async ({ page }) => {
  await page.route("**/api/intent", async (route) => {
    const result = await route.fetch();
    const body = await result.json();
    await route.fulfill({
      response: result,
      json: { ...body, candidates: body.candidates.slice(0, 1) },
    });
  });
  await startTyped(page, "water");
  await expect(candidates(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: /None of these/ }),
  ).toBeVisible();
  expect(await spokenCalls(page)).toEqual([]);
});

test("rejected candidates are excluded and saved as a struggle", async ({
  page,
}) => {
  await startTyped(page, "left shoulder pain");
  const firstRound = await page
    .locator(".candidate-sentence")
    .allTextContents();
  await page.getByRole("button", { name: /None of these/ }).click();
  await expect(page.locator(".round-label")).toContainText("Choice round 2");
  await expect(candidates(page)).toHaveCount(3);
  const secondRound = await page
    .locator(".candidate-sentence")
    .allTextContents();
  expect(secondRound.every((text) => !firstRound.includes(text))).toBe(true);
  expect(await spokenCalls(page)).toEqual([]);
  await clickAndWaitForSpeech(page, candidates(page).first());
  await expect
    .poll(async () => (await readAttempts(page))[0]?.rounds[0].noneOfThese)
    .toBe(true);
  expect((await readAttempts(page))[0].rounds).toHaveLength(2);
  await assertTrustedPlayback(page);
});

test("Topics pain templates work before AI, including side and round-two recovery", async ({
  page,
}) => {
  const intentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/intent"))
      intentRequests.push(request.postData() ?? "");
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Topics / }).click();
  await selectPagedTile(page, "Pain");
  await selectPagedTile(page, "shoulder");
  await page.getByRole("button", { name: /Left/ }).click();
  await expect(candidates(page)).toHaveCount(3);
  await expect(page.locator(".heard-row .mode-badge")).toContainText(
    "Pain templates",
  );
  expect(intentRequests).toHaveLength(0);
  expect(await sentenceAt(page, 0)).toContain("இடது");
  await page.getByRole("button", { name: /None of these/ }).click();
  await expect(page.locator(".heard-row .mode-badge")).toContainText(
    "Prepared health/help wording",
  );
  expect(intentRequests).toHaveLength(0);
  await clickAndWaitForSpeech(page, candidates(page).first());
  await assertTrustedPlayback(page);
});

test("speech starts on the input tile and simulated recognition reaches confirmation without Done", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  await installSpeechHarness(context, true);
  const page = await context.newPage();
  try {
    await page.goto("/");
    await page.locator(".language-switch").click();
    await page.getByRole("button", { name: /^Speak / }).click();
    await expect
      .poll(() => page.evaluate(() => window.__solluSpeech.recognitionStarts))
      .toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/confirm$/, { timeout: 8_000 });
    await expect(candidates(page)).toHaveCount(3);
    await expect(page.locator(".heard-row")).toContainText("tablet… raathiri");
    expect(await spokenCalls(page)).toEqual([]);
    await clickAndWaitForSpeech(page, candidates(page).first());
    await expect.poll(async () => (await readAttempts(page))[0]?.taps).toBe(2);
    await assertTrustedPlayback(page);
  } finally {
    await context.close();
  }
});

test("labelled speech and camera demo inputs never claim a real transcription or image upload", async ({
  page,
}) => {
  const requestBodies: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST")
      requestBodies.push(request.postData() ?? "");
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Speak / }).click();
  await expect(page.getByText("DEMO INPUT · NO TRANSCRIPTION")).toBeVisible();
  await page.getByRole("button", { name: "tablet… raathiri" }).click();
  await expect(candidates(page)).toHaveCount(3);
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page.getByRole("button", { name: /^Camera / }).click();
  await expect(
    page.getByText(/The demo uses a sample bottle label/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try demo: water bottle" }).click();
  await expect(candidates(page)).toHaveCount(1);
  await expect(page.locator(".heard-row")).toContainText("bottle");
  expect(
    requestBodies.some((body) => /data:image|image\/jpeg|base64/.test(body)),
  ).toBe(false);
  await clickAndWaitForSpeech(page, candidates(page).first());
  await assertTrustedPlayback(page);
});

test("offline Help speaks a local device phrase without AI and offers SMS", async ({
  page,
  context,
}) => {
  let intentRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/intent")) intentRequests++;
  });
  await page.goto("/");
  await expect(page.locator(".quick-help")).toBeVisible();
  await context.setOffline(true);
  await clickAndWaitForSpeech(page, page.locator(".quick-help"));
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByRole("link", { name: "Send SMS" })).toHaveAttribute(
    "href",
    /^sms:/,
  );
  await expect(
    page.getByText(/Sollu is not an emergency service/),
  ).toBeVisible();
  expect(intentRequests).toBe(0);
  expect((await spokenCalls(page))[0].text).toBe("I need help!");
  await assertTrustedPlayback(page);
});

test("a chosen photo stays local when the on-device model cannot download", async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" || request.method() === "PUT")
      uploads.push(request.postData() ?? "");
  });
  await page.route("https://**/*", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /^Camera / }).click();
  await page
    .getByLabel("Choose a photo from this device", { exact: true })
    .setInputFiles({
      name: "local-only-fixture.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6xC8AAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(
    page.getByAltText("Your photo, processed only on this device"),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Local-only protection blocks the external object-model download/,
    ),
  ).toBeVisible({ timeout: 20_000 });
  expect(
    uploads.some((body) =>
      /data:image|image\/|base64|local-only-fixture/.test(body),
    ),
  ).toBe(false);
  expect(await spokenCalls(page)).toEqual([]);
});

test("synthetic untrusted activation never authorizes speech", async ({
  page,
}) => {
  await startTyped(page, "water");
  await candidates(page)
    .first()
    .evaluate((element) =>
      element.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          button: 0,
          isPrimary: true,
        }),
      ),
    );
  await page.waitForTimeout(200);
  expect(await spokenCalls(page)).toEqual([]);
  await expect(page).toHaveURL(/\/confirm$/);
});

test("Stop cancels queued output and it never starts later", async ({
  page,
}) => {
  await startTyped(page, "water");
  await page.evaluate(() => {
    window.__solluSpeech.delay = 1000;
  });
  await candidates(page).first().click();
  await expect(page).toHaveURL(/\/speaking$/);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.waitForTimeout(1200);
  expect(await spokenCalls(page)).toEqual([]);
  expect(
    await page.evaluate(() =>
      window.__solluSpeech.calls.every((call) => call.cancelled),
    ),
  ).toBe(true);
  await expect(page.getByText("Stopped.", { exact: true })).toBeVisible();
});

test("audio queued beyond the tap window requires a new exact-sentence tap", async ({
  page,
}) => {
  await startTyped(page, "water");
  const selected = await sentenceAt(page, 0);
  await page.evaluate(() => {
    window.__solluSpeech.delay = 1700;
  });
  await candidates(page).first().click();
  await expect(
    page.getByText("Ready now. Tap the sentence again to speak.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.waitForTimeout(250);
  expect(await spokenCalls(page)).toEqual([]);
  await page.evaluate(() => {
    window.__solluSpeech.delay = 20;
  });
  await clickAndWaitForSpeech(page, page.locator(".spoken-sentence"));
  expect((await spokenCalls(page))[0].text).toBe(selected);
  await assertTrustedPlayback(page);
});

test("changing the addressee on confirmation regenerates in the doctor’s language", async ({
  page,
}) => {
  const contexts: { outputLang: string; addressee?: { name: string } }[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/intent"))
      contexts.push(request.postDataJSON().context);
  });
  await startTyped(page, "water");
  await expect(candidates(page)).toHaveCount(1);
  const tamilSentence = await sentenceAt(page, 0);
  expect(tamilSentence).toMatch(/[\u0B80-\u0BFF]/);
  await page.getByRole("button", { name: /^To: Priya/ }).click();
  await page.locator(".person-tile").filter({ hasText: "Dr. Rao" }).click();
  await expect(page).toHaveURL(/\/confirm$/);
  await expect(
    page.getByRole("button", { name: /^To: Dr\. Rao/ }),
  ).toBeVisible();
  await expect(candidates(page).first()).toContainText("water");
  expect(await sentenceAt(page, 0)).not.toMatch(/[\u0B80-\u0BFF]/);
  expect(contexts.at(-1)?.outputLang).toBe("en");
  // The listener controls output language locally; their name stays private by default.
  expect(contexts.at(-1)?.addressee).toBeUndefined();
  expect(await spokenCalls(page)).toEqual([]);
  await clickAndWaitForSpeech(page, candidates(page).first());
  expect((await spokenCalls(page))[0].lang).toBe("en-IN");
  await assertTrustedPlayback(page);
});

test("baseline counts word choices plus the final exact-sentence tap", async ({
  page,
}) => {
  await page.goto("/baseline");
  await expect(
    page.getByRole("heading", { name: "Picture board" }),
  ).toBeVisible();
  await page
    .locator(".baseline-grid")
    .getByRole("button", { name: /I$/ })
    .click();
  await page
    .locator(".baseline-grid")
    .getByRole("button", { name: /want$/ })
    .click();
  await page
    .locator(".baseline-grid")
    .getByRole("button", { name: /water$/ })
    .click();
  expect(await spokenCalls(page)).toEqual([]);
  await clickAndWaitForSpeech(
    page,
    page.getByRole("button", { name: "I want water", exact: true }),
  );
  await expect.poll(async () => (await readAttempts(page)).length).toBe(1);
  const attempt = (await readAttempts(page))[0];
  expect(attempt.chosenText).toBe("I want water");
  expect(attempt.taps).toBe(4);
  expect(attempt.timeToSpeechMs).toBeGreaterThan(0);
  await expect(page.locator(".notice")).toContainText("4 taps");
  await assertTrustedPlayback(page);
});

test("keyboard activation confirms one exact sentence once", async ({
  page,
}) => {
  await startTyped(page, "water");
  const selected = await sentenceAt(page, 0);
  await candidates(page).first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/speaking$/);
  await expect.poll(async () => (await spokenCalls(page)).length).toBe(1);
  await page.waitForTimeout(200);
  expect((await spokenCalls(page)).map((call) => call.text)).toEqual([
    selected,
  ]);
  await assertTrustedPlayback(page);
});
