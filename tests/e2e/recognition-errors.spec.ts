import { mkdir } from "node:fs/promises";
import type { BrowserContext, Page } from "@playwright/test";
import { test, expect, openCaregiverSettings, spokenCalls } from "./helpers";

interface ControlledRecognition {
  onstart: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: unknown) => void) | null;
}

interface RecognitionHarness {
  starts: boolean[];
  aborts: number;
  checks: { langs: string[]; processLocally: boolean }[];
  installs: number;
  instances: ControlledRecognition[];
}

declare global {
  interface Window {
    __recognitionErrors: RecognitionHarness;
  }
}

/** Controlled browser events only: no physical microphone, language download or cloud service. */
async function installControlledRecognition(context: BrowserContext) {
  await context.addInitScript(() => {
    const state: RecognitionHarness = {
      starts: [],
      aborts: 0,
      checks: [],
      installs: 0,
      instances: [],
    };
    window.__recognitionErrors = state;
    class Recognition {
      processLocally = false;
      onstart: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      constructor() {
        state.instances.push(this);
      }
      static async available(options: {
        langs: string[];
        processLocally: boolean;
      }) {
        state.checks.push(options);
        return "unavailable";
      }
      static async install() {
        state.installs++;
        return true;
      }
      start() {
        state.starts.push(this.processLocally);
      }
      stop() {
        this.onend?.();
      }
      abort() {
        state.aborts++;
        // Browsers may emit end during cancellation. It must not submit a failed attempt.
        this.onend?.();
      }
    }
    for (const name of ["SpeechRecognition", "webkitSpeechRecognition"])
      Object.defineProperty(window, name, {
        value: Recognition,
        configurable: true,
      });
  });
}

async function startSpeak(page: Page, context: BrowserContext) {
  await installControlledRecognition(context);
  await page.goto("/speak");
  await expect
    .poll(() => page.evaluate(() => window.__recognitionErrors.starts))
    .toEqual([true]);
}

async function startEvent(page: Page) {
  await page.evaluate(() =>
    window.__recognitionErrors.instances.at(-1)?.onstart?.(),
  );
}

async function failRecognition(page: Page, code: string) {
  await page.evaluate(
    (error) =>
      window.__recognitionErrors.instances.at(-1)?.onerror?.({ error }),
    code,
  );
}

test("Speak only indicates recording after the browser confirms microphone start", async ({
  page,
  context,
}) => {
  await startSpeak(page, context);
  await expect(
    page.getByText("Waiting for the browser to start the microphone…", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Listening through your browser", { exact: true }),
  ).toHaveCount(0);
  await startEvent(page);
  await expect(
    page.getByText("Listening through your browser", { exact: true }),
  ).toBeVisible();
  expect(await spokenCalls(page)).toEqual([]);
});

test("unsupported language gives a settings route and retry clears the stale error", async ({
  page,
  context,
}) => {
  await startSpeak(page, context);
  await failRecognition(page, "language-not-supported");
  const error = page.getByRole("status").filter({ hasText: /local|language/i });
  await expect(error).toContainText(/English|en-IN/i);
  await expect(
    page.getByText("Microphone is not recording", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep listening", exact: true })
    .click();
  await expect(error).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.__recognitionErrors.starts))
    .toEqual([true, true]);
  await startEvent(page);
  await expect(
    page.getByText("Listening through your browser", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Speech recognition settings", exact: true })
    .click();
  await expect(page).toHaveURL(/\/settings\?tab=privacy$/);
  expect(await spokenCalls(page)).toEqual([]);
});

test("no-speech error offers retry without diagnosing a missing language pack", async ({
  page,
  context,
}) => {
  await startSpeak(page, context);
  await startEvent(page);
  await failRecognition(page, "no-speech");
  const error = page.getByRole("status").filter({ hasText: /speech/i });
  await expect(error).toContainText(
    /no speech|did not detect|not detect|didn.t hear|couldn.t hear/i,
  );
  await expect(error).not.toContainText(/language pack|not supported|missing/i);
  await expect(
    page.getByRole("button", { name: "Keep listening", exact: true }),
  ).toBeEnabled();
});

test("error after partial words keeps the draft for review and cancels every auto-submit timer", async ({
  page,
  context,
}) => {
  await page.clock.install();
  await startSpeak(page, context);
  await startEvent(page);
  await page.evaluate(() => {
    window.__recognitionErrors.instances.at(-1)?.onresult?.({
      resultIndex: 0,
      results: [
        {
          0: { transcript: "visit garden" },
          length: 1,
          isFinal: false,
        },
      ],
    });
  });
  await expect(page.getByText("visit garden", { exact: true })).toBeVisible();
  await failRecognition(page, "audio-capture");
  await expect(
    page.getByText("Microphone is not recording", { exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(20_000);
  await expect(page).toHaveURL(/\/speak$/);
  await expect(page.getByText("visit garden", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeEnabled();
  expect(await page.evaluate(() => window.__recognitionErrors.starts)).toEqual([
    true,
  ]);
  expect(await spokenCalls(page)).toEqual([]);
});

test("Sentence engine settings checks only local support without opening a mic or installing a pack", async ({
  page,
  context,
}) => {
  await installControlledRecognition(context);
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Sentence engine", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Speech recognition", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Sentence APIs turn text into sentence choices/),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Check local support for English",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /local recognition is unavailable/ }),
  ).toContainText("A sentence API key cannot enable it");
  const evidence = await page.evaluate(() => ({
    starts: window.__recognitionErrors.starts,
    installs: window.__recognitionErrors.installs,
    checks: window.__recognitionErrors.checks,
  }));
  expect(evidence).toEqual({
    starts: [],
    installs: 0,
    checks: [{ langs: ["en-IN"], processLocally: true }],
  });
  await mkdir("docs/evidence/v9", { recursive: true });
  await page.screenshot({
    path: "docs/evidence/v9/speech-settings-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({
    path: "docs/evidence/v9/speech-settings-desktop.png",
    fullPage: true,
  });
  expect(await spokenCalls(page)).toEqual([]);
});
