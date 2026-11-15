import { useState } from 'react';
import { useClinic } from '../context/ClinicContext.jsx';
import { CONCERN_LABELS, fmtDateLong, fmtDuration, fmtPrice, fmtTime } from '../lib/format.js';
import { Portrait } from './Shapes.jsx';
import Icon from './Icon.jsx';

export function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked; the code is still visible to copy by hand */
    }
  };
  return (
    <span className="code">
      <span className="code-value">{code}</span>
      <button type="button" className="icon-btn icon-btn-sm" onClick={copy} aria-label={`Copy booking code ${code}`}>
        <Icon name={copied ? 'check' : 'copy'} size={18} />
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </span>
  );
}

/** Read-only appointment card used on the confirmation and manage pages. */
export default function AppointmentDetails({ appt, dimmed = false }) {
  const { clinic } = useClinic();
  const a = clinic.address;

  return (
    <div className={`appt ${dimmed ? 'appt-dimmed' : ''}`}>
      <div className="appt-when">
        <p className="appt-date">{fmtDateLong(appt.date)}</p>
        <p className="appt-time">
          {fmtTime(appt.start)} – {fmtTime(appt.end)}
        </p>
      </div>

      <dl className="appt-list">
        <div>
          <dt>Treatment</dt>
          <dd>
            {appt.treatment.name}
            <span className="appt-meta">
              {fmtDuration(appt.treatment.duration)} · {fmtPrice(appt.treatment)}
            </span>
          </dd>
        </div>
        {appt.dentist && (
          <div className="appt-dentist">
            <dt>With</dt>
            <dd>
              <Portrait name={appt.dentist.name} photo={appt.dentist.photo} size={44} index={appt.dentist.name.length} />
              <span>
                {appt.dentist.name}
                <span className="appt-meta">{appt.dentist.title}</span>
              </span>
            </dd>
          </div>
        )}
        <div>
          <dt>Where</dt>
          <dd>
            {clinic.legalName}
            <span className="appt-meta">
              {a.line1}, {a.city}
            </span>
          </dd>
        </div>
        <div>
          <dt>Booking code</dt>
          <dd>
            <CopyCode code={appt.code} />
          </dd>
        </div>
        {(appt.concerns?.length > 0 || appt.notes) && (
          <div>
            <dt>You told us</dt>
            <dd>
              {appt.concerns?.map((c) => (
                <span key={c} className="tag">
                  {CONCERN_LABELS[c]}
                </span>
              ))}
              {appt.notes && <span className="appt-notes">“{appt.notes}”</span>}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
