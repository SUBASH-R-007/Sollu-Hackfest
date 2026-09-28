import {
  test,
  expect,
  openCaregiverSettings,
  unlockCaregiver,
  spokenCalls,
} from "./helpers";
import type { BrowserContext, Page } from "@playwright/test";

const localChoice = (page: Page) =>
  page.getByRole("radio", { name: /^Local · on this device/ });
const onlineChoice = (page: Page) =>
  page.getByRole("radio", { name: /^Google \/ browser online/ });
const protection = (page: Page) =>
  page.getByLabel("Require local speech, voices and camera models");

async function allowOnline(page: Page) {
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Privacy", exact: true }).click();
  await protection(page).click();
  await expect(protection(page)).not.toBeChecked();
  await expect(localChoice(page)).toBeChecked();
  await onlineChoice(page).check();
  await expect(onlineChoice(page)).toBeChecked();
}

async function fakeRecognition(context: BrowserContext) {
  await context.addInitScript(() => {
    const state = { starts: [] as boolean[], aborts: 0 };
    Object.assign(window, { recognitionModeTest: state });
    class Recognition {
      processLocally = false;
      onstart: (() => void) | null = null;
      start() {
        state.starts.push(this.processLocally);
        this.onstart?.();
      }
      stop() {}
      abort() {
        state.aborts++;
      }
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: Recognition,
      configurable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: Recognition,
      configurable: true,
    });
  });
}
function inputState(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          recognitionModeTest: { starts: boolean[]; aborts: number };
        }
      ).recognitionModeTest,
  );
}

test("recognition choice defaults local, requires privacy opt-out and persists without enabling cloud AI", async ({
  page,
}) => {
  await openCaregiverSettings(page);
  await expect(localChoice(page)).toBeChecked();
  await expect(onlineChoice(page)).toBeDisabled();
  await page
    .getByRole("link", { name: "Privacy settings", exact: true })
    .click();
  await expect(protection(page)).toBeChecked();
  await protection(page).click();
  await expect(protection(page)).not.toBeChecked();
  await expect(localChoice(page)).toBeChecked();
  await onlineChoice(page).check();
  await expect(onlineChoice(page)).toBeChecked();
  await page.getByRole("tab", { name: "Sentence engine", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Sentence engine", exact: true }),
  ).toHaveValue("mock");
  await page.getByRole("tab", { name: "Privacy", exact: true }).click();
  expect(
    await page.evaluate(() => window.__solluSpeech.recognitionStarts),
  ).toBe(0);
  await page.reload();
  await unlockCaregiver(page);
  await expect(onlineChoice(page)).toBeChecked();
  await page.getByRole("tab", { name: "General", exact: true }).click();
  await localChoice(page).check();
  await page
    .getByLabel("Preferred name", { exact: true })
    .fill("Fictional speech preference");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(localChoice(page)).toBeChecked();
  await page.reload();
  await unlockCaregiver(page);
  await expect(localChoice(page)).toBeChecked();
  expect(await spokenCalls(page)).toEqual([]);
});

test("choosing local stops online patient and practice recognition across tabs without reopening a microphone", async ({
  page,
  context,
}) => {
  await fakeRecognition(context);
  await allowOnline(page);
  const speaking = await context.newPage();
  const practice = await context.newPage();
  try {
    // Open practice before Speak creates its recoverable communication draft.
    await practice.goto("/practice");
    await practice
      .getByRole("button", { name: "Start this practice", exact: true })
      .click();
    await practice
      .getByText("Optional browser transcript", { exact: true })
      .click();
    await practice
      .getByLabel("Allow browser speech recognition for this attempt", {
        exact: true,
      })
      .check();
    await practice
      .getByRole("button", { name: "Start browser transcript", exact: true })
      .click();
    await expect
      .poll(async () => (await inputState(practice)).starts)
      .toEqual([false]);
    await speaking.goto("/speak");
    await expect
      .poll(async () => (await inputState(speaking)).starts)
      .toEqual([false]);
    const beforeSpeak = (await inputState(speaking)).aborts;
    const beforePractice = (await inputState(practice)).aborts;
    await localChoice(page).check();
    await expect
      .poll(async () => (await inputState(speaking)).aborts)
      .toBeGreaterThan(beforeSpeak);
    await expect
      .poll(async () => (await inputState(practice)).aborts)
      .toBeGreaterThan(beforePractice);
    await expect(
      speaking.getByText(
        "Local recognition only. If unavailable, type or choose a topic.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      practice.getByRole("button", { name: "Stop transcript", exact: true }),
    ).toHaveCount(0);
    expect((await inputState(speaking)).starts).toEqual([false]);
    expect((await inputState(practice)).starts).toEqual([false]);
    await practice
      .getByRole("button", { name: "Start browser transcript", exact: true })
      .click();
    await expect
      .poll(async () => (await inputState(practice)).starts)
      .toEqual([false, true]);
  } finally {
    await speaking.close();
    await practice.close();
  }
});

test("local-only privacy overrides a saved online recognition choice", async ({
  page,
  context,
}) => {
  await fakeRecognition(context);
  await allowOnline(page);
  await protection(page).check();
  await expect(localChoice(page)).toBeChecked();
  await expect(onlineChoice(page)).toBeDisabled();
  await protection(page).click();
  await expect(protection(page)).not.toBeChecked();
  await expect(localChoice(page)).toBeChecked();
  const speaking = await context.newPage();
  try {
    await speaking.goto("/speak");
    await expect
      .poll(async () => (await inputState(speaking)).starts)
      .toEqual([true]);
  } finally {
    await speaking.close();
  }
});
