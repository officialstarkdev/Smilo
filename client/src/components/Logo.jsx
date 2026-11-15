import { Link } from 'react-router-dom';

/** Wordmark: a quiet smile arc in a circle, not a tooth. */
export default function Logo({ onClick, light = false }) {
  return (
    <Link to="/" className={`logo ${light ? 'logo-light' : ''}`} onClick={onClick} aria-label="Smilo, home">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <circle cx="16" cy="16" r="15" className="logo-disc" />
        <path d="M9 17.5c1.8 3 4.3 4.5 7 4.5s5.2-1.5 7-4.5" className="logo-smile" />
        <circle cx="21.5" cy="11" r="1.8" className="logo-dot" />
      </svg>
      <span className="logo-word">Smilo</span>
    </Link>
  );
}
