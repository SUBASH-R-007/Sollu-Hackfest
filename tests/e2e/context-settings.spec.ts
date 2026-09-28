import type { Page } from "@playwright/test";
import type { Settings } from "../../apps/web/src/db";
import {
  test,
  expect,
  openCaregiverSettings,
  unlockCaregiver,
  spokenCalls,
  startTyped,
} from "./helpers";

async function openContext(page: Page) {
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Context engine", exact: true }).click();
}
async function settingsOnDevice(page: Page): Promise<Settings> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sollu");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const request = database
        .transaction("kv", "readonly")
        .objectStore("kv")
        .get("settings");
      return await new Promise<Settings>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result.value);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
}
async function setContextClock(page: Page) {
  await page
    .getByRole("combobox", { name: "Clock source", exact: true })
    .selectOption("demo");
  await page.getByLabel("Demo starting time", { exact: true }).fill("12:55");
  await page
    .getByRole("combobox", { name: "Current place", exact: true })
    .selectOption("clinic");
  await page
    .getByRole("combobox", { name: "Routine time window", exact: true })
    .selectOption("15");
  await page
    .getByRole("button", { name: "Save context settings", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Context settings saved" }),
  ).toBeVisible();
}
async function addRoutine(page: Page, label: string, reviewed: boolean) {
  await page.getByRole("button", { name: "Add routine", exact: true }).click();
  await page.getByLabel("Activity", { exact: true }).fill(label);
  await page
    .getByRole("combobox", { name: "Routine topic", exact: true })
    .selectOption("drink");
  await page.getByLabel("Routine time", { exact: true }).fill("13:00");
  await page
    .getByRole("combobox", { name: "Routine place", exact: true })
    .selectOption("clinic");
  const today = await page.evaluate(() => new Date().getDay());
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  for (let index = 0; index < days.length; index++)
    if (index !== today)
      await page.getByLabel(days[index]!, { exact: true }).uncheck();
  if (reviewed)
    await page.getByLabel("Reviewed with the person", { exact: true }).check();
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  await expect(page.getByRole("group", { name: "Routine editor" })).toHaveCount(
    0,
  );
  return today;
}

test("context preferences and reviewed weekly routines persist with day and place limits", async ({
  page,
}) => {
  await openContext(page);
  await expect(
    page.getByLabel("Use personal context and communication preferences", {
      exact: true,
    }),
  ).not.toBeChecked();
  await setContextClock(page);
  const day = await addRoutine(page, "Tea in the clinic garden", false);
  const preview = page.getByLabel("Nearby routine preview");
  await expect(preview).not.toContainText("Tea in the clinic garden");
  let saved = await settingsOnDevice(page);
  expect(saved).toMatchObject({
    demo: true,
    demoTime: "12:55",
    place: "clinic",
    routineWindowMinutes: 15,
    sharePersonalContext: false,
  });
  expect(
    saved.routines.find(
      (routine) => routine.label === "Tea in the clinic garden",
    ),
  ).toMatchObject({ days: [day], place: "clinic", confirmed: false });
  await page
    .getByRole("button", {
      name: "Edit routine: Tea in the clinic garden",
      exact: true,
    })
    .click();
  await page.getByLabel("Reviewed with the person", { exact: true }).check();
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  await expect(preview).toContainText("Tea in the clinic garden");
  const anchor = (await settingsOnDevice(page)).demoSetAt;
  await page
    .getByRole("combobox", { name: "Current place", exact: true })
    .selectOption("home");
  await expect(preview).not.toContainText("Tea in the clinic garden");
  await page
    .getByLabel("Use current time for sentence suggestions", { exact: true })
    .uncheck();
  await expect(preview).toContainText("Enable time context");
  await page
    .getByRole("button", { name: "Save context settings", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Context settings saved" }),
  ).toBeVisible();
  await page.reload();
  await unlockCaregiver(page);
  await expect(
    page.getByLabel("Use current time for sentence suggestions", {
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("combobox", { name: "Current place", exact: true }),
  ).toHaveValue("home");
  saved = await settingsOnDevice(page);
  expect(saved.demoSetAt).toBe(anchor);
  expect(
    saved.routines.find(
      (routine) => routine.label === "Tea in the clinic garden",
    ),
  ).toMatchObject({ confirmed: true, isSample: false });
  expect(await spokenCalls(page)).toEqual([]);
});

test("routine validation, fresh review and delete undo protect the saved schedule", async ({
  page,
}) => {
  await openContext(page);
  await page.getByRole("button", { name: "Add routine", exact: true }).click();
  await page.getByLabel("Activity", { exact: true }).fill("Afternoon music");
  const editor = page.getByRole("group", { name: "Routine editor" });
  for (const day of [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ])
    await page.getByLabel(day, { exact: true }).uncheck();
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "at least one day" }),
  ).toBeVisible();
  expect(
    (await settingsOnDevice(page)).routines.some(
      (routine) => routine.label === "Afternoon music",
    ),
  ).toBe(false);
  await page.getByLabel("Monday", { exact: true }).check();
  await page.getByLabel("Reviewed with the person", { exact: true }).check();
  await page
    .getByRole("combobox", { name: "Routine topic", exact: true })
    .selectOption("tv_phone");
  await expect(
    page.getByLabel("Reviewed with the person", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Reviewed with the person", { exact: true }).check();
  // Saving again respects the deliberate repeated-tap filter.
  await page.waitForTimeout(425);
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Delete routine: Afternoon music",
      exact: true,
    })
    .click();
  expect(
    (await settingsOnDevice(page)).routines.some(
      (routine) => routine.label === "Afternoon music",
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Undo delete: Afternoon music", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Edit routine: Afternoon music",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit routine: Afternoon music", exact: true })
    .click();
  await expect(
    page.getByLabel("Reviewed with the person", { exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Cancel routine edit", exact: true })
    .click();
  expect(
    (await settingsOnDevice(page)).routines.find(
      (routine) => routine.label === "Afternoon music",
    )?.confirmed,
  ).toBe(true);
  expect(await spokenCalls(page)).toEqual([]);
});

test("personal context reaches sentence requests only after caregiver permission", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/intent", async (route) => {
    requests.push(
      (route.request().postDataJSON() as { context: Record<string, unknown> })
        .context,
    );
    await route.fulfill({
      json: {
        candidates: [],
        model: "mock-deterministic-v2",
        latencyMs: 1,
        mock: true,
      },
    });
  });
  await openContext(page);
  await setContextClock(page);
  await addRoutine(page, "Tea in the clinic garden", true);
  await startTyped(page, "tea");
  expect(requests).toHaveLength(1);
  expect(requests[0]).not.toHaveProperty("routine");
  expect(requests[0]).not.toHaveProperty("place");
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await openContext(page);
  await page
    .getByLabel("Use personal context and communication preferences", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Save context settings", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Context settings saved" }),
  ).toBeVisible();
  await startTyped(page, "tea please");
  expect(requests).toHaveLength(2);
  expect(requests[1]).toMatchObject({
    place: "clinic",
    routine: {
      dueNow: expect.arrayContaining([
        expect.objectContaining({
          label: "Tea in the clinic garden",
          topic: "drink",
          time: "13:00",
        }),
      ]),
    },
  });
  expect(await spokenCalls(page)).toEqual([]);
});
