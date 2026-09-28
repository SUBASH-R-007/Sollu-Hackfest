import {
  ContextPacketSchema,
  applyCandidatePolicy,
  candidateMeaningKey,
  getMockCandidates,
  modelContextKey,
  modelMeaningKey,
  type ContextPacket,
  type Candidate,
  deriveContextSignals,
} from "../../packages/shared/src/index";
import type { Page } from "@playwright/test";
import {
  test,
  expect,
  startTyped,
  spokenCalls,
  assertTrustedPlayback,
  candidates,
  readAttempts,
  openCaregiverSettings,
  unlockCaregiver,
  checkTargetSizes,
} from "./helpers";

function generated(
  context: ContextPacket,
  text: string,
  negative = false,
): Candidate {
  return {
    text,
    gloss_en: text,
    reading: context.fragment.raw.slice(0, 40),
    intent: negative ? "refuse" : "request",
    keyword: "garden",
    icon: "💬",
    urgency: "none",
    source: "model",
    lang: "en",
    speechAct: negative ? "refuse" : "request",
    polarity: negative ? "negative" : "positive",
    sig: "synthetic-server-response-for-browser-test",
    modelReview: {
      version: "contextual-v1",
      contextKey: modelContextKey(context),
      meaningKey: modelMeaningKey(
        text,
        negative ? "negative" : "positive",
        "none",
      ),
      evidence: [
        {
          path: "fragment.raw",
          quote: context.fragment.raw,
          translation_en: "",
        },
      ],
    },
  };
}

test("a contextual sentence beyond the catalog stays silent until the exact patient tap", async ({
  page,
}) => {
  let transmitted: ContextPacket | undefined;
  await page.route("**/api/intent", async (route) => {
    transmitted = ContextPacketSchema.parse(
      route.request().postDataJSON().context,
    );
    const c = generated(
      transmitted,
      "I want to visit my sister in the garden tomorrow.",
    );
    await route.fulfill({
      json: {
        candidates: [c],
        model: "openai:synthetic-test · contextual suggestions",
        latencyMs: 10,
      },
    });
  });
  await page.goto("/people");
  await page.getByRole("button", { name: /Dr\. Rao/ }).click();
  await startTyped(page, "want visit sister garden tomorrow");
  await expect(candidates(page)).toHaveCount(1);
  await expect(candidates(page)).toContainText("AI draft · Check the meaning");
  await expect(candidates(page)).toContainText(
    "I want to visit my sister in the garden tomorrow.",
  );
  expect(transmitted?.people).toBeUndefined();
  expect(transmitted?.speaker).toBeUndefined();
  expect(transmitted?.recentTurns).toEqual([]);
  expect(await spokenCalls(page)).toEqual([]);
  await candidates(page).first().click();
  await expect.poll(async () => (await spokenCalls(page)).length).toBe(1);
  expect((await spokenCalls(page))[0].text).toBe(
    "I want to visit my sister in the garden tomorrow.",
  );
  await assertTrustedPlayback(page);
  const attempts = await readAttempts(page);
  expect(
    attempts.find((a) => a.chosenText?.includes("sister"))?.rounds[0].source,
  ).toBe("llm");
});

test("time and reviewed place-specific routine resolve a usual drink without automatic speech", async ({
  page,
}) => {
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
          value: {
            ...request.result.value,
            addressee: "rao",
            place: "home",
            sharePersonalContext: true,
            demo: true,
            demoTime: "07:00",
            demoSetAt: Date.now(),
            routines: [
              {
                id: "coffee",
                label: "Morning coffee",
                topic: "drink",
                time: "07:00",
                days: [0, 1, 2, 3, 4, 5, 6],
                place: "home",
                source: "caregiver",
                confirmed: true,
              },
              {
                id: "tea",
                label: "Clinic tea",
                topic: "drink",
                time: "07:00",
                days: [0, 1, 2, 3, 4, 5, 6],
                place: "clinic",
                source: "caregiver",
                confirmed: true,
              },
              {
                id: "juice",
                label: "Morning juice",
                topic: "drink",
                time: "07:00",
                days: [0, 1, 2, 3, 4, 5, 6],
                place: "home",
                source: "caregiver",
                confirmed: false,
              },
            ],
          },
        });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
  let transmitted: ContextPacket | undefined;
  await page.route("**/api/intent", async (route) => {
    const context = ContextPacketSchema.parse(
      route.request().postDataJSON().context,
    );
    transmitted = context;
    const signal = deriveContextSignals(context).routines.find(
      (routine) => routine.mayResolveReference,
    );
    expect(signal?.label).toBe("Morning coffee");
    const c = generated(context, "I want my usual morning coffee.");
    c.modelReview!.evidence.push({
      path: `${signal!.path}.label`,
      quote: signal!.label,
      translation_en: "",
    });
    await route.fulfill({
      json: {
        candidates: [c],
        model: "openai:synthetic-context-test",
        latencyMs: 10,
      },
    });
  });
  await startTyped(page, "want usual drink");
  await expect(candidates(page)).toHaveCount(1);
  await expect(candidates(page)).toContainText(
    "I want my usual morning coffee.",
  );
  expect(transmitted?.now?.localTime).toBe("07:00");
  expect(transmitted?.place).toBe("home");
  expect(JSON.stringify(transmitted?.routine)).not.toMatch(
    /Clinic tea|Morning juice/,
  );
  await page.locator(".context-summary summary").click();
  await expect(page.locator(".context-summary")).toContainText(
    "Morning coffee",
  );
  await expect(page.locator(".context-summary")).toContainText("Demo time");
  expect(await spokenCalls(page)).toEqual([]);
  await candidates(page).first().click();
  await expect.poll(async () => (await spokenCalls(page)).length).toBe(1);
  expect((await spokenCalls(page))[0].text).toBe(
    "I want my usual morning coffee.",
  );
  await assertTrustedPlayback(page);
});

