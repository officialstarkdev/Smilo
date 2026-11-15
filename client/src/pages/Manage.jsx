import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg, fieldErrors } from '../api.js';
import { telHref, useClinic } from '../context/ClinicContext.jsx';
import { firstName, fmtDateLong, fmtTime } from '../lib/format.js';
import AppointmentDetails from '../components/AppointmentDetails.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import SlotPicker from '../components/SlotPicker.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { changeDeadline, useAppointment } from '../lib/appointment.js';

const QUICK_REASONS = ['Something came up', 'Feeling better now', 'Need a different day', 'Booked by mistake'];

/* ------------------------------ lookup ------------------------------ */

function Lookup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ code: '', email: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.code.trim()) errs.code = 'Enter the code from your confirmation email.';
    if (!form.email.trim()) errs.email = 'Enter the email you booked with.';
    setErrors(errs);
    setError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const r = await api.post('/appointments/lookup', form);
      navigate(`/manage/${r.data.token}`);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container narrow page-pad">
      <Eyebrow>Manage booking</Eyebrow>
      <h1 className="page-title">Find your appointment</h1>
      <p className="lede">
        Use the link in your confirmation email, or enter your booking code and email below. The code looks like{' '}
        <span className="code-inline">SM-4KXT7Q</span>.
      </p>
      <form className="card lookup" onSubmit={submit} noValidate>
        {error && (
          <p className="banner banner-error" role="alert">
            <Icon name="alert" /> {error}
          </p>
        )}
        <Field
          label="Booking code"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          error={errors.code}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Looking…' : 'Find my appointment'}
        </button>
      </form>
    </section>
  );
}

/* ------------------------------ manage ------------------------------ */

export default function Manage() {
  const { token } = useParams();
  if (!token) return <Lookup />;
  return <ManageAppointment token={token} />;
}

function ManageAppointment({ token }) {
  const { clinic } = useClinic();
  const [{ status, appt, error }, setAppt] = useAppointment(token);
  const [mode, setMode] = useState(null); // null | 'move' | 'cancel'
  const [done, setDone] = useState('');

  if (status === 'loading') return <div className="page-loading">Pulling up your appointment…</div>;
  if (status === 'error') {
    return (
      <section className="container narrow page-pad">
        <h1 className="page-title">That link didn’t work</h1>
        <p className="lede">{error}</p>
        <Link to="/manage" className="btn btn-primary">
          Look it up with your code instead
        </Link>
      </section>
    );
  }

  const finish = (updated, message) => {
    setAppt(updated);
    setMode(null);
    setDone(message);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="container manage page-pad">
      <div className="manage-head">
        <Eyebrow>Your appointment</Eyebrow>
        <h1 className="page-title">
          {appt.status === 'cancelled'
            ? 'This appointment is cancelled'
            : appt.status === 'completed'
              ? `Thanks for coming in, ${firstName(appt.patient.name)}`
              : `Hi ${firstName(appt.patient.name)}, here’s your visit`}
        </h1>
        <StatusPill status={appt.status} />
      </div>

      {done && (
        <p className="banner banner-success" role="status">
          <Icon name="check" /> {done}
        </p>
      )}

      <div className="manage-grid">
        <AppointmentDetails appt={appt} dimmed={appt.status === 'cancelled'} />

        <div className="manage-side">
          {appt.status === 'cancelled' && (
            <div className="side-card">
              <h2 className="side-h">
                {appt.cancelledBy === 'staff' ? 'We had to cancel this one' : 'You cancelled this appointment'}
              </h2>
              {appt.cancelReason && <p className="muted">Reason: {appt.cancelReason}</p>}
              <p>No charge, no problem. Book again whenever suits you.</p>
              <Link to={`/book?treatment=${appt.treatment._id}`} className="btn btn-primary btn-block">
                Book a new time
              </Link>
            </div>
          )}

          {appt.status === 'completed' && (
            <div className="side-card">
              <h2 className="side-h">Next time</h2>
              <p>Most people come back for a check-up and clean every six months.</p>
              <Link to="/book" className="btn btn-primary btn-block">
                Book your next visit
              </Link>
            </div>
          )}

          {appt.status === 'confirmed' && !appt.canChange && (
            <div className="side-card">
              <h2 className="side-h">Need to change it?</h2>
              <p>{appt.reason}</p>
              <a className="btn btn-primary btn-block" href={telHref(clinic.phone)}>
                <Icon name="phone" size={18} /> Call {clinic.phone}
              </a>
            </div>
          )}

          {appt.status === 'confirmed' && appt.canChange && !mode && (
            <div className="side-card">
              <h2 className="side-h">Need to change something?</h2>
              <p className="muted">
                You can do it here until {changeDeadline(appt, clinic.policy.cancelWindowMin)}.
              </p>
              <div className="stack-sm">
                <button type="button" className="btn btn-primary btn-block" onClick={() => setMode('move')}>
                  <Icon name="calendar" size={18} /> Move to another time
                </button>
                <button type="button" className="btn btn-ghost btn-block btn-danger-text" onClick={() => setMode('cancel')}>
                  Cancel appointment
                </button>
              </div>
            </div>
          )}

          {mode === 'cancel' && (
            <CancelPanel token={token} onClose={() => setMode(null)} onDone={(a) => finish(a, 'Your appointment is cancelled. We’ve sent a confirmation email.')} />
          )}
        </div>
      </div>

      {mode === 'move' && (
        <MovePanel
          appt={appt}
          onClose={() => setMode(null)}
          onDone={(a) => finish(a, `Done. You’re now booked for ${fmtDateLong(a.date)} at ${fmtTime(a.start)}.`)}
        />
      )}
    </section>
  );
}

