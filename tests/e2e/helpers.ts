import {
  expect,
  test as base,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import type { Attempt } from "@sollu/shared";

export interface TestTap {
  text: string;
  trusted: boolean;
  at: number;
  type: string;
  path: string;
}
export interface TestSpeech {
  text: string;
  lang: string;
  volume: number;
  queuedAt: number;
  startedAt?: number;
  endedAt?: number;
  cancelled?: boolean;
  tap?: TestTap;
}
export interface SpeechHarness {
  calls: TestSpeech[];
  taps: TestTap[];
  delay: number;
  duration: number;
  voices: boolean;
  cancelCount: number;
  recognitionStarts: number;
}
declare global {
  interface Window {
    __solluSpeech: SpeechHarness;
  }
}

let registration: Promise<{ status: number; body: string }> | undefined;

async function reuseServerRegistration(context: BrowserContext) {
  await context.route("**/api/device/register", async (route) => {
    // The real server issues the capability once per worker. Separate contexts retain their own
    // IndexedDB stores; this avoids exhausting the intentional 10 registrations/IP/minute limit.
    registration ??= route
      .fetch()
      .then(async (response) => ({
        status: response.status(),
        body: await response.text(),
      }))
      .catch((error) => {
        registration = undefined;
        throw error;
      });
    const response = await registration;
    if (response.status !== 200) registration = undefined;
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: response.body,
    });
  });
}

/** Browser output simulation only: it supplies no claim of real sound, language quality or latency. */
export async function installSpeechHarness(
  context: BrowserContext,
  recognition = false,
) {
  await reuseServerRegistration(context);
  await context.addInitScript(
    ({ simulateRecognition }) => {
      const state: SpeechHarness = {
        calls: [],
        taps: [],
        delay: 20,
        duration: 70,
        voices: true,
        cancelCount: 0,
        recognitionStarts: 0,
      };
      window.__solluSpeech = state;
      const active = new Map<TestSpeech, number[]>();
      for (const type of ["pointerup", "keyup", "click"])
        document.addEventListener(
          type,
          (event) => {
            if (event.type === "click" && (event as MouseEvent).detail !== 0)
              return;
            const target =
              event.target instanceof Element
                ? event.target.closest('button,a,[role="button"]')
                : null;
            if (!target) return;
            state.taps.push({
              text: `${target.getAttribute("aria-label") ?? ""} ${target.textContent ?? ""}`,
              trusted: event.isTrusted,
              at: performance.now(),
              type: event.type,
              path: location.pathname,
            });
          },
          true,
        );
      class Utterance {
        text: string;
        lang = "";
        volume = 1;
        rate = 1;
        pitch = 1;
        voice: SpeechSynthesisVoice | null = null;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text = "") {
          this.text = text;
        }
      }
      const fakeVoices = [
        {
          name: "Test Tamil local voice",
          lang: "ta-IN",
          localService: true,
          default: false,
          voiceURI: "test-ta",
        },
        {
          name: "Test English local voice",
          lang: "en-IN",
          localService: true,
          default: true,
          voiceURI: "test-en",
        },
      ];
      const synthesis = {
        getVoices: () => (state.voices ? fakeVoices : []),
        speak: (utterance: Utterance) => {
          const tap = [...state.taps]
            .reverse()
            .find((item) =>
              item.text
                .normalize("NFC")
                .includes(utterance.text.normalize("NFC")),
            );
          const call: TestSpeech = {
            text: utterance.text,
            lang: utterance.lang,
            volume: utterance.volume,
            queuedAt: performance.now(),
            tap,
          };
          state.calls.push(call);
          const timer = window.setTimeout(() => {
            if (!active.has(call)) return;
            call.startedAt = performance.now();
            utterance.onstart?.();
            if (!active.has(call)) return;
            const ended = window.setTimeout(() => {
              if (!active.has(call)) return;
              call.endedAt = performance.now();
              active.delete(call);
              utterance.onend?.();
            }, state.duration);
            active.get(call)?.push(ended);
          }, state.delay);
          active.set(call, [timer]);
        },
        cancel: () => {
          state.cancelCount++;
          for (const [call, timers] of active) {
            call.cancelled = true;
            timers.forEach((timer) => clearTimeout(timer));
          }
          active.clear();
        },
        pause: () => {},
        resume: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        speaking: false,
        pending: false,
        paused: false,
      };
      Object.defineProperty(window, "speechSynthesis", {
        value: synthesis,
        configurable: true,
      });
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        value: Utterance,
        configurable: true,
      });
      class Recognition {
        // This harness models a recognizer with an installed on-device language pack.
        processLocally = false;
        lang = "";
        continuous = false;
        interimResults = false;
        maxAlternatives = 1;
        onstart: (() => void) | null = null;
        onresult: ((event: unknown) => void) | null = null;
        onerror: ((event: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        private timer?: number;
        start() {
          state.recognitionStarts++;
          this.onstart?.();
          this.timer = window.setTimeout(
            () =>
              this.onresult?.({
                resultIndex: 0,
                results: [
                  {
                    0: { transcript: "tablet… raathiri" },
                    length: 1,
                    isFinal: true,
                  },
                ],
              }),
            60,
          );
        }
        stop() {
          clearTimeout(this.timer);
          this.onend?.();
        }
        abort() {
          clearTimeout(this.timer);
        }
      }
      Object.defineProperty(window, "SpeechRecognition", {
        value: simulateRecognition ? Recognition : undefined,
        configurable: true,
      });
      Object.defineProperty(window, "webkitSpeechRecognition", {
        value: undefined,
        configurable: true,
      });
      if (navigator.mediaDevices)
        Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
          value: () =>
            Promise.reject(
              new DOMException(
                "Deliberate E2E fixture: no physical camera or microphone",
                "NotAllowedError",
              ),
            ),
          configurable: true,
        });
    },
    { simulateRecognition: recognition },
  );
}

