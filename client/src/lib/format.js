// Dates are clinic-local "YYYY-MM-DD" strings and times "HH:MM", same as the API.

export const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return todayStr(d);
};

const asDate = (iso) => new Date(`${iso}T00:00:00`);

/** "9:30 am" */
export function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hr = h % 12 || 12;
  return m ? `${hr}:${String(m).padStart(2, '0')} ${suffix}` : `${hr} ${suffix}`;
}

/** "Tuesday 17 November" */
export const fmtDateLong = (iso) =>
  asDate(iso).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');

/** "Tue 17 Nov" */
export const fmtDateShort = (iso) =>
  asDate(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** "Today", "Tomorrow" or "Tue 17 Nov" */
export function fmtDayRelative(iso) {
  const today = todayStr();
  if (iso === today) return 'Today';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  return fmtDateShort(iso);
}

export const weekdayShort = (iso) => asDate(iso).toLocaleDateString('en-US', { weekday: 'short' });
export const dayNum = (iso) => asDate(iso).getDate();
export const monthShort = (iso) => asDate(iso).toLocaleDateString('en-US', { month: 'short' });

/** 90 -> "1 hr 30 min" */
export function fmtDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function fmtPrice({ price, priceFrom } = {}) {
  if (price === null || price === undefined) return 'Priced at consultation';
  if (price === 0) return 'Free';
  return `${priceFrom ? 'from ' : ''}$${price}`;
}

export const firstName = (name = '') => name.replace(/^(Dr\.?|Dr)\s+/i, '').split(' ')[0];

export const initials = (name = '') =>
  name
    .replace(/^(Dr\.?)\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export function partOfDay(hhmm) {
  const h = Number(hhmm.slice(0, 2));
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

// Patient-facing (first person) and staff-facing (short) labels for the same flags.
export const CONCERN_LABELS = {
  pain: 'I’m in pain right now',
  anxiety: 'I get nervous at the dentist',
  insurance: 'I have a question about insurance',
};
export const CONCERN_SHORT = { pain: 'Pain', anxiety: 'Nervous', insurance: 'Insurance Q' };
