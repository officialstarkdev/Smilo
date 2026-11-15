import { useEffect, useMemo, useState } from 'react';
import api, { errMsg } from '../api.js';
import { useClinic } from '../context/ClinicContext.jsx';
import {
  addDays,
  dayNum,
  fmtDateLong,
  fmtDayRelative,
  fmtTime,
  monthShort,
  partOfDay,
  todayStr,
  weekdayShort,
} from '../lib/format.js';
import Icon from './Icon.jsx';

const WINDOW = 14;

/**
 * Date strip + time grid backed by real availability.
 * value: { date, time }. onChange({ date, time, dentist? }) — `dentist` is set
 * when the patient picks from "soonest openings", which names a specific person.
 */
export default function SlotPicker({ treatmentId, dentistId = 'any', exclude, value, onChange, urgent = false }) {
  const { clinic } = useClinic();
  const today = todayStr();
  const [windowStart, setWindowStart] = useState(today);
  const [cal, setCal] = useState({ status: 'loading', days: [], max: 60 });
  const [slots, setSlots] = useState({ status: 'idle', list: [] });
  const [showSoonest, setShowSoonest] = useState(urgent);
  const [soonest, setSoonest] = useState({ status: 'idle', list: [] });
  const [reload, setReload] = useState(0);
  const date = value?.date;
  const time = value?.time;

  const query = (extra) => {
    const q = new URLSearchParams({ treatmentId, dentistId: dentistId || 'any', ...extra });
    if (exclude) q.set('exclude', exclude);
    return q.toString();
  };

  /* --- which days have anything open --- */
  useEffect(() => {
    let live = true;
    setCal((c) => ({ ...c, status: 'loading' }));
    api
      .get(`/appointments/calendar?${query({ from: windowStart, days: WINDOW })}`)
      .then(({ data }) => {
        if (!live) return;
        setCal({ status: 'ready', days: data.days, max: data.maxDaysAhead });
        // Pre-select the first open day if nothing (or a now-full day in view) is selected.
        const current = data.days.find((d) => d.date === date);
        if (!date || (current && current.open === 0)) {
          const first = data.days.find((d) => d.open > 0);
          if (first) onChange({ date: first.date, time: null });
        }
      })
      .catch((err) => live && setCal((c) => ({ ...c, status: 'error', error: errMsg(err) })));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatmentId, dentistId, exclude, windowStart, reload]);

  /* --- times on the selected day --- */
  useEffect(() => {
    if (!date) return;
    let live = true;
    setSlots({ status: 'loading', list: [] });
    api
      .get(`/appointments/availability?${query({ date })}`)
      .then(({ data }) => {
        if (!live) return;
        setSlots({ status: 'ready', list: data.slots });
        if (time && !data.slots.some((s) => s.time === time)) onChange({ date, time: null });
      })
      .catch((err) => live && setSlots({ status: 'error', list: [], error: errMsg(err) }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, treatmentId, dentistId, exclude, reload]);

  /* --- soonest openings (urgent / "need it soon") --- */
  useEffect(() => {
    if (!showSoonest) return;
    let live = true;
    setSoonest({ status: 'loading', list: [] });
    const q = new URLSearchParams({ treatmentId, limit: 6 });
    if (dentistId && dentistId !== 'any') q.set('dentistId', dentistId);
    api
      .get(`/appointments/earliest?${q}`)
      .then(({ data }) => live && setSoonest({ status: 'ready', list: data.slots }))
      .catch((err) => live && setSoonest({ status: 'error', list: [], error: errMsg(err) }));
    return () => {
      live = false;
    };
  }, [showSoonest, treatmentId, dentistId, reload]);

  const groups = useMemo(() => {
    const out = [];
    for (const s of slots.list) {
      const label = partOfDay(s.time);
      if (!out.length || out.at(-1).label !== label) out.push({ label, items: [] });
      out.at(-1).items.push(s);
    }
    return out;
  }, [slots.list]);

  const closedWeekdays = new Set(clinic.hours.filter((h) => !h.open).map((h) => h.day));
  const lastBookable = addDays(today, cal.max);
  const canPrev = windowStart > today;
  const canNext = addDays(windowStart, WINDOW) <= lastBookable;
  const nextOpen = cal.days.find((d) => d.open > 0 && d.date > (date || ''));
  const firstDay = cal.days[0]?.date;
  const lastDay = cal.days.at(-1)?.date;

  const status =
    slots.status === 'loading'
      ? `Checking times for ${date ? fmtDateLong(date) : 'the selected day'}`
      : slots.status === 'ready'
        ? `${slots.list.length} times open on ${fmtDateLong(date)}`
        : '';

  return (
    <div className="picker">
      {/* Soonest openings */}
      <div className={`soonest ${showSoonest ? 'soonest-open' : ''}`}>
        <div className="soonest-head">
          <div>
            <h3 className="soonest-title">
              <Icon name="pulse" size={18} /> {urgent ? 'Soonest openings' : 'Need it soon?'}
            </h3>
            {!showSoonest && <p className="soonest-sub">See the next few times across the whole team.</p>}
          </div>
          {!urgent && (
            <button type="button" className="link-btn" aria-expanded={showSoonest} onClick={() => setShowSoonest((s) => !s)}>
              {showSoonest ? 'Hide' : 'Show soonest'}
            </button>
          )}
        </div>

        {showSoonest && (
          <div className="soonest-body">
            {soonest.status === 'loading' && (
              <ul className="soonest-list" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="skeleton skeleton-row" />
                ))}
              </ul>
            )}
            {soonest.status === 'error' && <p className="inline-error">{soonest.error}</p>}
            {soonest.status === 'ready' && soonest.list.length === 0 && (
              <p className="muted">Nothing in the next two weeks online. Call us and we’ll find a way to fit you in.</p>
            )}
            {soonest.status === 'ready' && soonest.list.length > 0 && (
              <ul className="soonest-list">
                {soonest.list.map((s) => {
                  const on = s.date === date && s.time === time;
                  return (
                    <li key={`${s.date}${s.time}${s.dentist._id}`}>
                      <button
                        type="button"
                        className={`soonest-item ${on ? 'is-on' : ''}`}
                        aria-pressed={on}
                        onClick={() => onChange({ date: s.date, time: s.time, dentist: s.dentist })}
                      >
                        <span className="soonest-when">
                          <strong>{fmtDayRelative(s.date)}</strong> {fmtTime(s.time)}
                        </span>
                        <span className="soonest-who">{s.dentist.name}</span>
                        <Icon name={on ? 'check' : 'arrowRight'} size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Day strip */}
      <div className="days-head">
        <h3 className="picker-h">Pick a day</h3>
        <div className="days-nav">
          {firstDay && (
            <span className="days-range">
              {monthShort(firstDay)} {dayNum(firstDay)} – {monthShort(lastDay)} {dayNum(lastDay)}
            </span>
          )}
          <button
            type="button"
            className="icon-btn icon-btn-sm"
            disabled={!canPrev}
            aria-label="Earlier dates"
            onClick={() => setWindowStart((w) => (addDays(w, -WINDOW) < today ? today : addDays(w, -WINDOW)))}
          >
            <Icon name="chevronLeft" />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn-sm"
            disabled={!canNext}
            aria-label="Later dates"
            onClick={() => setWindowStart((w) => addDays(w, WINDOW))}
          >
            <Icon name="chevronRight" />
          </button>
        </div>
      </div>

      {cal.status === 'error' ? (
        <div className="state-box state-error" role="alert">
          <p>{cal.error}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReload((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : (
        <ul className="days" aria-busy={cal.status === 'loading'}>
          {cal.status === 'loading' && !cal.days.length
            ? Array.from({ length: 7 }, (_, i) => <li key={i} className="skeleton skeleton-day" aria-hidden="true" />)
            : cal.days.map((d) => {
                const closed = closedWeekdays.has(new Date(`${d.date}T00:00:00`).getDay());
                const on = d.date === date;
                const note = d.open > 0 ? `${d.open} open` : closed ? 'Closed' : 'Full';
                return (
                  <li key={d.date}>
                    <button
                      type="button"
                      className={`day ${on ? 'is-on' : ''} ${d.open === 0 ? 'is-empty' : ''}`}
                      disabled={d.open === 0}
                      aria-pressed={on}
                      aria-label={`${fmtDateLong(d.date)}, ${d.open ? `${d.open} times open` : closed ? 'clinic closed' : 'fully booked'}`}
                      onClick={() => onChange({ date: d.date, time: null })}
                    >
                      <span className="day-wd">{d.date === today ? 'Today' : weekdayShort(d.date)}</span>
                      <span className="day-num">{dayNum(d.date)}</span>
                      <span className="day-note">{note}</span>
                    </button>
                  </li>
                );
              })}
        </ul>
      )}

      {/* Times */}
      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      {date && (
        <div className="times">
          <h3 className="picker-h">
            Times on <span className="nowrap">{fmtDateLong(date)}</span>
          </h3>

          {slots.status === 'loading' && (
            <div className="slot-grid" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="skeleton skeleton-slot" />
              ))}
            </div>
          )}

          {slots.status === 'error' && (
            <div className="state-box state-error" role="alert">
              <p>{slots.error}</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReload((n) => n + 1)}>
                Try again
              </button>
            </div>
          )}

          {slots.status === 'ready' && slots.list.length === 0 && (
            <div className="state-box">
              <p>Nothing left on this day{dentistId !== 'any' ? ' with this dentist' : ''}.</p>
              {nextOpen ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ date: nextOpen.date, time: null })}>
                  Next opening: {fmtDayRelative(nextOpen.date)}, {fmtTime(nextOpen.first)}
                </button>
              ) : (
                <p className="muted">Try later dates, or choose “First available” to see the whole team.</p>
              )}
            </div>
          )}

          {slots.status === 'ready' &&
            groups.map((g) => (
              <fieldset key={g.label} className="slot-group">
                <legend className="slot-group-label">{g.label}</legend>
                <div className="slot-grid">
                  {g.items.map((s) => {
                    const on = s.time === time;
                    return (
                      <button
                        key={s.time}
                        type="button"
                        className={`slot ${on ? 'is-on' : ''}`}
                        aria-pressed={on}
                        onClick={() => onChange({ date, time: s.time })}
                      >
                        {fmtTime(s.time)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
        </div>
      )}
    </div>
  );
}
