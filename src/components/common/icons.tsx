import type { SVGProps } from 'react'

/** Brand icons drawn inline (lucide no longer ships brand marks). */
type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
})

export const FacebookIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H7v3h2v9h3v-9h2.5l.5-3h-3V6.8c0-.5.3-.8.8-.8H15V3Z" />
  </svg>
)

export const InstagramIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
  </svg>
)

export const TwitterIcon = (props: IconProps) => (
  <svg {...base(props)} fill="currentColor" stroke="none">
    <path d="M22 5.9c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.7a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5 0 2 1.4 3.7 3.3 4.1-.6.2-1.2.2-1.9.1.5 1.6 2.1 2.8 3.9 2.9A8.2 8.2 0 0 1 2 18.4 11.6 11.6 0 0 0 8.3 20c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2Z" />
  </svg>
)

export const LinkedinIcon = (props: IconProps) => (
  <svg {...base(props)} fill="currentColor" stroke="none">
    <path d="M6.9 8.6H3.6V20h3.3V8.6ZM5.3 3.5a1.9 1.9 0 1 0 0 3.9 1.9 1.9 0 0 0 0-3.9ZM20.4 13.4c0-3.1-1.7-4.9-4.2-4.9-1.6 0-2.6.9-3 1.6V8.6H9.9V20h3.3v-5.7c0-1.5.3-2.9 2.1-2.9 1.8 0 1.8 1.7 1.8 3V20h3.3v-6.6Z" />
  </svg>
)

export const YoutubeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
    <path d="m10 9.2 5 2.8-5 2.8V9.2Z" fill="currentColor" />
  </svg>
)

export const GoogleIcon = (props: IconProps) => (
  <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden {...props}>
    <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z" />
    <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z" />
    <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z" />
  </svg>
)

export const FacebookColorIcon = (props: IconProps) => (
  <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden {...props}>
    <path fill="#1877F2" d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H7v3h2v9h3v-9h2.5l.5-3h-3V6.8c0-.5.3-.8.8-.8H15V3Z" />
  </svg>
)

export function ThankYouIcon(props: IconProps) {
  return (
    <svg width={84} height={100} viewBox="0 0 84 100" fill="none" aria-hidden {...props}>
      <g stroke="var(--primary)" strokeWidth={3} strokeLinejoin="round">
        <path d="M6 44v50h72V44" />
        <path d="M6 44 42 70l36-26" />
        <path d="M6 94l28-24M78 94 50 70" />
        <rect x="12" y="8" width="60" height="44" rx="3" fill="var(--card)" />
        <path d="M36 8c0-4 12-4 12 0" />
      </g>
      <text
        x="42"
        y="27"
        textAnchor="middle"
        fill="var(--primary)"
        fontFamily="inherit"
        fontWeight={800}
        fontSize={13}
      >
        THANK
      </text>
      <text x="42" y="42" textAnchor="middle" fill="var(--primary)" fontFamily="inherit" fontWeight={800} fontSize={13}>
        YOU
      </text>
    </svg>
  )
}
