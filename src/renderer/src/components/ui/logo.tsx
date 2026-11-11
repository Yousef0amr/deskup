import * as React from 'react'

/** Deskup mark — keep in sync with resources/icon.svg (the source for app/tray icons). */
export function Logo({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="Deskup">
      <rect width="512" height="512" rx="116" fill="#3753df" />
      <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="44">
        <polyline points="160,300 256,212 352,300" opacity="0.55" />
        <polyline points="160,212 256,124 352,212" />
      </g>
      <rect x="128" y="356" width="256" height="40" rx="20" fill="#fff" />
    </svg>
  )
}
