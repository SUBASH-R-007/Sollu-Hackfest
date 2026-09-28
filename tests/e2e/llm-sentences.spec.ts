import {
  ContextPacketSchema,
  modelContextKey,
  modelMeaningKey,
  type ContextPacket,
  type Candidate,
  deriveContextSignals,
} from "../../packages/shared/src/index";
import {
  test,
  expect,
  startTyped,
  spokenCalls,
  assertTrustedPlayback,
  candidates,
  readAttempts,
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
