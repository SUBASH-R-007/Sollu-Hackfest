import type { Page } from "@playwright/test";
import {
  test,
  expect,
  openCaregiverSettings,
  unlockCaregiver,
  spokenCalls,
  startTyped,
  candidates,
} from "./helpers";

async function fakeEngineSettings(page: Page) {
  const providers = [
    ["mock", "Free vocabulary", "catalog"],
    ["openai", "OpenAI", "gpt-test"],
    ["anthropic", "Anthropic", "claude-test"],
    ["gemini", "Google Gemini", "gemini-test"],
    ["groq", "Groq", "llama-test"],
    ["ollama", "Local Ollama", "llama3"],
  ].map(([id, label, defaultModel]) => ({
    id,
    label,
    defaultModel,
    keyConfigured: false,
    keySource: "none",
    requiresKey: id !== "mock" && id !== "ollama",
  }));
  let config = {
    policy: { mode: "cloud-permitted", allowCloudAI: true },
    provider: "mock",
    model: "catalog",
    timeoutMs: 15000,
    revision: 1,
    cloudConsent: false,
    providers,
  };
  const saves: Record<string, unknown>[] = [];
  let testCalls = 0;
  await page.route("**/api/llm/settings", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      saves.push(body);
      const selected = providers.find((item) => item.id === body.provider)!;
      if (typeof body.apiKey === "string") {
        selected.keyConfigured = true;
        selected.keySource = "session";
      }
      if (body.removeKey) {
        selected.keyConfigured = false;
        selected.keySource = "none";
      }
      config = body.removeKey
        ? { ...config, revision: config.revision + 1 }
        : {
            policy: { mode: "cloud-permitted", allowCloudAI: true },
            provider: String(body.provider),
            model:
              typeof body.model === "string"
                ? body.model
                : selected.defaultModel,
            timeoutMs: Number(body.timeoutMs ?? 15000),
            revision: config.revision + 1,
            cloudConsent: body.cloudConsent === true,
            providers,
          };
    }
    await route.fulfill({ json: config });
  });
  await page.route("**/api/llm/test", async (route) => {
    testCalls++;
    await route.fulfill({
      json: {
        ok: true,
        message: "Synthetic response received.",
        provider: config.provider,
        model: config.model,
        latencyMs: 10,
      },
    });
  });
  return { saves, testCalls: () => testCalls };
}

test("cloud engine requires sharing consent and never persists a pasted key in browser storage", async ({
  page,
}) => {
  const engine = await fakeEngineSettings(page);
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Sentence engine", exact: true }).click();
  await page.getByLabel("Allow cloud sentence APIs on this device").check();
  await page
    .getByRole("combobox", { name: "Sentence engine", exact: true })
    .selectOption("openai");
  const keyField = page.getByLabel("API key (optional if already configured)");
  const fakeKey = "not-a-real-api-key-settings-test-987";
  await keyField.fill(fakeKey);
  await expect(
    page.getByRole("button", { name: "Save engine settings", exact: true }),
  ).toBeDisabled();
  expect(engine.saves).toHaveLength(0);
  expect(engine.testCalls()).toBe(0);
  await page
    .getByLabel(
      "Allow text sharing with OpenAI to generate sentence suggestions",
    )
    .check();
  await page
    .getByRole("button", { name: "Save engine settings", exact: true })
    .click();
  await expect(keyField).toHaveValue("");
  await expect(
    page.getByText(
      "Session key configured in server memory. It is never shown here.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(engine.saves[0]).toMatchObject({
    provider: "openai",
    apiKey: fakeKey,
    cloudConsent: true,
  });
  expect(engine.testCalls()).toBe(0);
  const browserData = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await Promise.all(
      Array.from(database.objectStoreNames).map(
        (name) =>
          new Promise<unknown[]>((resolve, reject) => {
            const request = database
              .transaction(name, "readonly")
              .objectStore(name)
              .getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          }),
      ),
    );
    database.close();
    return JSON.stringify({
      rows,
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage },
    });
  });
  expect(browserData).not.toContain(fakeKey);
  await page
    .getByRole("button", { name: "Run synthetic connection test", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Connection test passed" }),
  ).toBeVisible();
  expect(engine.testCalls()).toBe(1);
  await page
    .getByRole("button", { name: "Use free vocabulary", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Sentence engine", exact: true }),
  ).toHaveValue("mock");
  await page
    .getByRole("combobox", { name: "Sentence engine", exact: true })
    .selectOption("openai");
  await expect(
    page.getByLabel(
      "Allow text sharing with OpenAI to generate sentence suggestions",
    ),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Forget session key", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Sentence engine", exact: true }),
  ).toHaveValue("mock");
  await page
    .getByRole("combobox", { name: "Sentence engine", exact: true })
    .selectOption("openai");
  await expect(
    page.getByText("No API key configured for this provider.", { exact: true }),
  ).toBeVisible();
  expect(engine.saves[2]).toEqual({ provider: "openai", removeKey: true });
  expect(await spokenCalls(page)).toEqual([]);
});

