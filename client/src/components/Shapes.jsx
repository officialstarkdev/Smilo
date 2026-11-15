import { useId, useState } from 'react';
import { initials } from '../lib/format.js';

// Organic blob outlines (200×200). Each dentist gets a different one.
const BLOBS = [
  'M100 8c34 0 63 17 79 45s14 66-6 94-52 45-82 45S29 175 15 146 1 81 18 53 66 8 100 8Z',
  'M106 6c33 3 62 25 77 54s11 66-11 92-52 42-82 40-57-21-74-50-17-63 0-92 57-47 90-44Z',
  'M96 10c30-3 64 12 81 39s19 63 4 92-45 51-79 52-63-16-79-45S4 82 22 55 66 13 96 10Z',
  'M100 12c38 0 66 10 80 40s9 70-11 95-53 41-80 41-56-14-72-42S2 78 20 51 62 12 100 12Z',
];
const TONES = [
  ['var(--teal-100)', 'var(--teal-800)'],
  ['var(--coral-100)', 'var(--coral-700)'],
  ['var(--paper-deep)', 'var(--teal-700)'],
  ['var(--teal-50)', 'var(--teal-900)'],
];

/** Dentist portrait: their photo inside a blob, or a tasteful initials placeholder. */
export function Portrait({ name, photo, index = 0, size = 160, className = '' }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, ''); // colons break url(#id)
  const [failed, setFailed] = useState(false);
  const blob = BLOBS[index % BLOBS.length];
  const [bg, fg] = TONES[index % TONES.length];
  const showPhoto = photo && !failed;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`portrait ${className}`}
      role="img"
      aria-label={showPhoto ? `Photo of ${name}` : `${name} (photo coming soon)`}
    >
      <defs>
        <clipPath id={`clip${id}`}>
          <path d={blob} />
        </clipPath>
      </defs>
      <path d={blob} fill={bg} />
      {showPhoto ? (
        <image
          href={photo}
          width="200"
          height="200"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#clip${id})`}
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          {/* fine contour lines echo the blob, like a topographic sketch */}
          <path d={blob} fill="none" stroke={fg} strokeOpacity=".16" strokeWidth="1" transform="translate(100 100) scale(.82) translate(-100 -100)" />
          <path d={blob} fill="none" stroke={fg} strokeOpacity=".1" strokeWidth="1" transform="translate(100 100) scale(.64) translate(-100 -100)" />
          <text x="100" y="100" dy=".35em" textAnchor="middle" className="portrait-initials" fill={fg}>
            {initials(name)}
          </text>
        </>
      )}
    </svg>
  );
}

/** Arch-shaped photo placeholder: soft shapes plus a caption saying what goes here. */
export function PhotoPlaceholder({ caption = 'Photo', variant = 'room', className = '' }) {
  return (
    <figure className={`photo-ph photo-ph-${variant} ${className}`}>
      <svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="400" height="520" fill="var(--teal-100)" />
        <circle cx="290" cy="150" r="88" fill="var(--coral-100)" />
        <path d="M-20 360c80-40 150-40 220 0s150 40 220 0v200H-20Z" fill="var(--teal-200)" />
        <path d="M-20 420c80-34 150-34 220 0s150 34 220 0v120H-20Z" fill="var(--teal-300)" opacity=".55" />
        <path d="M60 330c10-60 40-110 90-140" fill="none" stroke="var(--teal-700)" strokeOpacity=".35" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M78 300c-18-6-30-20-34-40 20 0 34 12 34 40ZM100 262c-4-20 2-38 18-50 8 18 2 38-18 50Z" fill="var(--teal-700)" opacity=".28" />
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** Stylised street map with the clinic pin. Swap for a real map embed if you like. */
export function MapPlaceholder({ label }) {
  return (
    <figure className="map-ph">
      <svg viewBox="0 0 480 320" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
        <rect width="480" height="320" fill="var(--paper-deep)" />
        <path d="M300 30c60-10 130 20 150 70s-20 90-80 90-120-30-120-80 0-72 50-80Z" fill="var(--teal-100)" />
        <g stroke="var(--surface)" strokeLinecap="round" fill="none">
          <path d="M-10 120h500M-10 230h500" strokeWidth="18" />
          <path d="M120-10v340M330-10v340" strokeWidth="14" />
          <path d="M-10 40 490 300" strokeWidth="10" />
          <path d="M-10 175h500M225-10v340" strokeWidth="6" />
        </g>
        <g fill="var(--ink-faint)" fontFamily="var(--font-body)" fontSize="11" letterSpacing=".08em">
          <text x="16" y="113">ALDER ST</text>
          <text x="16" y="223">24TH ST</text>
          <text x="338" y="300" transform="rotate(-90 338 300)">VALENCIA</text>
        </g>
        <g transform="translate(225 120)">
          <circle r="30" fill="var(--coral-400)" opacity=".22" />
          <path d="M0 6s-13-11-13-22a13 13 0 0 1 26 0C13-5 0 6 0 6Z" fill="var(--teal-700)" transform="translate(0 -4)" />
          <circle cy="-20" r="4.5" fill="var(--paper)" />
        </g>
      </svg>
    </figure>
  );
}
