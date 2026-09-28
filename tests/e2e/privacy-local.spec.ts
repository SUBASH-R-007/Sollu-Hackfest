import {
  test,
  expect,
  openCaregiverSettings,
  unlockCaregiver,
  spokenCalls,
  startTyped,
  candidates,
} from "./helpers";

test("default privacy blocks cloud choices and persists after reload", async ({
  page,
}) => {
  // Exercise a server that prohibits cloud use, independently of the local operator's .env.
  await page.route("**/api/llm/settings", async (route) => {
    const response = await route.fetch();
    const config = await response.json();
    await route.fulfill({
      json: {
        ...config,
        policy: { mode: "local-only", allowCloudAI: false },
        providers: config.providers.map(
          (provider: { requiresKey: boolean }) => ({
            ...provider,
            available: !provider.requiresKey,
          }),
        ),
      },
    });
  });
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).hostname !== "localhost"
    )
      external.push(request.url());
  });
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Privacy", exact: true }).click();
  await expect(
    page.getByLabel("Require local speech, voices and camera models"),
  ).toBeChecked();
  await expect(
    page.getByText("Blocked by server policy, including OpenAI.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.reload();
  await unlockCaregiver(page);
  await expect(
    page.getByLabel("Require local speech, voices and camera models"),
  ).toBeChecked();
  await page.getByRole("tab", { name: "Sentence engine", exact: true }).click();
  await expect(page.locator('select option[value="openai"]')).toHaveJSProperty(
    "disabled",
    true,
  );
  await expect(page.locator('select option[value="ollama"]')).toHaveJSProperty(
    "disabled",
    false,
  );
  await page.goto("/");
  let localOnly: unknown;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/intent"))
      localOnly = request.postDataJSON()?.localOnly;
  });
  await startTyped(page, "water please");
  await expect(candidates(page).first()).toBeVisible();
  expect(localOnly).toBe(true);
  expect(await spokenCalls(page)).toEqual([]);
  expect(external).toEqual([]);
});

test("revoking online services updates another tab and survives its unrelated settings save", async ({
  page,
  context,
}) => {
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Privacy", exact: true }).click();
  const protection = page.getByLabel(
    "Require local speech, voices and camera models",
  );
  await protection.click();
  await expect(protection).not.toBeChecked();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("sollu:local-processing-only:v1"),
      ),
    )
    .toBe("online");
  const second = await context.newPage();
  try {
    await second.goto("/settings?tab=privacy");
    await unlockCaregiver(second);
    await expect(
      second.getByLabel("Require local speech, voices and camera models"),
    ).not.toBeChecked();
    await protection.check();
    await expect(
      second.getByLabel("Require local speech, voices and camera models"),
    ).toBeChecked();
    await second.getByRole("tab", { name: "General", exact: true }).click();
    await second
      .getByLabel("Preferred name", { exact: true })
      .fill("Fictional privacy check");
    await second
      .getByRole("button", { name: "Save settings", exact: true })
      .click();
    await second.getByRole("tab", { name: "Privacy", exact: true }).click();
    await expect(
      second.getByLabel("Require local speech, voices and camera models"),
    ).toBeChecked();
    expect(
      await second.evaluate(() =>
        localStorage.getItem("sollu:local-processing-only:v1"),
      ),
    ).not.toBe("online");
    expect(await spokenCalls(second)).toEqual([]);
  } finally {
    await second.close();
  }
});

test("legacy browser recognition cannot start with local-only protection", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class Legacy {
      start() {
        window.__solluSpeech.recognitionStarts++;
      }
      abort() {}
      stop() {}
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: Legacy,
      configurable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: Legacy,
      configurable: true,
    });
  });
  await page.goto("/speak");
  await expect(
    page.getByText("This browser has no supported on-device recognizer.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.__solluSpeech.recognitionStarts),
  ).toBe(0);
  expect(await spokenCalls(page)).toEqual([]);
});

test("remote-only voices never speak in default local mode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.speechSynthesis, "getVoices", {
      value: () => [
        { name: "Remote test voice", lang: "en-IN", localService: false },
      ],
      configurable: true,
    });
  });
  await page.goto("/people");
  await page.getByRole("button", { name: /Dr\. Rao/ }).click();
  await startTyped(page, "water please");
  await candidates(page).first().click();
  await expect(page).toHaveURL(/\/speaking/);
  await expect(page.getByRole("status")).toContainText(
    "Show this sentence to the person",
  );
  expect(await spokenCalls(page)).toEqual([]);
});
