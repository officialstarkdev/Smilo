import { Link } from 'react-router-dom';
import { telHref, useClinic } from '../context/ClinicContext.jsx';
import { fmtTime } from '../lib/format.js';
import Logo from './Logo.jsx';

export default function Footer() {
  const { clinic } = useClinic();
  const a = clinic.address;
  const open = clinic.hours.filter((h) => h.open);

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo light />
          <p className="footer-tag">
            A small, unhurried dental studio in the Mission. We’ll see you whether it’s been six months or six years.
          </p>
        </div>

        <div>
          <h2 className="footer-h">Find us</h2>
          <address className="footer-text">
            {a.line1}
            <br />
            {a.city}, {a.region} {a.postal}
          </address>
          <p className="footer-text">
            <a href={telHref(clinic.phone)}>{clinic.phone}</a>
            <br />
            <a href={`mailto:${clinic.email}`}>{clinic.email}</a>
          </p>
        </div>

        <div>
          <h2 className="footer-h">Hours</h2>
          <ul className="footer-hours">
            {open.map((h) => (
              <li key={h.day}>
                <span>{h.label.slice(0, 3)}</span>
                <span>
                  {fmtTime(h.open)} – {fmtTime(h.close)}
                </span>
              </li>
            ))}
            {open.length > 0 && (
              <li>
                <span>Sun</span>
                <span>Closed</span>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="footer-h">Your visit</h2>
          <ul className="footer-links">
            <li>
              <Link to="/book">Book an appointment</Link>
            </li>
            <li>
              <Link to="/book?urgent=1">Same-day emergency</Link>
            </li>
            <li>
              <Link to="/manage">Move or cancel</Link>
            </li>
            <li>
              <Link to="/staff/login">Staff sign-in</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container footer-bar">
        <p>
          In severe pain out of hours? Call {clinic.phone} and the message will give you the on-call dentist’s number.
          If you have swelling that affects your breathing or swallowing, call 911.
        </p>
        <p>© {new Date().getFullYear()} {clinic.legalName}</p>
      </div>
    </footer>
  );
}
