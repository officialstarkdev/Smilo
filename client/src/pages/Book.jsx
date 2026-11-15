import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errMsg, fieldErrors } from '../api.js';
import { telHref, useClinic } from '../context/ClinicContext.jsx';
import { CONCERN_LABELS, fmtDayRelative, fmtDuration, fmtPrice, fmtTime } from '../lib/format.js';
import BookingSummary from '../components/BookingSummary.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import SlotPicker from '../components/SlotPicker.jsx';
import { Portrait } from '../components/Shapes.jsx';

const STEPS = ['Treatment', 'Dentist', 'Date & time', 'Your details'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const offers = (d, t) => d && t && d.treatments?.some((id) => String(id) === String(t._id));
const emptyForm = { name: '', phone: '', email: '', newPatient: null, concerns: [], notes: '' };

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Please tell us your name.';
  const digits = f.phone.replace(/\D/g, '');
  if (!f.phone.trim()) e.phone = 'We need a phone number in case we have to reach you.';
  else if (digits.length < 7 || digits.length > 15 || !/^[\d\s()+.-]+$/.test(f.phone)) e.phone = 'That phone number doesn’t look right.';
  if (!f.email.trim()) e.email = 'Your confirmation goes to this email.';
  else if (!EMAIL_RE.test(f.email.trim())) e.email = 'That email doesn’t look right. Check for a typo?';
  if (f.newPatient === null) e.newPatient = 'Let us know if you’ve been to Smilo before.';
  if (f.notes.length > 500) e.notes = 'Notes can be up to 500 characters.';
  return e;
}

/** A selectable row. Buttons (not radios) so one click/Enter both selects and advances. */
function Option({ selected, onClick, children, className = '' }) {
  return (
    <button type="button" className={`option ${selected ? 'is-on' : ''} ${className}`} aria-pressed={selected} onClick={onClick}>
      {children}
      <span className="option-mark" aria-hidden="true">
        <Icon name={selected ? 'check' : 'arrowRight'} size={18} />
      </span>
    </button>
  );
}

