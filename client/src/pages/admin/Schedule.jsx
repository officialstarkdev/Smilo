import { useEffect, useMemo, useState } from 'react';
import api, { errMsg } from '../../api.js';
import { addDays, CONCERN_SHORT, fmtDateLong, fmtTime, todayStr } from '../../lib/format.js';
import Icon from '../../components/Icon.jsx';
import StatusPill from '../../components/StatusPill.jsx';

const RANGES = {
  today: { label: 'Today', q: () => ({ date: todayStr() }) },
  week: { label: 'Next 7 days', q: () => ({ from: todayStr(), to: addDays(todayStr(), 6) }) },
  upcoming: { label: 'All upcoming', q: () => ({ from: todayStr() }) },
  past: { label: 'Past 7 days', q: () => ({ from: addDays(todayStr(), -7), to: addDays(todayStr(), -1) }) },
  date: { label: 'Pick a date…', q: (d) => ({ date: d }) },
};

function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Schedule() {
  const [stats, setStats] = useState(null);
  const [dentists, setDentists] = useState([]);
  const [filter, setFilter] = useState({ range: 'week', date: todayStr(), dentist: '', status: '', q: '' });
  const q = useDebounced(filter.q);
  const [list, setList] = useState({ status: 'loading', items: [] });
  const [notice, setNotice] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api.get('/dentists/all').then((r) => setDentists(r.data.dentists)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch(() => {});
  }, [tick]);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams(RANGES[filter.range].q(filter.date));
    if (filter.dentist) params.set('dentist', filter.dentist);
    if (filter.status) params.set('status', filter.status);
    if (q.trim()) params.set('q', q.trim());
    setList((l) => ({ ...l, status: 'loading' }));
    api
      .get(`/admin/appointments?${params}`)
      .then((r) => live && setList({ status: 'ready', items: r.data.appointments }))
      .catch((err) => live && setList({ status: 'error', items: [], error: errMsg(err) }));
    return () => {
      live = false;
    };
  }, [filter.range, filter.date, filter.dentist, filter.status, q, tick]);

  const byDay = useMemo(() => {
    const groups = [];
    for (const a of list.items) {
      if (!groups.length || groups.at(-1).date !== a.date) groups.push({ date: a.date, items: [] });
      groups.at(-1).items.push(a);
    }
    return groups;
  }, [list.items]);

  const update = (k) => (e) => setFilter((f) => ({ ...f, [k]: e.target.value }));
  const refresh = (message) => {
    setNotice(message);
    setTick((n) => n + 1);
  };

  return (
    <>
      {stats && (
        <dl className="stats">
          {[
            ['Today', stats.todayCount],
            ['Next 7 days', stats.weekCount],
            ['New patients, 7 days', stats.newPatients],
            ['Urgent today', stats.urgentToday],
            ['Cancelled, ±7 days', stats.cancelledWeek],
          ].map(([label, n]) => (
            <div key={label} className="stat">
              <dt>{label}</dt>
              <dd>{n}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="filters">
        <label className="mini-field">
          <span>Showing</span>
          <select value={filter.range} onChange={update('range')}>
            {Object.entries(RANGES).map(([k, r]) => (
              <option key={k} value={k}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        {filter.range === 'date' && (
          <label className="mini-field">
            <span>Date</span>
            <input type="date" value={filter.date} onChange={update('date')} />
          </label>
        )}
        <label className="mini-field">
          <span>Dentist</span>
          <select value={filter.dentist} onChange={update('dentist')}>
            <option value="">Everyone</option>
            {dentists.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mini-field">
          <span>Status</span>
          <select value={filter.status} onChange={update('status')}>
            <option value="">Any</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="mini-field mini-field-grow">
          <span>Search</span>
          <span className="search-input">
            <Icon name="search" size={18} />
            <input type="search" placeholder="Name, email, phone or code" value={filter.q} onChange={update('q')} />
          </span>
        </label>
      </div>

      {notice && (
        <p className="banner banner-success" role="status">
          <Icon name="check" /> {notice}
        </p>
      )}

      {list.status === 'error' && (
        <p className="banner banner-error" role="alert">
          <Icon name="alert" /> {list.error}
        </p>
      )}

      <div aria-busy={list.status === 'loading'} className={list.status === 'loading' ? 'is-loading' : ''}>
        {list.status === 'ready' && list.items.length === 0 && (
          <div className="state-box">
            <p>No appointments match. Try a wider date range or clear the search.</p>
          </div>
        )}
        {byDay.map((g) => (
          <section key={g.date} className="day-group" aria-label={fmtDateLong(g.date)}>
            <h2 className="day-group-h">
              {fmtDateLong(g.date)}
              {g.date === todayStr() && <span className="today-tag">Today</span>}
              <span className="day-group-count">
                {g.items.filter((a) => a.status !== 'cancelled').length} booked
              </span>
            </h2>
            <ul className="appt-rows">
              {g.items.map((a) => (
                <ApptRow key={a._id} a={a} onChanged={refresh} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function ApptRow({ a, onChanged }) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setStatus = async (status) => {
    setBusy(true);
    setError('');
    try {
      await api.patch(`/admin/appointments/${a._id}/status`, { status, reason: reason.trim() });
      setCancelling(false);
      onChanged(`${a.patient.name}, ${fmtTime(a.start)}: marked ${status}.`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`appt-row is-${a.status}`}>
      <div className="appt-row-time">
        <strong>{fmtTime(a.start)}</strong>
        <span>{fmtTime(a.end)}</span>
      </div>

      <div className="appt-row-main">
        <p className="appt-row-name">
          {a.patient.name}
          {a.patient.newPatient && <span className="tag tag-new">New patient</span>}
          {a.urgent && <span className="tag tag-urgent">Urgent</span>}
          {a.concerns?.map((c) => (
            <span key={c} className="tag">
              {CONCERN_SHORT[c]}
            </span>
          ))}
        </p>
        <p className="appt-row-meta">
          {a.treatmentName} · {a.dentist?.name}
          {a.autoAssigned && ' (auto)'} · {a.room?.name}
        </p>
        <p className="appt-row-contact">
          <a href={`tel:${a.patient.phone.replace(/[^\d+]/g, '')}`}>{a.patient.phone}</a>
          <a href={`mailto:${a.patient.email}`}>{a.patient.email}</a>
          <span className="code-inline">{a.manageCode}</span>
        </p>
        {a.notes && <p className="appt-row-notes">“{a.notes}”</p>}
        {a.status === 'cancelled' && (
          <p className="appt-row-notes">
            Cancelled by {a.cancelledBy || 'unknown'}
            {a.cancelReason && `: ${a.cancelReason}`}
          </p>
        )}

        {cancelling && (
          <div className="row-cancel">
            <label className="mini-field mini-field-grow">
              <span>Reason (the patient sees this)</span>
              <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Dr. Reyes is unwell today" autoFocus />
            </label>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy || reason.trim().length < 3} onClick={() => setStatus('cancelled')}>
              Cancel & email patient
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCancelling(false)}>
              Never mind
            </button>
          </div>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="appt-row-side">
        <StatusPill status={a.status} />
        <div className="appt-row-actions">
          {a.status === 'confirmed' && !cancelling && (
            <>
              <button type="button" className="btn btn-ghost btn-xs" disabled={busy} onClick={() => setStatus('completed')}>
                Complete
              </button>
              <button type="button" className="btn btn-ghost btn-xs btn-danger-text" onClick={() => setCancelling(true)}>
                Cancel…
              </button>
            </>
          )}
          {a.status === 'completed' && (
            <button type="button" className="btn btn-ghost btn-xs" disabled={busy} onClick={() => setStatus('confirmed')}>
              Undo complete
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
