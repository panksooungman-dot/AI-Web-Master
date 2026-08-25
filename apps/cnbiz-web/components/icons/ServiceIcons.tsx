import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function iconProps(props: IconProps): IconProps {
  return {
    "aria-hidden": true,
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.6,
    stroke: "currentColor",
    ...props,
  };
}

export function ConsultingIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="8.25" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M14.5 9.5 12.7 12.7 9.5 14.5l1.8-3.2 3.2-1.8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function AiIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="7.5" y="7.5" width="9" height="9" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M12 3.75v2.25M12 18v2.25M20.25 12H18M6 12H3.75M17.25 6.75 15.5 8.5M8.5 15.5l-1.75 1.75M17.25 17.25 15.5 15.5M8.5 8.5 6.75 6.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DevelopmentIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9 8 5 12l4 4M15 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloudIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrendingUpIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