export const test = base.extend({
  page: async ({ page, context }, use) => {
    await installSpeechHarness(context);
    await page.goto("/");
    await page.locator(".language-switch").waitFor();
    // Existing flow assertions use English UI labels; speech still follows the Tamil contact.
    await page.locator(".language-switch").click();
    await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("sollu");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("kv", "readwrite");
        const table = transaction.objectStore("kv");
        const request = table.get("settings");
        request.onsuccess = () =>
          table.put({
            key: "settings",
            value: { ...request.result.value, stage: true },
          });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    });
    await page.reload();
    await use(page);
  },
});
export { expect };

export const candidates = (page: Page) => page.locator(".candidate-card");
export async function startTyped(page: Page, fragment = "tablet night") {
  await page.goto("/");
  await page.getByRole("button", { name: /^Type / }).click();
  await page.getByLabel(/Your words/).fill(fragment);
  await page.getByRole("button", { name: "Find my words" }).click();
  await expect(page).toHaveURL(/\/confirm$/);
  await expect(page.locator(".candidate-list")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}
export async function sentenceAt(page: Page, index: number) {
  return (
    await candidates(page).nth(index).locator(".candidate-sentence").innerText()
  ).trim();
}
export async function spokenCalls(page: Page) {
  return page.evaluate(() =>
    window.__solluSpeech.calls.filter((call) => call.startedAt !== undefined),
  );
}

export async function assertTrustedPlayback(page: Page) {
  const calls = await spokenCalls(page);
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) {
    expect(
      call.tap,
      `No exact displayed-sentence activation for: ${call.text}`,
    ).toBeDefined();
    expect(call.tap?.trusted).toBe(true);
    expect(call.tap?.type).toMatch(/^(pointerup|keyup|click)$/);
    expect(call.startedAt! - call.tap!.at).toBeLessThanOrEqual(1500);
    expect(call.startedAt! - call.tap!.at).toBeGreaterThanOrEqual(0);
  }
}

export async function readAttempts(page: Page): Promise<Attempt[]> {
  return page.evaluate(async () => {
    const request = indexedDB.open("sollu");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const rows = database
        .transaction("attempts", "readonly")
        .objectStore("attempts")
        .getAll();
      return await new Promise<Attempt[]>((resolve, reject) => {
        rows.onsuccess = () => resolve(rows.result);
        rows.onerror = () => reject(rows.error);
      });
    } finally {
      database.close();
    }
  });
}

export async function selectPagedTile(page: Page, name: string) {
  for (let index = 0; index < 6; index++) {
    const tile = page
      .locator(".topic-tile")
      .filter({ has: page.getByText(name, { exact: true }) });
    if (await tile.count()) {
      await tile.click();
      return;
    }
    await page.getByRole("button", { name: "More topics" }).click();
    // The app deliberately ignores repeated activation of the same control for 400 ms.
    await page.waitForTimeout(425);
  }
  throw new Error(`Topic tile ${name} did not appear after paging`);
}

export async function unlockCaregiver(page: Page) {
  const pin = page.getByLabel("Caregiver PIN", { exact: true });
  await expect(
    pin.or(
      page.getByRole("heading", {
        name: /A little more personal|Communication log|Therapist dashboard|Clinician dashboard/,
      }),
    ),
  ).toBeVisible();
  if (await pin.isVisible()) {
    await pin.fill("2468");
    const create = page.getByRole("button", {
      name: "Create PIN",
      exact: true,
    });
    if (await create.isVisible()) await create.click();
    else await page.getByRole("button", { name: /Unlock/ }).click();
  }
}
export async function openCaregiverSettings(page: Page) {
  await page.goto("/settings");
  await unlockCaregiver(page);
}

export async function checkTargetSizes(page: Page) {
  const tooSmall = await page.locator("[data-tap]").evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rectangle = element.getBoundingClientRect();
      if (!rectangle.width || !rectangle.height) return [];
      const minHeight = element.classList.contains("big-tile") ? 120 : 72;
      return rectangle.width < 72 || rectangle.height < minHeight
        ? [
            {
              label: element.textContent?.trim(),
              width: rectangle.width,
              height: rectangle.height,
              minHeight,
            },
          ]
        : [];
    }),
  );
  expect(tooSmall, "Patient controls must meet the specified size").toEqual([]);
}

export async function clickAndWaitForSpeech(page: Page, control: Locator) {
  const previous = (await spokenCalls(page)).length;
  await control.click();
  await expect
    .poll(async () => (await spokenCalls(page)).length)
    .toBe(previous + 1);
}
