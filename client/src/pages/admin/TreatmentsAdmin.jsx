import { useEffect, useState } from 'react';
import api, { errMsg, fieldErrors } from '../../api.js';
import { fmtDuration, fmtPrice } from '../../lib/format.js';
import Field from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';

const CATEGORIES = ['preventive', 'cosmetic', 'restorative', 'orthodontic', 'urgent'];
const empty = { name: '', category: 'preventive', duration: 30, price: '', priceFrom: false, summary: '', description: '' };

export default function TreatmentsAdmin() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ kind: '', text: '' });

  const load = () => api.get('/treatments/all').then((r) => setItems(r.data.treatments)).catch((e) => setNotice({ kind: 'error', text: errMsg(e) }));
  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const reset = () => {
    setForm(empty);
    setEditing(null);
    setErrors({});
  };

  const save = async (e) => {
    e.preventDefault();
    setErrors({});
    const body = { ...form, duration: Number(form.duration), price: form.price === '' ? null : Number(form.price) };
    delete body._id;
    try {
      if (editing) await api.put(`/treatments/${editing}`, body);
      else await api.post('/treatments', body);
      setNotice({ kind: 'success', text: `${form.name} saved.` });
      reset();
      load();
    } catch (err) {
      setErrors(fieldErrors(err));
      setNotice({ kind: 'error', text: errMsg(err) });
    }
  };

  const toggle = async (t) => {
    try {
      await api.put(`/treatments/${t._id}`, { active: !t.active });
      setNotice({ kind: 'success', text: `${t.name} is now ${t.active ? 'hidden from' : 'shown on'} the booking page.` });
      load();
    } catch (err) {
      setNotice({ kind: 'error', text: errMsg(err) });
    }
  };

  return (
    <div className="admin-split">
      <form className="card admin-form" onSubmit={save} noValidate>
        <h2 className="side-h">{editing ? `Edit ${form.name || 'treatment'}` : 'Add a treatment'}</h2>
        <Field label="Name" value={form.name} onChange={set('name')} error={errors.name} required maxLength={80} />
        <div className="form-grid">
          <Field as="select" label="Category" value={form.category} onChange={set('category')} error={errors.category}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </Field>
          <Field label="Duration (min)" type="number" min={15} max={240} step={5} value={form.duration} onChange={set('duration')} error={errors.duration} />
          <Field label="Price ($)" type="number" min={0} value={form.price ?? ''} onChange={set('price')} error={errors.price} hint="Empty = priced at consultation. 0 = free." />
          <label className="check check-inline">
            <input type="checkbox" checked={form.priceFrom} onChange={set('priceFrom')} />
            <span className="check-box" aria-hidden="true">
              <Icon name="check" size={14} />
            </span>
            <span>Show as “from” price</span>
          </label>
        </div>
        <Field label="One-line summary" value={form.summary} onChange={set('summary')} error={errors.summary} maxLength={160} hint="e.g. Most check-ups take about 30 minutes." />
        <Field as="textarea" rows={3} label="Description" value={form.description} onChange={set('description')} error={errors.description} maxLength={600} />
        <div className="row-gap">
          <button type="submit" className="btn btn-primary btn-sm">
            {editing ? 'Save changes' : 'Add treatment'}
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
          {items.map((t) => (
            <li key={t._id} className={t.active ? '' : 'is-hidden'}>
              <div>
                <strong>{t.name}</strong>
                <span className="admin-list-meta">
                  {t.category} · {fmtDuration(t.duration)} · {fmtPrice(t)}
                  {!t.active && ' · hidden'}
                </span>
              </div>
              <div className="row-gap">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setEditing(t._id);
                    setErrors({});
                    setForm({ ...empty, ...t, price: t.price ?? '' });
                  }}
                >
                  Edit
                </button>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => toggle(t)}>
                  {t.active ? 'Hide' : 'Show'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