function CancelPanel({ token, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cancel = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api.patch(`/appointments/manage/${token}/cancel`, { reason: reason.trim() });
      onDone(r.data.appointment);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="side-card side-card-warn" role="region" aria-labelledby="cancel-h">
      <h2 className="side-h" id="cancel-h">
        Cancel this appointment?
      </h2>
      <p className="muted">It frees the time for someone else. You can always book again.</p>
      <div className="chips" role="group" aria-label="Quick reasons">
        {QUICK_REASONS.map((r) => (
          <button key={r} type="button" className={`chip ${reason === r ? 'is-on' : ''}`} aria-pressed={reason === r} onClick={() => setReason(reason === r ? '' : r)}>
            {r}
          </button>
        ))}
      </div>
      <Field
        as="textarea"
        label="Reason"
        optional
        rows={2}
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        hint="Helps us, but you don’t have to say."
      />
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="row-gap">
        <button type="button" className="btn btn-danger" disabled={busy} onClick={cancel}>
          {busy ? 'Cancelling…' : 'Yes, cancel it'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Keep my appointment
        </button>
      </div>
    </div>
  );
}

function MovePanel({ appt, onClose, onDone }) {
  const [who, setWho] = useState('same'); // 'same' | 'any'
  const [when, setWhen] = useState({ date: null, time: null });
  const [picked, setPicked] = useState(null); // dentist chosen via "soonest"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dentistId = picked?._id || (who === 'same' ? appt.dentist?._id : 'any');

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api.patch(`/appointments/manage/${appt.token}/reschedule`, {
        date: when.date,
        start: when.time,
        dentistId,
      });
      onDone(r.data.appointment);
    } catch (err) {
      setError(errMsg(err));
      if (err?.response?.status === 409) setWhen((w) => ({ ...w, time: null }));
      setBusy(false);
    }
  };

  return (
    <div className="panel move" role="region" aria-labelledby="move-h">
      <div className="move-head">
        <h2 className="panel-title" id="move-h">
          Pick a new time
        </h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {appt.dentist && (
        <div className="seg" role="group" aria-label="Who with">
          <button type="button" className={`seg-btn ${who === 'same' && !picked ? 'is-on' : ''}`} aria-pressed={who === 'same' && !picked} onClick={() => { setWho('same'); setPicked(null); }}>
            Keep {firstName(appt.dentist.name)}
          </button>
          <button type="button" className={`seg-btn ${who === 'any' && !picked ? 'is-on' : ''}`} aria-pressed={who === 'any' && !picked} onClick={() => { setWho('any'); setPicked(null); }}>
            Anyone available
          </button>
        </div>
      )}

      <SlotPicker
        treatmentId={appt.treatment._id}
        dentistId={dentistId}
        exclude={appt.token}
        value={when}
        onChange={({ date, time, dentist }) => {
          setWhen({ date, time });
          if (dentist) setPicked(dentist);
        }}
      />

      {error && (
        <p className="banner banner-error" role="alert">
          <Icon name="alert" /> {error}
        </p>
      )}
      <div className="panel-nav panel-nav-sticky">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Keep current time
        </button>
        <button type="button" className="btn btn-primary" disabled={!when.time || busy} onClick={save}>
          {busy ? 'Moving…' : when.time ? `Move to ${fmtTime(when.time)}${picked ? ` with ${firstName(picked.name)}` : ''}` : 'Pick a time'}
        </button>
      </div>
    </div>
  );
}
