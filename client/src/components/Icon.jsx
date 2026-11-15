// Hand-drawn 24px line icons. 1.6 stroke, round joins, inherit currentColor.
const PATHS = {
  arrowRight: <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />,
  arrowLeft: <path d="M19 12H6M11 6.5 5.5 12l5.5 5.5" />,
  chevronDown: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  chevronLeft: <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />,
  chevronRight: <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />,
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  menu: <path d="M4 7.5h16M4 12h16M4 16.5h10" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.75" y="5.25" width="16.5" height="15" rx="3" />
      <path d="M3.75 10h16.5M8 3.5v3.5M16 3.5v3.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.75-5.6-6.75-11.25a6.75 6.75 0 0 1 13.5 0C18.75 15.4 12 21 12 21Z" />
      <circle cx="12" cy="9.75" r="2.4" />
    </>
  ),
  phone: (
    <path d="M6.6 3.8 9 3.5l1.6 4-2 1.4a11 11 0 0 0 6.5 6.5l1.4-2 4 1.6-.3 2.4a2.2 2.2 0 0 1-2.3 1.9C10.9 18.9 5.1 13.1 4.7 6.1a2.2 2.2 0 0 1 1.9-2.3Z" />
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.75 20c.9-3.6 3.8-5.5 7.25-5.5s6.35 1.9 7.25 5.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3" />
    </>
  ),
  pulse: <path d="M3 12h4l2.2-5 3.6 10 2.4-5H21" />,
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 14-14-.5 9-5.5 14-13 14H5Z" />
      <path d="M5 19c3-4 6-6.5 9.5-8.5" />
    </>
  ),
  heart: <path d="M12 19.5s-7.5-4.4-7.5-10A4.25 4.25 0 0 1 12 7a4.25 4.25 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" />,
  shield: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6l-7-2.5Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  chat: <path d="M5 17.5 3.75 20.5 8 19a8.5 8.5 0 1 0-3-1.5Z" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />,
  external: <path d="M13.5 4.5H19.5V10.5M19 5l-8 8M10 5.5H6.5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V14" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.75v5M12 16.1v.15" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11v5.25M12 7.9v.15" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.25" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  door: (
    <>
      <path d="M6 20.5V4.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16M3.5 20.5h17" />
      <circle cx="14.5" cy="12.5" r=".6" />
    </>
  ),
  edit: <path d="M4.5 19.5 5.25 15.75 15.5 5.5a2.1 2.1 0 0 1 3 3L8.25 18.75 4.5 19.5ZM13.5 7.5l3 3" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  logout: <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10M15 8l4 4-4 4M19 12H9.5" />,
};

export default function Icon({ name, size = 20, className = '', title, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
