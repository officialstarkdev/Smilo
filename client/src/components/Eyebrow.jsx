/** Small section label, e.g. "02 · The team". */
export default function Eyebrow({ children, num, light = false, as: Tag = 'p' }) {
  return (
    <Tag className={`eyebrow ${light ? 'eyebrow-light' : ''}`}>
      {num && <span className="eyebrow-num">{num}</span>}
      {children}
    </Tag>
  );
}
