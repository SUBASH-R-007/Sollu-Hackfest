import {
  test,
  expect,
  spokenCalls,
  assertTrustedPlayback,
  checkTargetSizes,
  openCaregiverSettings,
  readAttempts,
} from "./helpers";

test("comfort messages honor two-step confirmation and repair exits pause", async ({
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
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "My tools" })
    .click();
  await page.getByRole("button", { name: /Body and comfort/ }).click();
  const sentence = page.getByRole("button", { name: /I need a break\./ });
  await sentence.click();
  expect(await spokenCalls(page)).toEqual([]);
  await expect(page.getByRole("status")).toContainText(
    "Tap the same sentence again",
  );
  await page.waitForTimeout(425);
  await sentence.click();
  await expect.poll(async () => (await spokenCalls(page)).length).toBe(1);
  await assertTrustedPlayback(page);
  await page
    .locator(".communication-dock")
    .getByRole("button", { name: /Pause/ })
    .click();
  await page
    .locator(".communication-dock")
    .getByRole("button", { name: /Fix/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Let’s get the meaning right." }),
  ).toBeVisible();
});

test("word correction approval saves the reviewed snapshot, not a later edit", async ({
  page,
}) => {
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Privacy", exact: true }).click();
  await page.getByLabel("When I say", { exact: true }).fill("table");
  await page.getByLabel("I mean", { exact: true }).fill("cable");
  await page
    .getByRole("button", { name: "Review correction", exact: true })
    .click();
  await page.getByLabel("I mean", { exact: true }).fill("water");
  await expect(
    page.locator("blockquote").filter({ hasText: "table → cable" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Yes, this is what I mean", exact: true })
    .click();
  await expect(
    page.locator(".memory-row").filter({ hasText: "table → cable" }),
  ).toContainText("Approved");
  await expect(
    page.locator(".memory-row").filter({ hasText: "table → water" }),
  ).toHaveCount(0);
  expect(await spokenCalls(page)).toEqual([]);
});

test("Tamil vocabulary uses Tamil controls and only speaks the selected complete phrase", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".language-switch").click();
  await page.goto("/words");
  await expect(
    page.getByRole("heading", { name: "சொல்ல ஒரு சொல்" }),
  ).toBeVisible();
  await page.getByRole("textbox").fill("தண்ணீர்");
  await page.locator(".personal-grid button").first().click();
  expect(await spokenCalls(page)).toEqual([]);
  const chosen = page.locator(".personal-sentence");
  await expect(chosen).toContainText("எனக்கு தண்ணி வேணும்.");
  await checkTargetSizes(page);
  await chosen.click();
  await expect.poll(async () => (await spokenCalls(page)).length).toBe(1);
  expect((await spokenCalls(page))[0].lang).toContain("ta");
  await assertTrustedPlayback(page);
});

test("pause saves a typed draft across reload and resume is silent", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".type-tile").click();
  await page.getByLabel(/Your words/).fill("I want to talk about my family");
  await page
    .locator(".communication-dock")
    .getByRole("button", { name: /Pause/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Take your time." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Take your time." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue my message" }).click();
  await expect(page.getByLabel(/Your words/)).toHaveValue(
    "I want to talk about my family",
  );
  expect(await spokenCalls(page)).toEqual([]);
});

test("sentence builder requires explicit polarity and keeps refusal through exact playback", async ({
  page,
}) => {
  await page.goto("/sentence");
  await page.getByRole("button", { name: "💧 water", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "I want water.", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "I do not want", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I do not want water.", exact: true })
    .click();
  await expect.poll(async () => (await spokenCalls(page)).length).toBe(1);
  expect((await spokenCalls(page))[0].text).toBe("I do not want water.");
  await assertTrustedPlayback(page);
  await page.getByRole("button", { name: "Check they understood" }).click();
  await page
    .getByLabel("They understood… (optional)")
    .fill("You do not want water.");
  await expect(page.getByLabel("Partner’s question")).toHaveValue("");
  await page.getByRole("button", { name: "Yes, they understood" }).click();
  await expect
    .poll(
      async () =>
        (await readAttempts(page)).find(
          (a) => a.chosenText === "I do not want water.",
        )?.communicationOutcome,
    )
    .toBe("understood");
  expect(
    (await readAttempts(page)).find(
      (a) => a.chosenText === "I do not want water.",
    )?.partnerUnderstanding,
  ).toBe("You do not want water.");
});

test("new personal word stays pending until patient approval then speaks exactly", async ({
  page,
}) => {
  await openCaregiverSettings(page);
  // Keep the unlocked caregiver session while navigating to the editor.
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "My tools" })
    .click();
  await page.getByRole("button", { name: /Find a word/ }).click();
  await page.getByRole("button", { name: "My words", exact: true }).click();
  await page.getByRole("button", { name: /Add my word/ }).click();
  await page.getByLabel("Title", { exact: true }).fill("Garden");
  await page
    .getByLabel("Exact words to say", { exact: true })
    .fill("I want to sit in the garden.");
  await page.getByRole("button", { name: "Save for patient review" }).click();
  await expect(page.locator(".personal-sentence")).toHaveCount(0);
  await page.getByRole("button", { name: /Garden.*Review/ }).click();
  expect(await spokenCalls(page)).toEqual([]);
  await page.getByRole("button", { name: /Yes, add to my cards/ }).click();
  const exact = page.getByRole("button", {
    name: "Say: I want to sit in the garden.",
    exact: true,
  });
  await expect(exact).toBeVisible();
  await exact.click();
  await expect.poll(async () => (await spokenCalls(page)).length).toBe(1);
  await assertTrustedPlayback(page);
});
