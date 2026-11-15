import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtDateLong, todayStr } from '../lib/format.js';
import Eyebrow from '../components/Eyebrow.jsx';
import Schedule from './admin/Schedule.jsx';
import TreatmentsAdmin from './admin/TreatmentsAdmin.jsx';
import TeamAdmin from './admin/TeamAdmin.jsx';
import RoomsAdmin from './admin/RoomsAdmin.jsx';

const TABS = [
  { id: 'schedule', label: 'Schedule', admin: false },
  { id: 'treatments', label: 'Treatments', admin: true },
  { id: 'team', label: 'Team & hours', admin: true },
  { id: 'rooms', label: 'Rooms', admin: true },
];

/** Staff view. Front desk sees the schedule; admins also edit the catalogue. */
export default function Admin() {
  const { user } = useAuth();
  const tabs = TABS.filter((t) => !t.admin || user.role === 'admin');
  const [tab, setTab] = useState('schedule');

  const onKey = (e) => {
    // Arrow-key navigation between tabs (WAI-ARIA tabs pattern)
    const i = tabs.findIndex((t) => t.id === tab);
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    setTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <section className="container staff page-pad">
      <div className="staff-head">
        <div>
          <Eyebrow>Staff view · {user.role === 'admin' ? 'Admin' : 'Front desk'}</Eyebrow>
          <h1 className="page-title">{fmtDateLong(todayStr())}</h1>
        </div>
        <p className="muted">Signed in as {user.name}</p>
      </div>

      <div className="tabs" role="tablist" aria-label="Staff sections" onKeyDown={onKey}>
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={`tab ${tab === t.id ? 'is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tabpanel">
        {tab === 'schedule' && <Schedule />}
        {tab === 'treatments' && <TreatmentsAdmin />}
        {tab === 'team' && <TeamAdmin />}
        {tab === 'rooms' && <RoomsAdmin />}
      </div>
    </section>
  );
}
