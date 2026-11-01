// Small line-icon set (24x24, drawn to sit next to SF Symbols) plus the StudyHive mark.
const PATHS = {
  home: <path d="M3 10.6 12 3.2l9 7.4V19.5a1.5 1.5 0 0 1-1.5 1.5H15v-5.8H9V21H4.5A1.5 1.5 0 0 1 3 19.5z" />,
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.9" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.9" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.9" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.9" />
    </>
  ),
  star: <path d="m12 3.2 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.1l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.6-3.7 3.7-6 7.5-6s6.9 2.3 7.5 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />,
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />,
  externalLink: <path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />,
  paperclip: <path d="m20 11-8.2 8.2a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4L14.5 7" />,
  file: (
    <>
      <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" />
      <path d="M14 3.5V8h4.5" />
    </>
  ),
};

export default function Icon({ name, size = 22, filled = false, strokeWidth = 1.8, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

// The hive cell: a hexagon on a blue squircle. Same artwork as public/favicon.svg.
export function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sh-logo-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4aa8ff" />
          <stop offset="1" stopColor="#0071e3" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#sh-logo-bg)" />
      <path d="M32 12 49.3 22v20L32 52 14.7 42V22z" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M32 24.5 38.5 28.25v7.5L32 39.5l-6.5-3.75v-7.5z" fill="#fff" />
    </svg>
  );
}
