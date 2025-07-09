import React from 'react';

export const LogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient
        id="logo-gradient"
        x1="0"
        y1="0"
        x2="28"
        y2="28"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#EF4444" />
      </linearGradient>
    </defs>
    <path
      d="M24.5 3.5H3.5C3.22386 3.5 3 3.72386 3 4V24C3 24.2761 3.22386 24.5 3.5 24.5H24.5C24.7761 24.5 25 24.2761 25 24V4C25 3.72386 24.7761 3.5 24.5 3.5Z"
      stroke="url(#logo-gradient)"
      strokeWidth="2"
    />
    <path
      d="M11.9167 9.83333C11.543 9.29367 10.708 9.17664 10.1683 9.55033L8.03812 10.9654C7.58514 11.2783 7.7478 11.9619 8.25221 12.1643L14.7371 14.8021C15.0567 14.9317 15.2678 15.2759 15.2346 15.6171L14.7676 20.3323C14.7131 20.8872 15.3957 21.2335 15.8459 20.9419L19.4975 18.7181C20.0099 18.3887 20.1444 17.6521 19.742 17.185L15.6587 12.2173C15.3188 11.7997 14.6467 11.7107 14.1953 12.0494L11.9167 9.83333Z"
      fill="url(#logo-gradient)"
    />
  </svg>
);
