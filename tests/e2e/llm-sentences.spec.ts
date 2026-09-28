import {
  ContextPacketSchema,
  modelContextKey,
  modelMeaningKey,
  type ContextPacket,
  type Candidate,
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
