const LABELS = { confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed' };

export default function StatusPill({ status }) {
  return <span className={`pill pill-${status}`}>{LABELS[status] || status}</span>;
}
