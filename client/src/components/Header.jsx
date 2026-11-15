import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { telHref, useClinic } from '../context/ClinicContext.jsx';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';

const LINKS = [
  { to: '/#treatments', label: 'Treatments' },
  { to: '/#team', label: 'Our team' },
  { to: '/#visit', label: 'Visit' },
  { to: '/#faq', label: 'FAQ' },
];

export default function Header() {
  const { user, logout } = useAuth();
  const { clinic } = useClinic();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const inBooking = pathname.startsWith('/book');

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
      <div className="container header-inner">
        <Logo onClick={close} />

        <nav className="header-nav" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="header-link">
              {l.label}
            </Link>
          ))}
          <NavLink to="/manage" className="header-link">
            Manage booking
          </NavLink>
        </nav>

        <div className="header-actions">
          {user && (
            <>
              <Link to="/staff" className="header-link header-staff">
                Staff view
              </Link>
              <button
                type="button"
                className="icon-btn"
                aria-label="Sign out of staff view"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <Icon name="logout" />
              </button>
            </>
          )}
          {!inBooking && (
            <Link to="/book" className="btn btn-primary btn-sm header-cta">
              Book an appointment
            </Link>
          )}
          <button
            type="button"
            className="icon-btn header-burger"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={`sheet ${open ? 'sheet-open' : ''}`} hidden={!open}>
        <nav className="sheet-nav" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="sheet-link" onClick={close}>
              {l.label}
            </Link>
          ))}
          <Link to="/manage" className="sheet-link" onClick={close}>
            Manage booking
          </Link>
          {user && (
            <Link to="/staff" className="sheet-link" onClick={close}>
              Staff view
            </Link>
          )}
        </nav>
        <div className="sheet-foot">
          <Link to="/book" className="btn btn-primary btn-block" onClick={close}>
            Book an appointment
          </Link>
          <a className="sheet-call" href={telHref(clinic.phone)}>
            <Icon name="phone" size={18} /> Prefer to talk? {clinic.phone}
          </a>
        </div>
      </div>
    </header>
  );
}