test("a refused generated meaning cannot return after None of these", async ({
  page,
}) => {
  await page.route("**/api/intent", async (route) => {
    const context = ContextPacketSchema.parse(
      route.request().postDataJSON().context,
    );
    const c = generated(
      context,
      "I do not want to visit the garden tomorrow.",
      true,
    );
    await route.fulfill({
      json: { candidates: [c], model: "openai:synthetic-test", latencyMs: 10 },
    });
  });
  await page.goto("/people");
  await page.getByRole("button", { name: /Dr\. Rao/ }).click();
  await startTyped(page, "not want visit garden tomorrow");
  await expect(candidates(page)).toHaveCount(1);
  await expect(candidates(page)).toContainText("do not want");
  await page.getByRole("button", { name: "None of these" }).click();
  await expect(page.locator(".candidate-list")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(candidates(page)).toHaveCount(0);
  expect(await spokenCalls(page)).toEqual([]);
});

test("a model source label without a current signed response does not authorize a suggestion", async ({
  page,
}) => {
  await page.route("**/api/intent", async (route) => {
    const context = ContextPacketSchema.parse(
      route.request().postDataJSON().context,
    );
    const c = generated(context, "I want to visit the garden tomorrow.");
    delete c.sig;
    await route.fulfill({
      json: {
        candidates: [c],
        model: "untrusted synthetic response",
        latencyMs: 10,
      },
    });
  });
  await page.goto("/people");
  await page.getByRole("button", { name: /Dr\. Rao/ }).click();
  await startTyped(page, "want visit garden tomorrow");
  await expect(candidates(page)).toHaveCount(0);
  expect(await spokenCalls(page)).toEqual([]);
});

async function mixedApiChoices(page: Page) {
  // Keep the furniture fixture independent of the demo's private night-tablet routine.
  // That routine is deliberately omitted from API context and can change local table matches.
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("kv", "readwrite");
        const table = transaction.objectStore("kv");
        const request = table.get("settings");
        request.onsuccess = () =>
          table.put({
            key: "settings",
            value: { ...request.result.value, routines: [] },
          });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  });
  await page.reload();
  const requests: ContextPacket[] = [];
  const offered: Candidate[][] = [];
  await page.route("**/api/intent", async (route) => {
    const context = ContextPacketSchema.parse(
      route.request().postDataJSON().context,
    );
    requests.push(context);
    const draft = generated(context, "I want the table.");
    draft.keyword = "table";
    const choices =
      context.round === 1
        ? applyCandidatePolicy(
            [draft, ...getMockCandidates(context)],
            context,
            {
              serverGeneratedCandidates: [draft],
            },
          ).candidates
        : [];
    offered.push(choices);
    if (context.round === 1) {
      expect(choices).toHaveLength(3);
      expect(choices.map((item) => item.source)).toEqual([
        "model",
        "catalog",
        "catalog",
      ]);
    }
    await route.fulfill({
      json: {
        candidates: choices,
        model:
          "openai:synthetic-test · contextual suggestions + prepared alternatives",
        latencyMs: 10,
      },
    });
  });
  return { requests, offered };
}

async function showOneChoice(page: Page) {
  await openCaregiverSettings(page);
  await page
    .getByRole("combobox", { name: "Choices shown at once", exact: true })
    .selectOption("1");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByText("Settings saved on this device.", { exact: true }),
  ).toBeVisible();
}

async function startTableChoices(page: Page) {
  await page.goto("/people");
  await page.getByRole("button", { name: /Dr\. Rao/ }).click();
  await startTyped(page, "table");
}

