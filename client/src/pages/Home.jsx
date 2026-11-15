import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { telHref, useClinic } from '../context/ClinicContext.jsx';
import { firstName, fmtDayRelative, fmtDuration, fmtPrice, fmtTime } from '../lib/format.js';
import Eyebrow from '../components/Eyebrow.jsx';
import Icon from '../components/Icon.jsx';
import Reveal from '../components/Reveal.jsx';
import { MapPlaceholder, PhotoPlaceholder, Portrait } from '../components/Shapes.jsx';

const CATEGORY_LABEL = {
  preventive: 'Routine care',
  cosmetic: 'Cosmetic',
  restorative: 'Repair',
  orthodontic: 'Straightening',
  urgent: 'Urgent',
};

/* ------------------------------------------------------------------ */

function NextOpening({ treatment }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    if (!treatment) return;
    api
      .get(`/appointments/earliest?treatmentId=${treatment._id}&limit=1`)
      .then((r) => setState({ status: 'ready', slot: r.data.slots[0] }))
      .catch(() => setState({ status: 'error' }));
  }, [treatment]);

  if (!treatment || state.status === 'error' || (state.status === 'ready' && !state.slot)) return null;
  const s = state.slot;
  return (
    <div className="next-card" aria-live="polite">
      <p className="next-label">
        <span className="dot-live" aria-hidden="true" /> Next {treatment.name.toLowerCase().replace(' & exam', '')}
      </p>
      {state.status === 'loading' ? (
        <p className="next-when skeleton-text">Checking the book…</p>
      ) : (
        <>
          <p className="next-when">
            {fmtDayRelative(s.date)}, {fmtTime(s.time)}
          </p>
          <p className="next-who">with {s.dentist.name}</p>
          <Link
            className="next-link"
            to={`/book?treatment=${treatment._id}&dentist=${s.dentist._id}&date=${s.date}&time=${s.time}`}
          >
            Take this time <Icon name="arrowRight" size={16} />
          </Link>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const FAQ = (hrs) => [
  {
    q: 'It’s been years since I saw a dentist. Is that a problem?',
    a: 'Not at all, and you’re far from the only one. We start with a check-up, tell you honestly what we find, and put together a plan you can take at your own pace. No lectures.',
  },
  {
    q: 'I get really nervous. What can you do?',
    a: 'Tell us when you book. We’ll explain each step before we do it, agree a stop signal, and take breaks whenever you need. There are headphones and a ceiling screen in every room, and we can book you a longer slot so nothing feels rushed.',
  },
  {
    q: 'Do you take my insurance?',
    a: 'We work with most PPO dental plans and file the claim for you. Not sure about yours? Tick “I have a question about insurance” when you book and we’ll check your cover before you come in, so there are no surprises.',
  },
  {
    q: 'How much will it cost?',
    a: 'Prices are listed next to each treatment. For bigger work like a root canal, you get a written estimate before anything starts, and you’re free to take it home and think about it.',
  },
  {
    q: 'How do I move or cancel?',
    a: `Use the link in your confirmation email, or enter your booking code under Manage booking. You can change things online up to ${hrs} hour${hrs === 1 ? '' : 's'} before. After that, give us a call and we’ll sort it out.`,
  },
  {
    q: 'What counts as an emergency?',
    a: 'Toothache that keeps you up at night, swelling, a cracked or knocked-out tooth, or a lost filling or crown. Book an Emergency Visit and we’ll show the soonest times, because we keep some free every day. If swelling affects your breathing or swallowing, go straight to the ER.',
  },
  {
    q: 'Do you see children?',
    a: 'Yes, from about age three. Book a regular check-up and add their age in the notes. Dr. Okafor sees most of our younger patients.',
  },
];

/* ------------------------------------------------------------------ */

export default function Home() {
  const { clinic } = useClinic();
  const [treatments, setTreatments] = useState(null);
  const [dentists, setDentists] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/treatments'), api.get('/dentists')])
      .then(([t, d]) => {
        setTreatments(t.data.treatments);
        setDentists(d.data.dentists);
      })
      .catch(() => setLoadError(true));
  }, []);

  const checkup = treatments?.find((t) => t.category === 'preventive') || treatments?.[0];
  const hrs = clinic.policy.cancelWindowMin / 60;
  const todayDow = new Date().getDay();
  const a = clinic.address;

  return (
    <>
      {/* ------------------------------ Hero ------------------------------ */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <Eyebrow>Dental studio · Mission District, San Francisco</Eyebrow>
            <h1 className="hero-title">
              A calmer kind of <em>dental visit.</em>
            </h1>
            <p className="hero-lede">
              Check-ups, cleanings and the bigger work too, at a pace that suits you. No judgment, ever, whether it’s
              been six months or six years.
            </p>
            <div className="hero-actions">
              <Link to="/book" className="btn btn-primary btn-lg">
                Book an appointment <Icon name="arrowRight" size={18} />
              </Link>
              <Link to="/book?urgent=1" className="btn-text">
                <Icon name="pulse" size={18} /> In pain today? See same-day times
              </Link>
            </div>
            <ul className="hero-facts">
              <li>
                <Icon name="clock" size={18} /> Most check-ups take about 30 minutes
              </li>
              <li>
                <Icon name="calendar" size={18} /> Open until 7:30 pm on Wednesdays
              </li>
              <li>
                <Icon name="user" size={18} /> No account needed to book
              </li>
            </ul>
          </div>

          <div className="hero-visual">
            <PhotoPlaceholder caption="Photo: Room 1, looking out to the garden" />
            <span className="hero-blob" aria-hidden="true" />
            <NextOpening treatment={checkup} />
          </div>
        </div>
      </section>

      {loadError && (
        <div className="container">
          <p className="banner banner-error" role="alert">
            <Icon name="alert" /> We couldn’t load treatments and availability just now. You can still call us on{' '}
            <a href={telHref(clinic.phone)}>{clinic.phone}</a>.
          </p>
        </div>
      )}

      {/* --------------------------- Treatments --------------------------- */}
      <section className="section" id="treatments" aria-labelledby="treatments-h">
        <div className="container split">
          <Reveal className="split-aside">
            <Eyebrow num="01">Treatments</Eyebrow>
            <h2 id="treatments-h" className="section-title">
              What we can help with
            </h2>
            <p className="section-lede">
              Not sure what you need? Book a check-up. We’ll take a look, explain what we see, and only suggest what’s
              worth doing.
            </p>
            <p className="aside-note">
              <Icon name="info" size={18} /> Prices are what most people pay. Anything bigger gets a written estimate
              first.
            </p>
          </Reveal>

          <div className="treat-list">
            {!treatments && !loadError &&
              Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton skeleton-treat" aria-hidden="true" />)}
            {treatments?.map((t, i) => (
              <Reveal key={t._id} delay={Math.min(i, 4) * 50}>
                <Link to={`/book?treatment=${t._id}`} className={`treat ${t.category === 'urgent' ? 'treat-urgent' : ''}`}>
                  <span className="treat-cat">{CATEGORY_LABEL[t.category]}</span>
                  <span className="treat-main">
                    <span className="treat-name">{t.name}</span>
                    <span className="treat-summary">{t.summary}</span>
                    <span className="treat-desc">{t.description}</span>
                  </span>
                  <span className="treat-meta">
                    <span>
                      <Icon name="clock" size={16} /> {fmtDuration(t.duration)}
                    </span>
                    <span className="treat-price">{fmtPrice(t)}</span>
                  </span>
                  <span className="treat-go" aria-hidden="true">
                    <Icon name="arrowRight" size={20} />
                  </span>
                  <span className="sr-only">Book {t.name}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ Team ------------------------------ */}
      <section className="section section-band" id="team" aria-labelledby="team-h">
        <div className="container">
          <Reveal className="section-head">
            <Eyebrow num="02">The team</Eyebrow>
            <h2 id="team-h" className="section-title">
              The people you’ll actually see
            </h2>
            <p className="section-lede">
              Four clinicians, and the same faces every visit. Ask for someone by name, or take whoever is free first.
            </p>
          </Reveal>

          <ul className="team">
            {!dentists && !loadError &&
              Array.from({ length: 4 }, (_, i) => <li key={i} className="skeleton skeleton-person" aria-hidden="true" />)}
            {dentists?.map((d, i) => (
              <Reveal as="li" key={d._id} className="person" delay={i * 70}>
                <Portrait name={d.name} photo={d.photo} index={i} size={180} />
                <div className="person-body">
                  <h3 className="person-name">{d.name}</h3>
                  <p className="person-title">
                    {d.title}
                    {d.credentials && <span className="person-cred">, {d.credentials}</span>}
                  </p>
                  <p className="person-bio">{d.bio}</p>
                  {d.languages?.length > 0 && <p className="person-lang">Speaks {d.languages.join(' and ')}</p>}
                  <Link to={`/book?dentist=${d._id}`} className="link-arrow">
                    Book with {firstName(d.name)} <Icon name="arrowRight" size={16} />
                  </Link>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------- How it works -------------------------- */}
      <section className="section" aria-labelledby="how-h">
        <div className="container">
          <Reveal className="section-head">
            <Eyebrow num="03">Booking</Eyebrow>
            <h2 id="how-h" className="section-title">
              Three steps, about two minutes
            </h2>
          </Reveal>

          <div className="how">
            <ol className="how-steps">
              {[
                ['Choose what you need', 'Pick a treatment, or a check-up if you’re not sure. Prices are listed upfront.'],
                [
                  'Pick a time that’s really free',
                  'You’re looking at the live diary. Choose a dentist, or take the first person available.',
                ],
                [
                  'Get a confirmation with a link',
                  `Move or cancel from that link up to ${hrs} hour${hrs === 1 ? '' : 's'} before. No account, no password to forget.`,
                ],
              ].map(([title, body], i) => (
                <Reveal as="li" key={title} className="how-step" delay={i * 80}>
                  <span className="how-num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="how-title">{title}</h3>
                  <p>{body}</p>
                </Reveal>
              ))}
            </ol>

            <Reveal className="how-aside">
              <Icon name="heart" size={22} />
              <h3>Coming in nervous?</h3>
              <p>
                Tick “I get nervous at the dentist” when you book. We’ll leave extra time, talk you through each step before
                we start it, and agree a signal for when you want to pause.
              </p>
            </Reveal>
          </div>

          <div className="how-cta">
            <Link to="/book" className="btn btn-primary">
              Start booking
            </Link>
            <span className="muted">
              or call <a href={telHref(clinic.phone)}>{clinic.phone}</a>
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------ Visit ----------------------------- */}
      <section className="section section-band" id="visit" aria-labelledby="visit-h">
        <div className="container visit">
          <Reveal className="visit-info">
            <Eyebrow num="04">Visit</Eyebrow>
            <h2 id="visit-h" className="section-title">
              Find us on Alder Street
            </h2>
            <address className="visit-address">
              <Icon name="pin" size={20} />
              <span>
                {clinic.legalName}
                <br />
                {a.line1}
                <br />
                {a.city}, {a.region} {a.postal}
              </span>
            </address>
            {clinic.directions && <p className="visit-directions">{clinic.directions}</p>}
            <p className="visit-contact">
              <a href={telHref(clinic.phone)}>
                <Icon name="phone" size={18} /> {clinic.phone}
              </a>
              <a href={`mailto:${clinic.email}`}>
                <Icon name="mail" size={18} /> {clinic.email}
              </a>
            </p>
          </Reveal>

          <Reveal className="visit-hours" delay={80}>
            <h3 className="visit-hours-h">Opening hours</h3>
            <table className="hours">
              <caption className="sr-only">Opening hours by day</caption>
              <tbody>
                {clinic.hours.map((h) => (
                  <tr key={h.day} className={h.day === todayDow ? 'is-today' : ''}>
                    <th scope="row">
                      {h.label}
                      {h.day === todayDow && <span className="today-tag">Today</span>}
                    </th>
                    <td>
                      {h.open ? `${fmtTime(h.open)} – ${fmtTime(h.close)}` : 'Closed'}
                      {h.note && <span className="hours-note">{h.note}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>

          <Reveal className="visit-map" delay={140}>
            <MapPlaceholder label={`Map showing ${clinic.legalName} on ${a.line1}`} />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------- FAQ ------------------------------ */}
      <section className="section" id="faq" aria-labelledby="faq-h">
        <div className="container split">
          <Reveal className="split-aside">
            <Eyebrow num="05">Questions</Eyebrow>
            <h2 id="faq-h" className="section-title">
              Things people ask before a first visit
            </h2>
            <p className="section-lede">
              Something else on your mind? Call <a href={telHref(clinic.phone)}>{clinic.phone}</a>. A real person
              picks up during opening hours.
            </p>
          </Reveal>
          <div className="faq">
            {FAQ(hrs).map((f) => (
              <details key={f.q} className="faq-item">
                <summary>
                  <span>{f.q}</span>
                  <Icon name="plus" size={20} className="faq-icon" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------- Closing ---------------------------- */}
      <section className="closing">
        <div className="container closing-inner">
          <h2 className="closing-title">
            Ready when you are. <em>Even if it’s been a while.</em>
          </h2>
          <Link to="/book" className="btn btn-light btn-lg">
            Book an appointment <Icon name="arrowRight" size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
