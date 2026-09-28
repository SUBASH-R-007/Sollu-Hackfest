import { useRef, useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ExternalLink,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { PageTitle, TapButton } from "../../ui";
import { download } from "../../lib/metrics";
import { useProgressClock } from "../rehab/useProgressClock";
import {
  appointmentCalendar,
  parseAppointment,
  type Appointment,
  type AppointmentForm,
} from "./model";
import {
  changeAppointmentStatus,
  deleteAppointment,
  listAppointments,
  saveAppointment,
} from "./store";
import "./appointments.css";

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const initialForm: AppointmentForm = {
  clinician: "",
  date: "",
  time: "",
  durationMinutes: 30,
  mode: "in_person",
  location: "",
  bookingUrl: "",
};
const modes = {
  in_person: "In person",
  video: "Video visit",
  phone: "Phone call",
};

export default function AppointmentsPage({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const result = useLiveQuery(async () => {
    try {
      return { appointments: await listAppointments(), error: "" };
    } catch {
      return {
        appointments: [],
        error: "Appointments could not be loaded. Reload to try again.",
      };
    }
  }, []);
  const [form, setForm] = useState<AppointmentForm>(initialForm);
  const [editing, setEditing] = useState<string>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const clinicianInput = useRef<HTMLInputElement>(null);
  const now = useProgressClock();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function act(work: () => Promise<void>, success: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      setMessage(success);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save. Please try again.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void act(async () => {
      await saveAppointment(parseAppointment(form), editing);
      setForm(initialForm);
      setEditing(undefined);
    }, "Request saved on this device. Contact the clinic to confirm your time; nothing has been sent.");
  }

  function edit(item: Appointment) {
    const date = new Date(item.startsAt);
    setForm({
      clinician: item.clinician,
      date: localDate(date),
      time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
      durationMinutes: item.durationMinutes,
      mode: item.mode,
      location: item.location ?? "",
      bookingUrl: item.bookingUrl ?? "",
    });
    setEditing(item.id);
    setError("");
    setMessage("");
    clinicianInput.current?.focus();
    clinicianInput.current?.scrollIntoView({
      block: "center",
      behavior: "instant",
    });
  }

  function calendar(item: Appointment) {
    download(
      new Blob([appointmentCalendar(item)], {
        type: "text/calendar;charset=utf-8",
      }),
      `sollu-appointment-${item.id}.ics`,
    );
    setMessage(
      "Calendar file saved. Import it into your calendar to set a reminder. This does not book or contact the clinic.",
    );
  }

  return (
    <section className="appointments-page">
      {embedded ? (
        <h2>Book an appointment</h2>
      ) : (
        <PageTitle
          eyebrow="Plan your next visit"
          title="Book an appointment"
          subtitle="Keep your clinician visits in one place."
        />
      )}
      <p className="appointment-notice">
        Choose a preferred time, then contact your clinic or use its booking
        page to confirm. Sollu saves your request on this device; it does not
        reserve a slot or send patient records.
      </p>
      <div className="appointment-layout">
        <form
          className="panel appointment-form"
          onSubmit={submit}
          aria-label="Appointment request"
        >
          <h2>
            <CalendarPlus size={24} aria-hidden="true" />{" "}
            {editing ? "Reschedule appointment" : "Request a visit"}
          </h2>
          <label>
            Clinician or clinic name
            <input
              ref={clinicianInput}
              required
              maxLength={100}
              value={form.clinician}
              onChange={(e) => setForm({ ...form, clinician: e.target.value })}
              autoComplete="off"
            />
          </label>
          <div className="appointment-fields">
            <label>
              Preferred date
              <input
                type="date"
                required
                min={localDate(new Date(now))}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <label>
              Preferred time
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </label>
          </div>
          <small>
            Times use your device time zone: {zone}. Confirm the clinic's time
            zone when booking.
          </small>
          <div className="appointment-fields">
            <label>
              Visit type
              <select
                value={form.mode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    mode: e.target.value as AppointmentForm["mode"],
                  })
                }
              >
                {Object.entries(modes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Planned duration
              <select
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    durationMinutes: Number(
                      e.target.value,
                    ) as AppointmentForm["durationMinutes"],
                  })
                }
              >
                {[15, 30, 45, 60].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Location or joining details (optional)
            <input
              maxLength={200}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
          <label>
            Clinic booking page (optional)
            <input
              type="url"
              placeholder="https://your-clinic.example/book"
              maxLength={500}
              value={form.bookingUrl}
              onChange={(e) => setForm({ ...form, bookingUrl: e.target.value })}
            />
          </label>
          <small>
            Use your clinic's own HTTPS booking link. Appointment details stay
            in this browser and are not encrypted by Sollu.
          </small>
          <button
            type="submit"
            className="tap primary"
            disabled={busy || !result || Boolean(result.error)}
          >
            <CalendarPlus size={22} aria-hidden="true" />
            {busy
              ? "Saving…"
              : editing
                ? "Save new time"
                : "Save appointment request"}
          </button>
          {editing && (
            <TapButton
              type="button"
              disabled={busy}
              onActivate={() => {
                setEditing(undefined);
                setForm(initialForm);
              }}
            >
              Cancel editing
            </TapButton>
          )}
        </form>
        <section aria-labelledby="appointment-list-title">
          <h2 id="appointment-list-title">
            <CalendarDays size={24} aria-hidden="true" /> My appointments
          </h2>
          <p role="status" className="appointment-feedback">
            {message}
          </p>
          {(error || result?.error) && (
            <p role="alert" className="appointment-error">
              {error || result?.error}
            </p>
          )}
          {!result ? (
            <p role="status">Loading appointments…</p>
          ) : result.appointments.length === 0 && !result.error ? (
            <p className="panel">
              No appointments yet. Add your preferred visit using the form.
            </p>
          ) : null}
          {result?.appointments.map((item) => (
            <article
              className="panel appointment-card"
              key={item.id}
              aria-label={`Appointment with ${item.clinician}`}
            >
              <span className={`appointment-status appointment-${item.status}`}>
                {item.status === "requested"
                  ? "Awaiting clinic confirmation"
                  : item.status === "confirmed"
                    ? "Clinic confirmation recorded by you"
                    : "Cancelled on this device"}
              </span>
              <h3>{item.clinician}</h3>
              <p>
                <time dateTime={new Date(item.startsAt).toISOString()}>
                  {new Date(item.startsAt).toLocaleString([], {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </time>
              </p>
              <p>
                {modes[item.mode]} · {item.durationMinutes} minutes
                {item.startsAt <= now ? " · Past appointment time" : ""}
              </p>
              {item.location && <p>{item.location}</p>}
              {item.bookingUrl && (
                <a
                  className="tap appointment-external"
                  href={item.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  <ExternalLink size={20} aria-hidden="true" /> Open clinic
                  booking page
                </a>
              )}
              <div className="appointment-actions">
                {item.status === "requested" && item.startsAt > now && (
                  <TapButton
                    disabled={busy}
                    onActivate={() =>
                      void act(
                        () => changeAppointmentStatus(item.id, "confirmed"),
                        "Your confirmation from the clinic has been recorded locally.",
                      )
                    }
                  >
                    <Check size={20} aria-hidden="true" /> Clinic has confirmed
                  </TapButton>
                )}
                {item.status !== "cancelled" && (
                  <>
                    <TapButton disabled={busy} onActivate={() => edit(item)}>
                      <Pencil size={20} aria-hidden="true" /> Reschedule
                    </TapButton>
                    <TapButton
                      disabled={busy}
                      onActivate={() => calendar(item)}
                    >
                      <CalendarPlus size={20} aria-hidden="true" /> Save
                      calendar file
                    </TapButton>
                    <TapButton
                      disabled={busy}
                      onActivate={() =>
                        void act(async () => {
                          await changeAppointmentStatus(item.id, "cancelled");
                          if (editing === item.id) {
                            setEditing(undefined);
                            setForm(initialForm);
                          }
                        }, "Cancelled locally. Contact your clinic separately and update any imported calendar event.")
                      }
                    >
                      <X size={20} aria-hidden="true" /> Cancel locally
                    </TapButton>
                  </>
                )}
                {item.status === "cancelled" && (
                  <TapButton
                    disabled={busy}
                    onActivate={() =>
                      void act(async () => {
                        await deleteAppointment(item.id);
                        if (editing === item.id) {
                          setEditing(undefined);
                          setForm(initialForm);
                        }
                      }, "Local appointment removed. Clinic bookings and calendar events are unchanged.")
                    }
                  >
                    <Trash2 size={20} aria-hidden="true" /> Remove record
                  </TapButton>
                )}
              </div>
            </article>
          ))}
          <p className="muted">
            Rescheduling or cancelling here does not update the clinic or an
            imported calendar event. Contact the clinic to change a confirmed
            booking. Calendar exports contain your appointment details.
          </p>
        </section>
      </div>
    </section>
  );
}
