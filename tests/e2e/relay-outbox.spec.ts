import {
  test,
  expect,
  installSpeechHarness,
  openCaregiverSettings,
  clickAndWaitForSpeech,
  spokenCalls,
  assertTrustedPlayback,
} from "./helpers";

test("an offline patient message remains encrypted locally and is removed only after caregiver receipt", async ({
  page,
  context,
  browser,
}) => {
  // Keep real WebSockets; retaining references lets the test end the existing connection
  // when Chromium's offline emulation leaves an already-established socket open.
  await openCaregiverSettings(page);
  // openCaregiverSettings navigates the document, so instrument before pairing is created.
  await page.evaluate(() => {
    const original = window.WebSocket;
    const sockets: WebSocket[] = [];
    (window as unknown as { __relaySockets: WebSocket[] }).__relaySockets =
      sockets;
    window.WebSocket = class extends original {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        sockets.push(this);
      }
    };
  });
  await page.getByRole("tab", { name: "Link phones" }).click();
  await page.getByRole("button", { name: "Create caregiver link" }).click();
  await expect(page.getByLabel("Private pairing link")).toBeVisible();
  const link = await page.getByLabel("Private pairing link").inputValue();
  const caregiver = await browser.newContext({
    baseURL: "http://localhost:5173",
    viewport: { width: 390, height: 844 },
  });
  await installSpeechHarness(caregiver);
  const care = await caregiver.newPage();
  const queue = () =>
    page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("sollu");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise<{ id: string; type: string; frame: string }[]>(
          (resolve, reject) => {
            const request = database
              .transaction("kv", "readonly")
              .objectStore("kv")
              .getAll();
            request.onsuccess = () =>
              resolve(
                request.result
                  .filter(
                    (row: { key: string }) =>
                      row.key.startsWith("relay-outbox:v1:") &&
                      row.key.endsWith(":patient"),
                  )
                  .flatMap(
                    (row: {
                      value: {
                        entries: { id: string; type: string; frame: string }[];
                      };
                    }) => row.value.entries,
                  ),
              );
            request.onerror = () => reject(request.error);
          },
        );
      } finally {
        database.close();
      }
    });
  try {
    await care.goto(link);
    await expect(care.locator(".connection-badge")).toHaveText(/Connected/);
    await page
      .getByRole("button", { name: "Back to Home", exact: true })
      .click();
    await context.setOffline(true);
    await page.evaluate(() =>
      (
        window as unknown as { __relaySockets: WebSocket[] }
      ).__relaySockets.forEach((socket) => socket.close()),
    );
    await clickAndWaitForSpeech(page, page.locator(".quick-wait"));
    await expect(page.locator(".delivery-status")).toContainText(/queued/i);
    await expect.poll(async () => (await queue()).length).toBe(1);
    const saved = (await queue())[0],
      chosen = (await spokenCalls(page))[0].text;
    expect(saved.type).toBe("spoken");
    expect(JSON.stringify(saved)).not.toContain(chosen);
    expect(Object.keys(JSON.parse(saved.frame)).sort()).toEqual([
      "ciphertext",
      "iv",
      "v",
    ]);
    await expect(care.locator(".care-latest .care-sentence")).toHaveCount(0);
    await context.setOffline(false);
    await expect(care.locator(".care-latest .care-sentence")).toHaveText(
      chosen,
    );
    await expect(page.locator(".delivery-status")).toContainText(/Shown on/);
    await expect.poll(async () => (await queue()).length).toBe(0);
    expect(await spokenCalls(care)).toEqual([]);
    await assertTrustedPlayback(page);
  } finally {
    await context.setOffline(false);
    await caregiver.close();
  }
});
