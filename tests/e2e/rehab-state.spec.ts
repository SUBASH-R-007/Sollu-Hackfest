import { test, expect, openCaregiverSettings } from "./helpers";

test("an active practice keeps its reference when the caregiver plan changes and erasure clears therapy too", async ({
  page,
}) => {
  await page.goto("/practice");
  await page.getByRole("button", { name: /Please give me time./ }).click();
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open("sollu-rehab");
      req.onsuccess = () => resolve(req.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(["profiles", "plans"], "readwrite");
      tx.objectStore("profiles").put({
        id: "local-patient",
        displayName: "Fictional test",
        condition: "other",
        language: "ta",
        communicationMethod: "aac",
        goals: [],
        clinicianInstructions: "",
        weeklyTarget: 3,
        practiceMinutes: 3,
        fatigueLimit: 5,
        updatedAt: Date.now(),
      });
      tx.objectStore("plans").put({
        id: "local-plan",
        patientId: "local-patient",
        exerciseIds: [],
        customTargets: ["வேண்டாம்"],
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    database.close();
  });
  await expect(page.locator(".rehab-target")).toHaveText(
    "Please give me time.",
  );
  await page.getByText("Type what was heard instead", { exact: true }).click();
  await page
    .getByLabel("Words actually heard (optional)", { exact: true })
    .fill("Please give me time");
  await page
    .getByRole("checkbox", {
      name: "A person checked that this transcript reflects what was said",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Save practice", exact: true })
    .click();
  await expect(
    page.getByText("Practice saved on this device.", { exact: false }),
  ).toBeVisible();
  const record = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open("sollu-rehab");
      req.onsuccess = () => resolve(req.result);
    });
    const rows = await new Promise<
      { target: string; language: string; communicationMethod: string }[]
    >((resolve) => {
      const req = database
        .transaction("practice")
        .objectStore("practice")
        .getAll();
      req.onsuccess = () => resolve(req.result);
    });
    database.close();
    return rows;
  });
  expect(record[0]).toMatchObject({
    target: "Please give me time.",
    language: "en",
    communicationMethod: "mixed",
  });
  await openCaregiverSettings(page);
  await page.getByRole("tab", { name: "Privacy", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Type DELETE to confirm", exact: true })
    .fill("DELETE");
  await page
    .getByRole("button", { name: "Erase all local data", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  const counts = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open("sollu-rehab");
      req.onsuccess = () => resolve(req.result);
    });
    const counts = await Promise.all(
      ["practice", "profiles", "plans", "media", "reviews"].map(
        (table) =>
          new Promise<number>((resolve) => {
            const req = database.transaction(table).objectStore(table).count();
            req.onsuccess = () => resolve(req.result);
          }),
      ),
    );
    database.close();
    return counts;
  });
  expect(counts).toEqual([0, 0, 0, 0, 0]);
});
