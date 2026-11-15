import { useEffect, useState } from 'react';
import api, { errMsg } from '../api.js';
import { fmtDateShort, fmtTime } from './format.js';

/** "Tue 17 Nov, 7:30 am": the last moment the patient can change things online. */
export function changeDeadline(appt, cancelWindowMin) {
  const d = new Date(`${appt.date}T${appt.start}:00`);
  d.setMinutes(d.getMinutes() - cancelWindowMin);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${fmtDateShort(iso)}, ${fmtTime(hhmm)}`;
}

/** Loads an appointment by its manage token (skips the fetch if we already have it). */
export function useAppointment(token, initial) {
  const [state, setState] = useState(initial ? { status: 'ready', appt: initial } : { status: 'loading' });
  useEffect(() => {
    if (initial || !token) return;
    api
      .get(`/appointments/manage/${token}`)
      .then((r) => setState({ status: 'ready', appt: r.data.appointment }))
      .catch((err) => setState({ status: 'error', error: errMsg(err) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  return [state, (appt) => setState({ status: 'ready', appt })];
}