test("three distinct API options stay silent and only the exact selected option speaks", async ({
  page,
}) => {
  const fixture = await mixedApiChoices(page);
  await startTableChoices(page);
  await expect(candidates(page)).toHaveCount(3);
  await expect(candidates(page).first()).toContainText(
    "AI draft · Check the meaning",
  );
  await expect(candidates(page).nth(1)).toContainText(
    "Prepared option · Check the meaning",
  );
  await expect(candidates(page).nth(2)).toContainText(
    "Prepared option · Check the meaning",
  );
  expect(new Set(fixture.offered[0].map(candidateMeaningKey)).size).toBe(3);
  expect(fixture.requests).toHaveLength(1);
  expect(await spokenCalls(page)).toEqual([]);
  await checkTargetSizes(page);
  await page.screenshot({
    path: "docs/evidence/v9/api-options-390.png",
    fullPage: true,
  });
  const selected = fixture.offered[0][2].text;
  await candidates(page).nth(2).click();
  await expect.poll(async () => (await spokenCalls(page)).length).toBe(1);
  expect((await spokenCalls(page))[0].text).toBe(selected);
  await assertTrustedPlayback(page);
  await expect.poll(async () => (await readAttempts(page)).length).toBe(1);
  const [attempt] = await readAttempts(page);
  expect(attempt.chosenText).toBe(selected);
  expect(attempt.rounds[0].candidates.map((item) => item.text)).toEqual(
    fixture.offered[0].map((item) => item.text),
  );
});

test("a one-choice preference can reveal remaining API options without speech or another request", async ({
  page,
}) => {
  await showOneChoice(page);
  const fixture = await mixedApiChoices(page);
  await startTableChoices(page);
  await expect(candidates(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Show more options", exact: true }),
  ).toBeVisible();
  expect(await spokenCalls(page)).toEqual([]);
  await page
    .getByRole("button", { name: "Show more options", exact: true })
    .click();
  await expect(candidates(page)).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Show more options", exact: true }),
  ).toHaveCount(0);
  expect(fixture.requests).toHaveLength(1);
  expect(await spokenCalls(page)).toEqual([]);
  const selected = fixture.offered[0][1].text;
  await candidates(page).nth(1).click();
  await expect.poll(async () => (await spokenCalls(page)).length).toBe(1);
  expect((await spokenCalls(page))[0].text).toBe(selected);
  await assertTrustedPlayback(page);
  await expect.poll(async () => (await readAttempts(page)).length).toBe(1);
  const [attempt] = await readAttempts(page);
  expect(attempt.rounds).toHaveLength(1);
  expect(attempt.rounds[0].candidates).toHaveLength(3);
  expect(attempt.chosenText).toBe(selected);
});

test("None of these rejects only visible API options before more options are revealed", async ({
  page,
}) => {
  await showOneChoice(page);
  const fixture = await mixedApiChoices(page);
  await startTableChoices(page);
  await expect(candidates(page)).toHaveCount(1);
  await page
    .getByRole("button", { name: "None of these", exact: true })
    .click();
  await expect(page.locator(".round-label")).toContainText("Choice round 2");
  await expect(page.locator(".candidate-list")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  expect(fixture.requests).toHaveLength(2);
  expect(fixture.requests[1].exclude).toEqual([fixture.offered[0][0].text]);
  expect(fixture.requests[1].rejectedMeaningKeys).toEqual([
    candidateMeaningKey(fixture.offered[0][0]),
  ]);
  for (const hidden of fixture.offered[0].slice(1)) {
    expect(fixture.requests[1].exclude).not.toContain(hidden.text);
    expect(fixture.requests[1].rejectedMeaningKeys).not.toContain(
      candidateMeaningKey(hidden),
    );
  }
  await expect(candidates(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Show more options", exact: true }),
  ).toHaveCount(0);
  expect(await spokenCalls(page)).toEqual([]);
});

test("revoking online permission in another tab clears visible and hidden API options", async ({
  page,
  context,
}) => {
  await showOneChoice(page);
  await page.getByRole("tab", { name: "Privacy", exact: true }).click();
  const protectionLabel =
    "Require local speech, voices and camera models";
  await page.getByLabel(protectionLabel).uncheck();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("sollu:local-processing-only:v1"),
      ),
    )
    .toBe("online");
  const fixture = await mixedApiChoices(page);
  await startTableChoices(page);
  await expect(candidates(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Show more options", exact: true }),
  ).toBeVisible();
  const settings = await context.newPage();
  try {
    await settings.goto("/settings?tab=privacy");
    await unlockCaregiver(settings);
    await expect(settings.getByLabel(protectionLabel)).not.toBeChecked();
    await settings.getByLabel(protectionLabel).check();
    await expect(candidates(page)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Show more options", exact: true }),
    ).toHaveCount(0);
    expect(fixture.requests).toHaveLength(1);
    expect(await spokenCalls(page)).toEqual([]);
    expect(await spokenCalls(settings)).toEqual([]);
  } finally {
    await settings.close();
  }
});

test("editing the fragment clears both visible and hidden options before returning to confirmation", async ({
  page,
}) => {
  await showOneChoice(page);
  const fixture = await mixedApiChoices(page);
  await startTableChoices(page);
  await expect(candidates(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Show more options", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await page.getByLabel(/Your words/).fill("garden tomorrow");
  await page.goForward();
  await expect(page).toHaveURL(/\/confirm$/);
  await expect(candidates(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Show more options", exact: true }),
  ).toHaveCount(0);
  expect(fixture.requests).toHaveLength(1);
  expect(await spokenCalls(page)).toEqual([]);
});
