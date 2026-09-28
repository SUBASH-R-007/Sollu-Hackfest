import { expect, test, unlockCaregiver, checkTargetSizes } from "./helpers";

test("appointment requests persist, require clinic confirmation, reschedule and cancel locally", async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date("2026-09-28T12:00:00+05:30"));
  await page.goto("/rehabilitation");
  await page
    .getByRole("button", { name: "Book appointment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Book an appointment", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Clinician or clinic name")
    .fill("Example speech clinic");
  await page.getByLabel("Preferred date").fill("2026-09-30");
  await page.getByLabel("Preferred time").fill("14:00");
  await page.getByLabel("Visit type").selectOption("video");
  await page
    .getByLabel("Location or joining details")
    .fill("Ask clinic for joining details");
  await page.getByLabel("Clinic booking page").fill("https://example.com/book");
  await page.getByRole("button", { name: "Save appointment request" }).click();
  const card = page.getByRole("article", {
    name: "Appointment with Example speech clinic",
  });
  await expect(card).toContainText("Awaiting clinic confirmation");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Request saved on this device" }),
  ).toContainText("nothing has been sent");
  await page.reload();
  await expect(card).toContainText("Video visit");
  await expect(
    card.getByRole("link", { name: "Open clinic booking page" }),
  ).toHaveAttribute("href", "https://example.com/book");
  await checkTargetSizes(page);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: testInfo.outputPath("appointments-mobile.png"),
    fullPage: true,
  });
  await card.getByRole("button", { name: "Clinic has confirmed" }).click();
  await expect(card).toContainText("Clinic confirmation recorded by you");
  const download = page.waitForEvent("download");
  await card.getByRole("button", { name: "Save calendar file" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^sollu-appointment-.*\.ics$/,
  );
  await card.getByRole("button", { name: "Reschedule" }).click();
  await page.getByLabel("Preferred time").fill("15:00");
  await page.getByRole("button", { name: "Save new time" }).click();
  await expect(card).toContainText("Awaiting clinic confirmation");
  await page.goto("/clinician?view=appointments");
  await unlockCaregiver(page);
  await expect(card).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: testInfo.outputPath("appointments-clinician.png"),
    fullPage: true,
  });
  await card.getByRole("button", { name: "Cancel locally" }).click();
  await expect(card).toContainText("Cancelled on this device");
  await expect(
    page.getByRole("status").filter({ hasText: "Cancelled locally" }),
  ).toContainText("Contact your clinic separately");
  await card.getByRole("button", { name: "Remove record" }).click();
  await expect(card).toHaveCount(0);
});

test("overlapping appointments are rejected without saving an extra request", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-09-28T12:00:00+05:30"));
  await page.goto("/appointments");
  async function fill(time: string) {
    await page.getByLabel("Clinician or clinic name").fill("Example clinic");
    await page.getByLabel("Preferred date").fill("2026-09-30");
    await page.getByLabel("Preferred time").fill(time);
    await page
      .getByRole("button", { name: "Save appointment request" })
      .click();
  }
  await fill("14:00");
  await expect(page.getByRole("article")).toHaveCount(1);
  await fill("14:15");
  await expect(page.getByRole("alert")).toContainText(
    "already have a request or appointment",
  );
  await expect(page.getByRole("article")).toHaveCount(1);
});
