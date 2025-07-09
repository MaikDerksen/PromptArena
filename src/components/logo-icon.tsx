import React from 'react';

export const LogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient
        id="logo-blue-swoosh"
        x1="12.5"
        y1="12"
        x2="49"
        y2="51"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="hsl(var(--primary))" />
        <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
      </linearGradient>
      <linearGradient
        id="logo-orange-swoosh"
        x1="51.5"
        y1="12"
        x2="15"
        y2="51"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="hsl(var(--accent))" />
        <stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    <circle
      cx="32"
      cy="32"
      r="28"
      stroke="hsl(var(--border))"
      strokeWidth="4"
    />
    <path
      d="M16 48C24 32 48 48 48 16"
      stroke="url(#logo-blue-swoosh)"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M48 48C40 32 16 48 16 16"
      stroke="url(#logo-orange-swoosh)"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
