import { describe, expect, it } from "vitest";
import {
  appointmentCalendar,
  parseAppointment,
  type Appointment,
  type AppointmentForm,
} from "./model";

const now = new Date(2030, 0, 1, 9, 0).getTime();
const form: AppointmentForm = {
  clinician: "  Sample speech clinic  ",
  date: "2030-01-02",
  time: "10:30",
  durationMinutes: 30,
  mode: "video",
  location: "  Online  ",
  bookingUrl: "https://example.org/book",
};

describe("local appointment validation", () => {
  it("interprets device-local time and trims optional fields without confirming availability", () => {
    expect(parseAppointment(form, now)).toEqual({
      clinician: "Sample speech clinic",
      startsAt: new Date(2030, 0, 2, 10, 30).getTime(),
      durationMinutes: 30,
      mode: "video",
      location: "Online",
      bookingUrl: "https://example.org/book",
    });
    expect(
      parseAppointment({ ...form, location: " ", bookingUrl: "" }, now),
    ).not.toHaveProperty("bookingUrl");
  });

  it.each(["2029-12-31", "2030-01-01"])(
    "rejects a past or current time on %s",
    (date) => {
      expect(() =>
        parseAppointment({ ...form, date, time: "09:00" }, now),
      ).toThrow(/future/);
    },
  );

  it.each([
    "2030-02-29",
    "2030-04-31",
    "2030-13-01",
    "2030-00-01",
    "2030-01-00",
    "2030-1-2",
  ])("rejects invalid calendar date %s", (date) => {
    expect(() => parseAppointment({ ...form, date }, now)).toThrow(
      /valid appointment date/,
    );
  });

  it("accepts a real leap day", () => {
    expect(
      parseAppointment({ ...form, date: "2032-02-29" }, now).startsAt,
    ).toBe(new Date(2032, 1, 29, 10, 30).getTime());
  });

  it.each(["24:00", "10:60", "-1:30", "9:30", "10:30:00"])(
    "rejects invalid time %s",
    (time) => {
      expect(() => parseAppointment({ ...form, time }, now)).toThrow(
        /valid appointment date/,
      );
    },
  );

  it.each([
    "http://example.org",
    "javascript:alert(1)",
    "https://name:secret@example.org/book",
    "https://name@example.org",
    "example.org",
    "https://",
  ])("rejects an unsafe or incomplete booking URL %s", (bookingUrl) => {
    expect(() => parseAppointment({ ...form, bookingUrl }, now)).toThrow(
      /HTTPS/,
    );
  });

  it("requires a name and supported duration and mode", () => {
    expect(() => parseAppointment({ ...form, clinician: " " }, now)).toThrow(
      /clinician/,
    );
    expect(() =>
      parseAppointment({ ...form, clinician: "a".repeat(121) }, now),
    ).toThrow(/120/);
    expect(() =>
      parseAppointment({ ...form, location: "a".repeat(301) }, now),
    ).toThrow(/300/);
    expect(() =>
      parseAppointment(
        { ...form, bookingUrl: `https://example.org/${"a".repeat(2048)}` },
        now,
      ),
    ).toThrow(/2048/);
    expect(() =>
      parseAppointment({ ...form, clinician: "Clinic\nInjected" }, now),
    ).toThrow(/control characters/);
    expect(() =>
      parseAppointment({ ...form, durationMinutes: 20 }, now),
    ).toThrow(/duration/);
    expect(() => parseAppointment({ ...form, mode: "unknown" }, now)).toThrow(
      /in-person/,
    );
  });
});

describe("appointment calendar export", () => {
  const appointment: Appointment = {
    id: "stable-id",
    clinician: "Speech, clinic; team\\name",
    startsAt: Date.UTC(2030, 0, 2, 10, 30),
    createdAt: Date.UTC(2030, 0, 1, 9),
    durationMinutes: 30,
    mode: "in_person",
    location: "Room 1\nMain; building, entrance",
    status: "requested",
  };

  it("exports UTC times, stable identity, escaped fields and CRLF without creating injected properties", () => {
    const calendar = appointmentCalendar(appointment);
    expect(calendar).toContain("UID:stable-id@sollu.local\r\n");
    expect(calendar).toContain("DTSTAMP:20300101T090000Z\r\n");
    expect(calendar).toContain(
      "DTSTART:20300102T103000Z\r\nDTEND:20300102T110000Z",
    );
    expect(calendar).toContain(
      "SUMMARY:Appointment with Speech\\, clinic\\; team\\\\name\r\n",
    );
    expect(calendar).toContain(
      "LOCATION:Room 1\\nMain\\; building\\, entrance\r\n",
    );
    expect(calendar).toContain("STATUS:TENTATIVE\r\n");
    expect(calendar.replace(/\r\n /g, "")).toContain(
      "Confirm availability directly with the clinician.",
    );
    expect(calendar.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(calendar).toMatch(/END:VCALENDAR\r\n$/);
  });

  it.each([
    ["confirmed", "CONFIRMED"],
    ["cancelled", "CANCELLED"],
  ] as const)("exports %s with the same UID", (status, expected) => {
    const calendar = appointmentCalendar({ ...appointment, status });
    expect(calendar).toContain(`STATUS:${expected}\r\n`);
    expect(calendar).toContain("UID:stable-id@sollu.local\r\n");
  });

  it("folds long Unicode lines at 75 UTF-8 octets and preserves content after unfolding", () => {
    const clinician = "மருத்துவர் ".repeat(12);
    const calendar = appointmentCalendar({ ...appointment, clinician });
    for (const line of calendar.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(calendar.replace(/\r\n /g, "")).toContain(
      `SUMMARY:Appointment with ${clinician}\r\n`,
    );
  });
});
