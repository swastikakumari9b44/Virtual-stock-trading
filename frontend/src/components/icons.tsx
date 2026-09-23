import type { ReactNode, SVGProps } from "react";

function Svg({ children, ...p }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      {children}
    </svg>
  );
}

export const DashboardIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Svg>
);
export const MarketsIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M3 17l5-6 4 3 8-9" />
    <path d="M3 21h18" />
  </Svg>
);
export const PortfolioIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
    <path d="M3 13h18" />
  </Svg>
);
export const HistoryIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </Svg>
);
export const PlayIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" />
  </Svg>
);
export const PauseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </Svg>
);
export const StepBackIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <rect x="5" y="5" width="2.5" height="14" rx="1" />
    <path d="M19 5.6v12.8a.8.8 0 01-1.25.66L9.5 12.66a.8.8 0 010-1.32l8.25-5.4A.8.8 0 0119 5.6z" />
  </Svg>
);
export const StepForwardIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
    <path d="M5 5.6v12.8a.8.8 0 001.25.66l8.25-5.4a.8.8 0 000-1.32L6.25 5.94A.8.8 0 005 5.6z" />
  </Svg>
);
export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);
export const LogoMark = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden {...p}>
    <rect width="32" height="32" rx="7" fill="#0E5A78" />
    <path d="M6 22l6-7 5 4 9-11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
