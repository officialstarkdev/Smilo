import { Link, useLocation, useParams } from 'react-router-dom';
import { telHref, useClinic } from '../context/ClinicContext.jsx';
import { downloadIcs, googleCalendarUrl, manageLink } from '../lib/calendar.js';
import { changeDeadline, useAppointment } from '../lib/appointment.js';
import { firstName } from '../lib/format.js';
import AppointmentDetails from '../components/AppointmentDetails.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import Icon from '../components/Icon.jsx';

export default function Booked() {
  const { token } = useParams();
  const { state: navState } = useLocation();
  const { clinic } = useClinic();
  const [{ status, appt, error }] = useAppointment(token, navState?.appointment);

  if (status === 'loading') return <div className="page-loading">Pulling up your appointment…</div>;
  if (status === 'error') {
    return (
      <section className="container narrow page-pad">
        <h1 className="page-title">We couldn’t find that appointment</h1>
        <p className="lede">{error}</p>
        <Link to="/manage" className="btn btn-primary">
          Look it up with your code
        </Link>
      </section>
    );
  }

  const link = manageLink(appt.token);
  const isFirst = appt.patient.newPatient;
  const tips = [
    isFirst && 'Arrive about 10 minutes early. There’s a short health form for first visits.',
    'Bring your insurance card, if you have one, and a list of any medications you take.',
    appt.concerns?.includes('anxiety') &&
      `You mentioned feeling nervous. ${appt.dentist ? firstName(appt.dentist.name) : 'Your dentist'} will start with a chat, and you can ask to pause at any time.`,
    appt.concerns?.includes('insurance') && 'We’ll check your insurance cover before you arrive and call if anything’s unclear.',
    (appt.urgent || appt.concerns?.includes('pain')) &&
      `If the pain gets worse before then, call ${clinic.phone}. We may be able to see you sooner.`,
    appt.urgent && 'If swelling starts to affect your breathing or swallowing, go to the ER straight away.',
  ].filter(Boolean);

  return (
    <section className="confirm">
      <div className="container confirm-grid">
        <div className="confirm-main">
          <Eyebrow>
            <Icon name="check" size={16} /> Appointment confirmed
          </Eyebrow>
          <h1 className="page-title">You’re booked, {firstName(appt.patient.name)}.</h1>
          <p className="lede">
            We’ve emailed the details to <strong>{appt.patient.email}</strong>. Keep your booking code handy, because
            you’ll need it with your email to make changes.
          </p>
          <AppointmentDetails appt={appt} />
        </div>

        <aside className="confirm-side">
          <div className="side-card">
            <h2 className="side-h">Add it to your calendar</h2>
            <div className="stack-sm">
              <button type="button" className="btn btn-ghost btn-block" onClick={() => downloadIcs(appt, clinic, link)}>
                <Icon name="download" size={18} /> Apple / Outlook (.ics)
              </button>
              <a className="btn btn-ghost btn-block" href={googleCalendarUrl(appt, clinic, link)} target="_blank" rel="noreferrer">
                <Icon name="external" size={18} /> Google Calendar
              </a>
            </div>
          </div>

          <div className="side-card">
            <h2 className="side-h">Need to change something?</h2>
            <p>
              Move or cancel online until <strong>{changeDeadline(appt, clinic.policy.cancelWindowMin)}</strong>. After that,
              just call us on <a href={telHref(clinic.phone)}>{clinic.phone}</a>.
            </p>
            <Link to={`/manage/${appt.token}`} className="link-arrow">
              Manage this appointment <Icon name="arrowRight" size={16} />
            </Link>
          </div>

          <div className="side-card side-card-soft">
            <h2 className="side-h">Before you come</h2>
            <ul className="tips">
              {tips.map((t) => (
                <li key={t}>
                  <Icon name="leaf" size={18} /> <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
