// Add-to-calendar helpers. Times are clinic-local, so we pin them to the
// clinic's time zone rather than the visitor's.
export const CLINIC_TZ = 'America/Los_Angeles';

const stamp = (date, hhmm) => `${date.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;
const esc = (s = '') => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

function details(appt, clinic, manageUrl) {
  const who = appt.dentist ? ` with ${appt.dentist.name}` : '';
  const title = `${appt.treatment.name}${who} at Smilo`;
  const where = clinic
    ? `${clinic.legalName}, ${clinic.address.line1}, ${clinic.address.city}, ${clinic.address.region} ${clinic.address.postal}`
    : 'Smilo Dental Studio';
  const body = `Booking code: ${appt.code}\nMove or cancel: ${manageUrl}${clinic ? `\nQuestions: ${clinic.phone}` : ''}`;
  return { title, where, body };
}

export function icsFile(appt, clinic, manageUrl) {
  const { title, where, body } = details(appt, clinic, manageUrl);
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smilo//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${appt.code}@smilo.clinic`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${CLINIC_TZ}:${stamp(appt.date, appt.start)}`,
    `DTEND;TZID=${CLINIC_TZ}:${stamp(appt.date, appt.end)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(where)}`,
    `DESCRIPTION:${esc(body)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Dentist appointment in 2 hours',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
}

export function downloadIcs(appt, clinic, manageUrl) {
  const url = URL.createObjectURL(icsFile(appt, clinic, manageUrl));
  const a = document.createElement('a');
  a.href = url;
  a.download = `smilo-${appt.date}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalendarUrl(appt, clinic, manageUrl) {
  const { title, where, body } = details(appt, clinic, manageUrl);
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(appt.date, appt.start)}/${stamp(appt.date, appt.end)}`,
    ctz: CLINIC_TZ,
    location: where,
    details: body,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export const manageLink = (token) => `${window.location.origin}/manage/${token}`;
