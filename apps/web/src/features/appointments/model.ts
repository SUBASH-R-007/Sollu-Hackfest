export type AppointmentMode = "in_person" | "video" | "phone";
export type AppointmentStatus = "requested" | "confirmed" | "cancelled";
export type AppointmentDuration = 15 | 30 | 45 | 60;

export interface AppointmentDetails {
  clinician: string;
  startsAt: number;
  durationMinutes: AppointmentDuration;
  mode: AppointmentMode;
  location?: string;
  bookingUrl?: string;
}

export interface Appointment extends AppointmentDetails {
  id: string;
  status: AppointmentStatus;
  createdAt: number;
}

export interface AppointmentForm {
  clinician: string;
  date: string;
  time: string;
  durationMinutes: number;
  mode: string;
  location?: string;
  bookingUrl?: string;
}

function textField(
  value: unknown,
  label: string,
  max: number,
  required = false,
) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string") throw new Error(`Enter a valid ${label}.`);
  const text = value.trim();
  if (required && !text) throw new Error(`Enter the ${label}.`);
  if (text.length > max)
    throw new Error(`Keep the ${label} within ${max} characters.`);
  if (
    [...text].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    throw new Error(
      `Remove line breaks and control characters from the ${label}.`,
    );
  return text || undefined;
}

/** Validate a proposed local appointment; this does not establish clinic availability. */
export function parseAppointment(
  input: AppointmentForm,
  now = Date.now(),
): AppointmentDetails {
  const clinician = textField(
    input.clinician,
    "clinician or clinic name",
    120,
    true,
  )!;
  const location = textField(
    input.location,
    "location or meeting details",
    300,
  );
  const bookingUrl = textField(input.bookingUrl, "booking link", 2048);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !/^\d{2}:\d{2}$/.test(input.time)
  )
    throw new Error("Choose a valid appointment date and time.");
  const [year, month, day] = input.date.split("-").map(Number);
  const [hours, minutes] = input.time.split(":").map(Number);
  const start = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (
    year < 1000 ||
    start.getFullYear() !== year ||
    start.getMonth() !== month - 1 ||
    start.getDate() !== day ||
    start.getHours() !== hours ||
    start.getMinutes() !== minutes
  )
    throw new Error(
      "Choose a valid appointment date and time for your device's time zone.",
    );
  const startsAt = start.getTime();
  if (!Number.isFinite(now) || startsAt <= now)
    throw new Error("Choose an appointment date and time in the future.");
  if (![15, 30, 45, 60].includes(input.durationMinutes))
    throw new Error("Choose a duration of 15, 30, 45, or 60 minutes.");
  if (!["in_person", "video", "phone"].includes(input.mode))
    throw new Error("Choose an in-person, video, or phone appointment.");
  if (
    new Date(startsAt + input.durationMinutes * 60_000).getUTCFullYear() > 9999
  )
    throw new Error("Choose an earlier appointment date.");
  if (bookingUrl) {
    let url: URL;
    try {
      url = new URL(bookingUrl);
    } catch {
      throw new Error("Enter a complete HTTPS booking link.");
    }
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password
    )
      throw new Error(
        "Use an HTTPS booking link without an embedded username or password.",
      );
  }
  return {
    clinician,
    startsAt,
    durationMinutes: input.durationMinutes as AppointmentDuration,
    mode: input.mode as AppointmentMode,
    ...(location ? { location } : {}),
    ...(bookingUrl ? { bookingUrl } : {}),
  };
}

const calendarText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

const calendarDate = (timestamp: number) =>
  new Date(timestamp)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

function foldCalendarLine(line: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = "";
  let bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      lines.push(current);
      current = " ";
      bytes = 1;
    }
    current += character;
    bytes += size;
  }
  lines.push(current);
  return lines.join("\r\n");
}

/** Calendar export only: importing this file neither books nor cancels with a clinic. */
export function appointmentCalendar(appointment: Appointment): string {
  const status = {
    requested: "TENTATIVE",
    confirmed: "CONFIRMED",
    cancelled: "CANCELLED",
  }[appointment.status];
  const mode = { in_person: "In person", video: "Video", phone: "Phone" }[
    appointment.mode
  ];
  const description = [
    `${mode} appointment.`,
    appointment.status === "requested"
      ? "Requested time saved in Sollu. Confirm availability directly with the clinician."
      : appointment.status === "cancelled"
        ? "Marked cancelled in Sollu. Contact the clinician to cancel the clinic booking."
        : "Marked confirmed by the user in Sollu.",
    ...(appointment.bookingUrl
      ? [`Booking link: ${appointment.bookingUrl}`]
      : []),
  ].join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sollu//Local appointments//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${encodeURIComponent(appointment.id)}@sollu.local`,
    `DTSTAMP:${calendarDate(appointment.createdAt)}`,
    `DTSTART:${calendarDate(appointment.startsAt)}`,
    `DTEND:${calendarDate(appointment.startsAt + appointment.durationMinutes * 60_000)}`,
    `SUMMARY:${calendarText(`Appointment with ${appointment.clinician}`)}`,
    `DESCRIPTION:${calendarText(description)}`,
    ...(appointment.location
      ? [`LOCATION:${calendarText(appointment.location)}`]
      : []),
    `STATUS:${status}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldCalendarLine).join("\r\n") + "\r\n";
}
