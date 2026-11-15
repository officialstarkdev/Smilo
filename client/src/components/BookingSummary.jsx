import { useClinic } from '../context/ClinicContext.jsx';
import { fmtDateLong, fmtDuration, fmtPrice, fmtTime } from '../lib/format.js';
import Icon from './Icon.jsx';

function Row({ label, children, empty, onEdit }) {
  return (
    <div className={`sum-row ${empty ? 'sum-row-empty' : ''}`}>
      <dt>{label}</dt>
      <dd>
        <span>{empty ? empty : children}</span>
        {!empty && onEdit && (
          <button type="button" className="link-btn sum-edit" onClick={onEdit}>
            Change<span className="sr-only"> {label.toLowerCase()}</span>
          </button>
        )}
      </dd>
    </div>
  );
}

/**
 * The persistent "your visit so far" panel. On desktop it sits beside the
 * steps; on small screens it collapses into a one-line disclosure.
 */
export default function BookingSummary({ treatment, dentist, date, time, onEdit }) {
  const { clinic } = useClinic();
  const hrs = clinic.policy.cancelWindowMin / 60;
  const who = dentist === 'any' ? 'First available' : dentist?.name;
  const line = [treatment?.name, who, date && time ? `${fmtDateLong(date).split(' ').slice(0, 3).join(' ')}, ${fmtTime(time)}` : null]
    .filter(Boolean)
    .join(' · ');

  const body = (
    <>
      <dl className="sum-list">
        <Row label="Treatment" empty={!treatment && 'Not chosen yet'} onEdit={() => onEdit(1)}>
          <strong>{treatment?.name}</strong>
          <span className="sum-meta">
            {treatment && `${fmtDuration(treatment.duration)} · ${fmtPrice(treatment)}`}
          </span>
        </Row>
        <Row label="Dentist" empty={!dentist && '—'} onEdit={() => onEdit(2)}>
          <strong>{who}</strong>
          {dentist === 'any' && <span className="sum-meta">We’ll assign whoever is free</span>}
          {dentist && dentist !== 'any' && <span className="sum-meta">{dentist.title}</span>}
        </Row>
        <Row label="When" empty={!(date && time) && '—'} onEdit={() => onEdit(3)}>
          <strong>{date && fmtDateLong(date)}</strong>
          <span className="sum-meta">{time && `${fmtTime(time)}, about ${fmtDuration(treatment?.duration || 30)}`}</span>
        </Row>
      </dl>
      <p className="sum-note">
        <Icon name="shield" size={18} />
        <span>
          Free to move or cancel online up to {hrs} hour{hrs === 1 ? '' : 's'} before. No deposit, no account.
        </span>
      </p>
    </>
  );

  return (
    <aside className="summary" aria-label="Your appointment so far">
      <div className="summary-desktop">
        <h2 className="summary-title">Your visit</h2>
        {body}
      </div>
      <details className="summary-mobile">
        <summary>
          <span className="summary-mobile-label">Your visit</span>
          <span className="summary-mobile-line">{line || 'Nothing chosen yet'}</span>
          <Icon name="chevronDown" size={18} className="summary-chev" />
        </summary>
        {body}
      </details>
    </aside>
  );
}