export default function Book() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { clinic } = useClinic();

  const [catalog, setCatalog] = useState({ status: 'loading', treatments: [], dentists: [] });
  const [reload, setReload] = useState(0);
  const [step, setStep] = useState(1);
  const [treatment, setTreatment] = useState(null);
  const [dentist, setDentist] = useState(null); // 'any' | dentist object
  const [when, setWhen] = useState({ date: null, time: null });
  const [urgent, setUrgent] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nextByDentist, setNextByDentist] = useState({});

  const headingRef = useRef(null);
  const mounted = useRef(false);
  const formRef = useRef(null);

  /* ---------- load catalogue + honour deep links ---------- */
  useEffect(() => {
    setCatalog((c) => ({ ...c, status: 'loading' }));
    Promise.all([api.get('/treatments'), api.get('/dentists')])
      .then(([tr, de]) => {
        const treatments = tr.data.treatments;
        const dentists = de.data.dentists;
        setCatalog({ status: 'ready', treatments, dentists });

        const isUrgent = params.get('urgent') === '1';
        let t = treatments.find((x) => x._id === params.get('treatment')) || null;
        if (isUrgent) t = treatments.find((x) => x.category === 'urgent') || t;
        const dp = params.get('dentist');
        let d = dp === 'any' ? 'any' : dentists.find((x) => x._id === dp) || null;
        if (d && d !== 'any' && t && !offers(d, t)) d = null;
        if (t && !d && (isUrgent || t.category === 'urgent')) d = 'any';

        setTreatment(t);
        setDentist(d);
        setUrgent(Boolean(t && t.category === 'urgent'));
        if (t && d) {
          setStep(3);
          const date = params.get('date');
          if (date) setWhen({ date, time: params.get('time') || null });
        } else setStep(t ? 2 : 1);
      })
      .catch((err) => setCatalog((c) => ({ ...c, status: 'error', error: errMsg(err) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload]);

  /* ---------- move focus to the new step's heading ---------- */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    const top = document.querySelector('.book')?.getBoundingClientRect().top ?? 0;
    if (top < 0) window.scrollTo({ top: window.scrollY + top, behavior: 'smooth' });
  }, [step]);

  const eligible = useMemo(
    () => (treatment ? catalog.dentists.filter((d) => offers(d, treatment)) : catalog.dentists),
    [catalog.dentists, treatment]
  );
  const emergency = catalog.treatments.find((t) => t.category === 'urgent');

  /* ---------- step 2: soonest time per dentist, so the choice is informed ---------- */
  useEffect(() => {
    if (step !== 2 || !treatment) return;
    let live = true;
    const ids = ['any', ...eligible.map((d) => d._id)];
    setNextByDentist(Object.fromEntries(ids.map((id) => [id, 'loading'])));
    ids.forEach((id) => {
      const q = new URLSearchParams({ treatmentId: treatment._id, limit: 1 });
      if (id !== 'any') q.set('dentistId', id);
      api
        .get(`/appointments/earliest?${q}`)
        .then((r) => live && setNextByDentist((m) => ({ ...m, [id]: r.data.slots[0] || null })))
        .catch(() => live && setNextByDentist((m) => ({ ...m, [id]: 'error' })));
    });
    return () => {
      live = false;
    };
  }, [step, treatment, eligible]);

  /* ---------- actions ---------- */
  const goTo = (n) => {
    setBanner('');
    setStep(n);
  };

  const pickTreatment = (t) => {
    setTreatment(t);
    setUrgent(t.category === 'urgent');
    setWhen({ date: null, time: null });
    setNotice('');
    if (t.category === 'urgent') {
      setDentist('any');
      return goTo(3);
    }
    if (dentist && dentist !== 'any') {
      if (offers(dentist, t)) return goTo(3);
      setNotice(`${dentist.name} doesn’t do ${t.name.toLowerCase()}, so here’s who does.`);
      setDentist(null);
    }
    goTo(2);
  };

  const pickDentist = (d) => {
    setDentist(d);
    setWhen((w) => ({ date: w.date, time: null }));
    setNotice('');
    goTo(3);
  };

  const onWhen = ({ date, time, dentist: chosen }) => {
    setWhen({ date, time });
    if (chosen) {
      const full = catalog.dentists.find((d) => d._id === chosen._id);
      if (full && (dentist === 'any' || dentist?._id !== full._id)) setDentist(full);
    }
  };

  const set = (k) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const toggleConcern = (c) =>
    setForm((f) => ({ ...f, concerns: f.concerns.includes(c) ? f.concerns.filter((x) => x !== c) : [...f.concerns, c] }));

  const focusFirstError = () =>
    requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());

  const submit = async (e) => {
    e.preventDefault();
    setBanner('');
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError();

    setSubmitting(true);
    try {
      const res = await api.post('/appointments', {
        treatmentId: treatment._id,
        dentistId: dentist === 'any' ? 'any' : dentist._id,
        date: when.date,
        start: when.time,
        urgent,
        concerns: form.concerns,
        notes: form.notes.trim(),
        patient: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), newPatient: form.newPatient },
      });
      const appt = res.data.appointment;
      navigate(`/booked/${appt.token}`, { state: { appointment: appt } });
    } catch (err) {
      const status = err?.response?.status;
      const fe = fieldErrors(err);
      if (status === 409 || fe.date || fe.start) {
        setWhen((w) => ({ ...w, time: null }));
        goTo(3); // clears the banner, so set it after
        setBanner(errMsg(err, 'That time is no longer available. Please pick another.'));
      } else if (Object.keys(fe).length) {
        setErrors(fe);
        setBanner('Please check the highlighted fields.');
        focusFirstError();
      } else {
        setBanner(errMsg(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- render ---------- */
  const errorCount = Object.values(errors).filter(Boolean).length;
  const ready = catalog.status === 'ready';

  return (
    <section className="book">
      <div className="container book-head">
        <Eyebrow>Book an appointment</Eyebrow>
        <h1 className="book-title">{urgent ? 'Let’s get you seen soon' : 'Let’s find you a time'}</h1>

        <ol className="stepper" aria-label="Booking steps">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n < step ? 'done' : n === step ? 'current' : 'todo';
            const inner = (
              <>
                <span className="stepper-dot">{n < step ? <Icon name="check" size={14} /> : n}</span>
                <span className="stepper-label">{label}</span>
              </>
            );
            return (
              <li key={label} className={`stepper-item is-${state}`} aria-current={n === step ? 'step' : undefined}>
                {n < step ? (
                  <button type="button" className="stepper-btn" onClick={() => goTo(n)}>
                    {inner}
                    <span className="sr-only"> (completed, go back)</span>
                  </button>
                ) : (
                  <span className="stepper-btn">{inner}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="container book-grid">
        <BookingSummary treatment={treatment} dentist={dentist} date={when.date} time={when.time} onEdit={goTo} />

        <div className="book-main">
          {banner && (
            <div className="banner banner-error" role="alert">
              <Icon name="alert" /> <span>{banner}</span>
            </div>
          )}

          {catalog.status === 'loading' && (
            <div className="panel" aria-busy="true">
              <div className="skeleton skeleton-heading" />
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="skeleton skeleton-option" />
              ))}
              <p className="sr-only" role="status">
                Loading treatments
              </p>
            </div>
          )}

          {catalog.status === 'error' && (
            <div className="panel state-box state-error" role="alert">
              <h2 className="panel-title">We can’t reach the booking system</h2>
              <p>{catalog.error}</p>
              <div className="row-gap">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setReload((n) => n + 1)}>
                  Try again
                </button>
                <a className="btn btn-ghost btn-sm" href={telHref(clinic.phone)}>
                  Call {clinic.phone}
                </a>
              </div>
            </div>
          )}

          {/* ---------------- Step 1: treatment ---------------- */}
          {ready && step === 1 && (
            <div className="panel" key="s1">
              <h2 className="panel-title" tabIndex={-1} ref={headingRef}>
                What would you like to come in for?
              </h2>
              <p className="panel-sub">Not sure? A check-up is a good place to start.</p>

              {emergency && (
                <button type="button" className="urgent-callout" onClick={() => pickTreatment(emergency)}>
                  <Icon name="pulse" size={22} />
                  <span>
                    <strong>In pain, swollen, or broke a tooth?</strong>
                    <span>We keep same-day times free. Show me the soonest openings.</span>
                  </span>
                  <Icon name="arrowRight" size={20} />
                </button>
              )}

              <div className="options">
                {catalog.treatments
                  .filter((t) => t.category !== 'urgent')
                  .map((t) => (
                    <Option key={t._id} selected={treatment?._id === t._id} onClick={() => pickTreatment(t)}>
                      <span className="option-body">
                        <span className="option-title">{t.name}</span>
                        <span className="option-text">{t.summary}</span>
                      </span>
                      <span className="option-side">
                        <span>{fmtDuration(t.duration)}</span>
                        <strong>{fmtPrice(t)}</strong>
                      </span>
                    </Option>
                  ))}
              </div>
            </div>
          )}

          {/* ---------------- Step 2: dentist ---------------- */}
          {ready && step === 2 && treatment && (
            <div className="panel" key="s2">
              <h2 className="panel-title" tabIndex={-1} ref={headingRef}>
                Who would you like to see?
              </h2>
              <p className="panel-sub">
                {notice ||
                  (eligible.length < catalog.dentists.length
                    ? `Showing the ${eligible.length === 1 ? 'one person' : `${eligible.length} people`} on our team who do ${treatment.name.toLowerCase()}.`
                    : '“First available” usually gets you the soonest time.')}
              </p>

              <div className="options">
                <Option selected={dentist === 'any'} onClick={() => pickDentist('any')} className="option-any">
                  <span className="option-avatar option-avatar-any" aria-hidden="true">
                    <Icon name="sun" size={26} />
                  </span>
                  <span className="option-body">
                    <span className="option-title">First available</span>
                    <span className="option-text">Whoever is free at the time you pick</span>
                    <NextHint value={nextByDentist.any} />
                  </span>
                </Option>
                {eligible.map((d) => (
                  <Option key={d._id} selected={dentist?._id === d._id} onClick={() => pickDentist(d)}>
                    <span className="option-avatar" aria-hidden="true">
                      <Portrait name={d.name} photo={d.photo} index={catalog.dentists.indexOf(d)} size={56} />
                    </span>
                    <span className="option-body">
                      <span className="option-title">{d.name}</span>
                      <span className="option-text">
                        {d.title}
                        {d.languages?.length > 1 && ` · Speaks ${d.languages.join(', ')}`}
                      </span>
                      <NextHint value={nextByDentist[d._id]} />
                    </span>
                  </Option>
                ))}
              </div>
              {eligible.length === 0 && (
                <div className="state-box">
                  <p>Nobody can take {treatment.name} online right now. Please call us and we’ll book you in.</p>
                </div>
              )}
              <div className="panel-nav">
                <button type="button" className="btn btn-ghost" onClick={() => goTo(1)}>
                  <Icon name="arrowLeft" size={18} /> Back
                </button>
              </div>
            </div>
          )}

          {/* ---------------- Step 3: date & time ---------------- */}
          {ready && step === 3 && treatment && dentist && (
            <div className="panel" key="s3">
              <h2 className="panel-title" tabIndex={-1} ref={headingRef}>
                {urgent ? 'Here’s the soonest we can see you' : 'When works for you?'}
              </h2>
              <p className="panel-sub">
                Every time shown is free for the full {fmtDuration(treatment.duration)}
                {dentist === 'any' ? ' with at least one of our team.' : ` with ${dentist.name}.`}
              </p>

              <SlotPicker
                treatmentId={treatment._id}
                dentistId={dentist === 'any' ? 'any' : dentist._id}
                value={when}
                onChange={onWhen}
                urgent={urgent}
              />

              <div className="panel-nav panel-nav-sticky">
                <button type="button" className="btn btn-ghost" onClick={() => goTo(urgent ? 1 : 2)}>
                  <Icon name="arrowLeft" size={18} /> Back
                </button>
                <button type="button" className="btn btn-primary" disabled={!when.time} onClick={() => goTo(4)}>
                  {when.time ? `Continue with ${fmtTime(when.time)}` : 'Choose a time'}
                  {when.time && <Icon name="arrowRight" size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* ---------------- Step 4: details ---------------- */}
          {ready && step === 4 && treatment && dentist && when.time && (
            <form className="panel" key="s4" onSubmit={submit} noValidate ref={formRef}>
              <h2 className="panel-title" tabIndex={-1} ref={headingRef}>
                A few details and you’re done
              </h2>
              <p className="panel-sub">Your confirmation, with a link to move or cancel, goes to your email.</p>

              {errorCount > 1 && (
                <p className="banner banner-soft" role="status">
                  <Icon name="info" /> {errorCount} things need a look before we can book this.
                </p>
              )}

              <div className="form-grid">
                <Field
                  label="Full name"
                  className="span-2"
                  autoComplete="name"
                  value={form.name}
                  onChange={set('name')}
                  error={errors.name}
                  maxLength={80}
                />
                <Field
                  label="Mobile number"
                  hint="Only used if we need to reach you about this visit."
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  error={errors.phone}
                  maxLength={30}
                />
                <Field
                  label="Email"
                  hint="Where we send your confirmation."
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={set('email')}
                  error={errors.email}
                  maxLength={120}
                />
              </div>

              <fieldset className={`choice-group ${errors.newPatient ? 'field-invalid' : ''}`}>
                <legend className="field-label">Have you been to Smilo before?</legend>
                <div className="choice-row">
                  {[
                    [true, 'No, this is my first visit'],
                    [false, 'Yes, I’ve been before'],
                  ].map(([val, label]) => (
                    <label key={label} className={`choice ${form.newPatient === val ? 'is-on' : ''}`}>
                      <input
                        type="radio"
                        name="newPatient"
                        checked={form.newPatient === val}
                        onChange={() => set('newPatient')(val)}
                        aria-invalid={errors.newPatient ? true : undefined}
                        aria-describedby={errors.newPatient ? 'np-err' : undefined}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {form.newPatient === true && (
                  <p className="field-hint">Welcome. Please arrive 10 minutes early for a short health form.</p>
                )}
                {errors.newPatient && (
                  <p className="field-error" id="np-err">
                    <Icon name="alert" size={16} /> {errors.newPatient}
                  </p>
                )}
              </fieldset>

              <fieldset className="choice-group">
                <legend className="field-label">
                  Anything we should know? <span className="field-optional">Optional</span>
                </legend>
                <div className="check-list">
                  {Object.entries(CONCERN_LABELS).map(([key, label]) => (
                    <label key={key} className={`check ${form.concerns.includes(key) ? 'is-on' : ''}`}>
                      <input type="checkbox" checked={form.concerns.includes(key)} onChange={() => toggleConcern(key)} />
                      <span className="check-box" aria-hidden="true">
                        <Icon name="check" size={14} />
                      </span>
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {form.concerns.includes('pain') && !urgent && emergency && (
                  <div className="banner banner-soft">
                    <Icon name="pulse" />
                    <span>
                      If it’s bad, an Emergency Visit gets you seen sooner.{' '}
                      <button type="button" className="link-btn" onClick={() => pickTreatment(emergency)}>
                        Switch to Emergency Visit
                      </button>
                    </span>
                  </div>
                )}
                {form.concerns.includes('anxiety') && (
                  <p className="field-hint">Thanks for telling us. We’ll go at your pace and explain before we start anything.</p>
                )}
              </fieldset>

              <Field
                as="textarea"
                label="Notes for your dentist"
                optional
                rows={3}
                maxLength={500}
                placeholder="e.g. upper left tooth hurts with cold drinks, or I’d like to ask about whitening"
                value={form.notes}
                onChange={set('notes')}
                error={errors.notes}
                hint={`${500 - form.notes.length} characters left`}
              />

              <p className="fine-print">
                We use these details only to confirm and remind you about this visit. Free to move or cancel online up to{' '}
                {clinic.policy.cancelWindowMin / 60} hours before.
              </p>

              <div className="panel-nav">
                <button type="button" className="btn btn-ghost" onClick={() => goTo(3)}>
                  <Icon name="arrowLeft" size={18} /> Back
                </button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner" aria-hidden="true" /> Booking…
                    </>
                  ) : (
                    'Confirm appointment'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function NextHint({ value }) {
  if (value === undefined) return null;
  if (value === 'loading') return <span className="option-next is-loading">Checking availability…</span>;
  if (value === 'error') return null;
  if (!value) return <span className="option-next is-none">No openings in the next 2 weeks</span>;
  return (
    <span className="option-next">
      <span className="dot-live" aria-hidden="true" /> Next: {fmtDayRelative(value.date)}, {fmtTime(value.time)}
    </span>
  );
}
