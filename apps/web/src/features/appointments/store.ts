import { db } from "../../db";
import type { Appointment, AppointmentDetails } from "./model";

const prefix = "appointment:";

export async function listAppointments(): Promise<Appointment[]> {
  const rows = await db.kv.where("key").startsWith(prefix).toArray();
  return rows
    .map((row) => row.value as Appointment)
    .sort((a, b) => a.startsAt - b.startsAt);
}

export async function saveAppointment(
  details: AppointmentDetails,
  id?: string,
) {
  return db.transaction("rw", db.kv, async () => {
    if (details.startsAt <= Date.now())
      throw new Error("Choose a future appointment time.");
    const appointments = await listAppointments();
    const previous = id
      ? appointments.find((item) => item.id === id)
      : undefined;
    if (id && !previous)
      throw new Error("This appointment was removed. Start a new request.");
    if (previous?.status === "cancelled")
      throw new Error("This appointment was cancelled. Start a new request.");
    const end = details.startsAt + details.durationMinutes * 60_000;
    if (
      appointments.some(
        (item) =>
          item.id !== id &&
          item.status !== "cancelled" &&
          item.startsAt < end &&
          details.startsAt < item.startsAt + item.durationMinutes * 60_000,
      )
    ) {
      throw new Error(
        "You already have a request or appointment during this time. Choose another time or cancel the earlier request.",
      );
    }
    const appointment: Appointment = {
      ...details,
      id: previous?.id ?? crypto.randomUUID(),
      createdAt: previous?.createdAt ?? Date.now(),
      status: "requested",
    };
    await db.kv.put({ key: prefix + appointment.id, value: appointment });
    return appointment;
  });
}

export async function changeAppointmentStatus(
  id: string,
  status: "confirmed" | "cancelled",
) {
  await db.transaction("rw", db.kv, async () => {
    const row = await db.kv.get(prefix + id);
    if (!row) throw new Error("This appointment no longer exists.");
    const appointment = row.value as Appointment;
    if (
      status === "confirmed" &&
      (appointment.status !== "requested" || appointment.startsAt <= Date.now())
    ) {
      throw new Error("Only a future request can be marked confirmed.");
    }
    await db.kv.put({ key: prefix + id, value: { ...appointment, status } });
  });
}

export async function deleteAppointment(id: string) {
  await db.kv.delete(prefix + id);
}
