import Appointment from '../models/Appointment.js';
import Dentist from '../models/Dentist.js';
import Room from '../models/Room.js';
import { policy } from '../config/clinic.js';
import { buildSlots, dayOfWeek, overlaps, toMinutes, todayStr, addDays } from './time.js';
import { isRealDate } from './validate.js';

export function httpError(status, message, extra = {}) {
  return Object.assign(new Error(message), { status, ...extra });
}

/** Is `date` a real date between today and the booking horizon? */
export function inBookingWindow(date) {
  if (!isRealDate(date)) return false;
  const today = todayStr();
  return date >= today && date <= addDays(today, policy.maxDaysAhead());
}

/** Everything that occupies time on one date: active appointments + active rooms. */
export async function loadDay(date, { excludeId } = {}) {
  const [appts, rooms] = await Promise.all([
    Appointment.find({ date, isActive: true }),
    Room.find({ active: true }),
  ]);
  return {
    date,
    appts: appts.filter((a) => !excludeId || String(a._id) !== String(excludeId)),
    rooms,
  };
}

/** First room with nothing booked across [start, end), or null. */
export function freeRoom(day, startMin, endMin) {
  return (
    day.rooms.find(
      (room) =>
        !day.appts.some(
          (a) =>
            String(a.room) === String(room._id) &&
            overlaps(startMin, endMin, toMinutes(a.start), toMinutes(a.end))
        )
    ) || null
  );
}

/** Open start times for one dentist, respecting their hours, break, bookings and room capacity. */
export function dentistSlots(dentist, duration, day) {
  const hours = dentist.schedule.find((d) => d.day === dayOfWeek(day.date));
  if (!hours || hours.off) return [];

  const taken = day.appts.filter((a) => String(a.dentist) === String(dentist._id));
  return buildSlots({
    workStart: hours.start,
    workEnd: hours.end,
    breakStart: hours.breakStart,
    breakEnd: hours.breakEnd,
    duration,
    taken,
    date: day.date,
    step: policy.slotStepMin(),
    leadMin: policy.leadTimeMin(),
  }).filter((t) => freeRoom(day, toMinutes(t), toMinutes(t) + duration));
}

/**
 * Dentists who can do this treatment. `dentistId` = a specific person, or
 * 'any'/empty for everyone who offers it.
 */
export async function eligibleDentists(treatment, dentistId) {
  if (dentistId && dentistId !== 'any') {
    const dentist = await Dentist.findById(dentistId);
    if (!dentist || !dentist.active) throw httpError(404, 'We couldn’t find that dentist.');
    if (!dentist.offers(treatment._id)) {
      throw httpError(400, `${dentist.name} doesn’t offer ${treatment.name}. Choose someone else or “First available”.`);
    }
    return [dentist];
  }
  const all = await Dentist.find({ active: true }).sort({ sortOrder: 1, name: 1 });
  return all.filter((d) => d.offers(treatment._id));
}

/** Merged slot list for a date: [{ time, dentists: [id…] }] sorted by time. */
export async function slotsForDate({ treatment, dentists, date, excludeId }) {
  const day = await loadDay(date, { excludeId });
  const byTime = new Map();
  for (const d of dentists) {
    for (const t of dentistSlots(d, treatment.duration, day)) {
      if (!byTime.has(t)) byTime.set(t, []);
      byTime.get(t).push(String(d._id));
    }
  }
  return [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, ids]) => ({ time, dentists: ids }));
}

/**
 * Decide who and where for a requested start. Re-checks availability, so call
 * it inside withLock(). For "first available" we spread load by picking the
 * dentist with the fewest appointments that day.
 */
export async function assignSlot({ treatment, dentists, date, start, excludeId }) {
  const day = await loadDay(date, { excludeId });
  const startMin = toMinutes(start);
  const free = dentists.filter((d) => dentistSlots(d, treatment.duration, day).includes(start));
  if (!free.length) return null;

  const load = (d) => day.appts.filter((a) => String(a.dentist) === String(d._id)).length;
  const dentist = free.length === 1 ? free[0] : [...free].sort((a, b) => load(a) - load(b))[0];
  const room = freeRoom(day, startMin, startMin + treatment.duration);
  return room ? { dentist, room } : null;
}
