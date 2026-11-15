// All clinic times are handled as local "HH:MM" strings + "YYYY-MM-DD" dates.

export const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const toTime = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return todayStr(d);
};

export const dayOfWeek = (dateStr) => new Date(`${dateStr}T00:00:00`).getDay();

export const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

/**
 * Candidate start times for one dentist on one date.
 * `taken` are that dentist's existing appointments; room capacity is checked separately.
 */
export function buildSlots({
  workStart,
  workEnd,
  breakStart,
  breakEnd,
  duration,
  taken = [],
  date,
  step = 15,
  leadMin = 60,
}) {
  const slots = [];
  const start = toMinutes(workStart);
  const end = toMinutes(workEnd);
  const busy = taken.map((b) => [toMinutes(b.start), toMinutes(b.end)]);
  if (breakStart && breakEnd) busy.push([toMinutes(breakStart), toMinutes(breakEnd)]);

  const now = new Date();
  const isToday = date === todayStr(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (let t = start; t + duration <= end; t += step) {
    if (isToday && t < nowMin + leadMin) continue;
    if (busy.some(([s, e]) => overlaps(t, t + duration, s, e))) continue;
    slots.push(toTime(t));
  }
  return slots;
}
