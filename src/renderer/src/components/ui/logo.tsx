import * as React from 'react'

/** Deskup mark — keep in sync with resources/icon.svg (the source for app/tray icons). */
export function Logo({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="Deskup">
      <rect width="512" height="512" rx="116" fill="#3753df" />
      <g fill="#fff">
        <rect x="120" y="148" width="116" height="116" rx="30" opacity="0.5" />
        <rect x="120" y="292" width="116" height="116" rx="30" opacity="0.5" />
        <rect x="264" y="292" width="116" height="116" rx="30" opacity="0.5" />
        <rect x="276" y="104" width="116" height="116" rx="30" />
      </g>
    </svg>
  )
}