test("sentence API opt-in preserves local media and revocation applies across tabs", async ({
  page,
  context,
}) => {
  await fakeEngineSettings(page);
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Sentence engine", exact: true }).click();
  const permission = page.getByLabel(
    "Allow cloud sentence APIs on this device",
  );
  await expect(permission).not.toBeChecked();
  await permission.check();
  await expect(page.locator('select option[value="openai"]')).toHaveJSProperty(
    "disabled",
    false,
  );
  await page.getByRole("tab", { name: "Privacy", exact: true }).click();
  await expect(
    page.getByLabel("Require local speech, voices and camera models"),
  ).toBeChecked();
  await expect(
    page.getByText("Cloud sentence APIs: permitted by this device", {
      exact: false,
    }),
  ).toBeVisible();
  const second = await context.newPage();
  try {
    await fakeEngineSettings(second);
    await second.goto("/settings?tab=llm");
    await unlockCaregiver(second);
    await expect(
      second.getByLabel("Allow cloud sentence APIs on this device"),
    ).toBeChecked();
    let localOnly: unknown;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/intent"))
        localOnly = request.postDataJSON()?.localOnly;
    });
    await page.goto("/");
    await startTyped(page, "water please");
    await expect(candidates(page).first()).toBeVisible();
    expect(localOnly).toBe(false);
    await second
      .getByLabel("Allow cloud sentence APIs on this device")
      .uncheck();
    await expect(candidates(page)).toHaveCount(0);
    await page.goto("/");
    await page
      .getByRole("button", { name: "Start a new message", exact: true })
      .click();
    await page.getByRole("button", { name: /^Type / }).click();
    await page.getByLabel(/Your words/).fill("water please");
    await page.getByRole("button", { name: "Find my words" }).click();
    await expect(candidates(page).first()).toBeVisible();
    expect(localOnly).toBe(true);
    await second.reload();
    await unlockCaregiver(second);
    await expect(
      second.getByLabel("Allow cloud sentence APIs on this device"),
    ).not.toBeChecked();
    expect(await spokenCalls(page)).toEqual([]);
  } finally {
    await second.close();
  }
});

test("unsaved engine keys clear on provider switch and leaving the settings section", async ({
  page,
}) => {
  const engine = await fakeEngineSettings(page);
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Privacy", exact: true }).click();
  await page
    .getByLabel("Require local speech, voices and camera models")
    .click();
  await expect(
    page.getByLabel("Require local speech, voices and camera models"),
  ).not.toBeChecked();
  await page.getByRole("tab", { name: "Sentence engine", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Sentence engine", exact: true })
    .selectOption("openai");
  await page
    .getByLabel("API key (optional if already configured)")
    .fill("dummy-never-send");
  await page
    .getByRole("combobox", { name: "Sentence engine", exact: true })
    .selectOption("gemini");
  await expect(
    page.getByLabel("API key (optional if already configured)"),
  ).toHaveValue("");
  await page
    .getByLabel("API key (optional if already configured)")
    .fill("dummy-never-send-either");
  await page.getByRole("tab", { name: "Personalize", exact: true }).click();
  // Returning to the same tab must respect the device's repeated-tap filter.
  await page.waitForTimeout(425);
  await page.getByRole("tab", { name: "Sentence engine", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Sentence engine", exact: true })
    .selectOption("gemini");
  await expect(
    page.getByLabel("API key (optional if already configured)"),
  ).toHaveValue("");
  expect(engine.saves).toHaveLength(0);
  expect(engine.testCalls()).toBe(0);
});

test("caregiver personalization persists without starting audio or erasing other settings", async ({
  page,
}) => {
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Personalize", exact: true }).click();
  await expect(
    page.getByLabel("Use recent conversation context", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel("Use personal context and communication preferences", {
      exact: true,
    }),
  ).not.toBeChecked();
  await page
    .getByRole("combobox", { name: "Sentence style", exact: true })
    .selectOption("brief");
  await page
    .getByRole("combobox", {
      name: "Preferred maximum sentence length",
      exact: true,
    })
    .selectOption("8");
  await page
    .getByRole("combobox", {
      name: "First communication tile on Home",
      exact: true,
    })
    .selectOption("type");
  await page.getByLabel("Reduce animation and moving decorations").check();
  await page
    .getByLabel("Communication preferences (optional)")
    .fill("Use everyday words.");
  await page
    .getByRole("button", { name: "Save personalization", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Personalization saved" }),
  ).toBeVisible();
  await page.reload();
  await unlockCaregiver(page);
  await expect(
    page.getByRole("combobox", { name: "Sentence style", exact: true }),
  ).toHaveValue("brief");
  await expect(
    page.getByRole("combobox", {
      name: "Preferred maximum sentence length",
      exact: true,
    }),
  ).toHaveValue("8");
  await expect(
    page.getByLabel("Communication preferences (optional)"),
  ).toHaveValue("Use everyday words.");
  await page
    .getByRole("button", { name: "Restore defaults for this tab", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Sentence style", exact: true }),
  ).toHaveValue("natural");
  await page
    .getByRole("button", { name: "Save personalization", exact: true })
    .click();
  await page.getByRole("tab", { name: "General", exact: true }).click();
  await expect(page.getByLabel("Preferred name", { exact: true })).toHaveValue(
    "Amma",
  );
  expect(await spokenCalls(page)).toEqual([]);
});
