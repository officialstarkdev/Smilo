import { useEffect, useState } from 'react';
import api, { errMsg, fieldErrors } from '../../api.js';
import Field from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';

export default function RoomsAdmin() {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ name: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ kind: '', text: '' });

  const load = () => api.get('/rooms').then((r) => setRooms(r.data.rooms)).catch((e) => setNotice({ kind: 'error', text: errMsg(e) }));
  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rooms', form);
      setForm({ name: '', notes: '' });
      setErrors({});
      setNotice({ kind: 'success', text: 'Room added. It’s available for new bookings now.' });
      load();
    } catch (err) {
      setErrors(fieldErrors(err));
      setNotice({ kind: 'error', text: errMsg(err) });
    }
  };

  const toggle = async (r) => {
    try {
      await api.put(`/rooms/${r._id}`, { active: !r.active });
      setNotice({
        kind: 'success',
        text: r.active
          ? `${r.name} closed to new bookings. Existing appointments keep their room.`
          : `${r.name} is open for bookings again.`,
      });
      load();
    } catch (err) {
      setNotice({ kind: 'error', text: errMsg(err) });
    }
  };

  const open = rooms.filter((r) => r.active).length;

  return (
    <div className="admin-split">
      <form className="card admin-form" onSubmit={add} noValidate>
        <h2 className="side-h">Add a treatment room</h2>
        <p className="muted">
          Each appointment takes a room for its full length, so the number of open rooms caps how many patients can be
          seen at once.
        </p>
        <Field label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} maxLength={40} placeholder="Room 4" />
        <Field label="Notes" optional value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} error={errors.notes} maxLength={200} />
        <button type="submit" className="btn btn-primary btn-sm">
          Add room
        </button>
      </form>

      <div>
        {notice.text && (
          <p className={`banner banner-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}
        <p className="muted">
          <Icon name="door" size={18} /> {open} of {rooms.length} rooms open for booking
        </p>
        <ul className="admin-list">
          {rooms.map((r) => (
            <li key={r._id} className={r.active ? '' : 'is-hidden'}>
              <div>
                <strong>{r.name}</strong>
                <span className="admin-list-meta">
                  {r.notes || 'No notes'}
                  {!r.active && ' · closed'}
                </span>
              </div>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => toggle(r)}>
                {r.active ? 'Close room' : 'Reopen'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
