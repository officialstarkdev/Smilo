import { useEffect, useState } from 'react';
import api, { errMsg, fieldErrors } from '../../api.js';
import { fmtTime } from '../../lib/format.js';
import Field from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { Portrait } from '../../components/Shapes.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // show Monday first
const defaultWeek = () =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start: '08:00', end: '17:00', breakStart: '12:30', breakEnd: '13:30', off: day === 0 || day === 6 }));
const empty = { name: '', title: '', credentials: '', photo: '', bio: '', languages: '', treatments: [], schedule: defaultWeek() };

export default function TeamAdmin() {
  const [items, setItems] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ kind: '', text: '' });

  const load = () => api.get('/dentists/all').then((r) => setItems(r.data.dentists)).catch((e) => setNotice({ kind: 'error', text: errMsg(e) }));
  useEffect(() => {
    load();
    api.get('/treatments/all').then((r) => setTreatments(r.data.treatments)).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setDay = (day, k, v) =>
    setForm((f) => ({ ...f, schedule: f.schedule.map((d) => (d.day === day ? { ...d, [k]: v } : d)) }));
  const toggleTreatment = (id) =>
    setForm((f) => ({ ...f, treatments: f.treatments.includes(id) ? f.treatments.filter((x) => x !== id) : [...f.treatments, id] }));
  const reset = () => {
    setForm({ ...empty, schedule: defaultWeek() });
    setEditing(null);
    setErrors({});
  };

  const save = async (e) => {
    e.preventDefault();
    setErrors({});
    const body = {
      name: form.name,
      title: form.title,
      credentials: form.credentials,
      photo: form.photo,
      bio: form.bio,
      languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
      treatments: form.treatments,
      schedule: form.schedule,
    };
    try {
      if (editing) await api.put(`/dentists/${editing}`, body);
      else await api.post('/dentists', body);
      setNotice({ kind: 'success', text: `${form.name} saved. New hours apply to bookings from now on.` });
      reset();
      load();
    } catch (err) {
      setErrors(fieldErrors(err));
      setNotice({ kind: 'error', text: errMsg(err) });
    }
  };

  const toggle = async (d) => {
    try {
      await api.put(`/dentists/${d._id}`, { active: !d.active });
      load();
    } catch (err) {
      setNotice({ kind: 'error', text: errMsg(err) });
    }
  };

  const edit = (d) => {
    setEditing(d._id);
    setErrors({});
    setForm({
      name: d.name,
      title: d.title,
      credentials: d.credentials,
      photo: d.photo,
      bio: d.bio,
      languages: (d.languages || []).join(', '),
      treatments: (d.treatments || []).map(String),
      schedule: d.schedule?.length === 7 ? d.schedule.map((x) => ({ ...x })) : defaultWeek(),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="admin-split admin-split-wide">
      <form className="card admin-form" onSubmit={save} noValidate>
        <h2 className="side-h">{editing ? `Edit ${form.name || 'team member'}` : 'Add a team member'}</h2>
        <div className="form-grid">
          <Field label="Name" value={form.name} onChange={set('name')} error={errors.name} placeholder="Dr. Jane Doe" />
          <Field label="Title / specialty" value={form.title} onChange={set('title')} error={errors.title} placeholder="Periodontist" />
          <Field label="Credentials" optional value={form.credentials} onChange={set('credentials')} error={errors.credentials} placeholder="DDS" />
          <Field label="Languages" optional value={form.languages} onChange={set('languages')} hint="Comma-separated" />
        </div>
        <Field label="Photo URL" optional value={form.photo} onChange={set('photo')} error={errors.photo} hint="Leave empty to use the illustrated placeholder." />
        <Field as="textarea" rows={3} label="Short bio" value={form.bio} onChange={set('bio')} error={errors.bio} maxLength={600} />

        <fieldset className="choice-group">
          <legend className="field-label">Treatments they offer</legend>
          {errors.treatments && <p className="field-error">{errors.treatments}</p>}
          <div className="check-list check-list-cols">
            {treatments.map((t) => (
              <label key={t._id} className={`check ${form.treatments.includes(t._id) ? 'is-on' : ''}`}>
                <input type="checkbox" checked={form.treatments.includes(t._id)} onChange={() => toggleTreatment(t._id)} />
                <span className="check-box" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
                <span>{t.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="choice-group">
          <legend className="field-label">Weekly hours</legend>
          {errors.schedule && <p className="field-error">{errors.schedule}</p>}
          <div className="hours-editor" role="table" aria-label="Weekly hours">
            <div className="he-row he-head" role="row">
              <span role="columnheader">Day</span>
              <span role="columnheader">Working</span>
              <span role="columnheader">Start</span>
              <span role="columnheader">End</span>
              <span role="columnheader">Break from</span>
              <span role="columnheader">Break to</span>
            </div>
            {ORDER.map((dayNum) => {
              const d = form.schedule.find((x) => x.day === dayNum);
              return (
                <div key={dayNum} className={`he-row ${d.off ? 'is-off' : ''}`} role="row">
                  <span role="cell" className="he-day">
                    {DAYS[dayNum]}
                  </span>
                  <span role="cell">
                    <input type="checkbox" aria-label={`${DAYS[dayNum]} working`} checked={!d.off} onChange={(e) => setDay(dayNum, 'off', !e.target.checked)} />
                  </span>
                  {['start', 'end', 'breakStart', 'breakEnd'].map((k) => (
                    <span role="cell" key={k}>
                      <input type="time" step={900} aria-label={`${DAYS[dayNum]} ${k}`} disabled={d.off} value={d[k] || ''} onChange={(e) => setDay(dayNum, k, e.target.value)} />
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="row-gap">
          <button type="submit" className="btn btn-primary btn-sm">
            {editing ? 'Save changes' : 'Add to team'}
          </button>
          {editing && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <div>
        {notice.text && (
          <p className={`banner banner-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}
        <ul className="admin-list">
          {items.map((d, i) => (
            <li key={d._id} className={d.active ? '' : 'is-hidden'}>
              <div className="admin-person">
                <Portrait name={d.name} photo={d.photo} index={i} size={44} />
                <div>
                  <strong>{d.name}</strong>
                  <span className="admin-list-meta">
                    {d.title} · {d.treatments.length} treatments
                    {!d.active && ' · hidden'}
                  </span>
                  <span className="admin-list-meta">
                    {d.schedule
                      .filter((x) => !x.off)
                      .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7))
                      .map((x) => `${DAYS[x.day]} ${fmtTime(x.start)}–${fmtTime(x.end)}`)
                      .join(' · ')}
                  </span>
                </div>
              </div>
              <div className="row-gap">
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => edit(d)}>
                  Edit
                </button>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => toggle(d)}>
                  {d.active ? 'Hide' : 'Show'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
