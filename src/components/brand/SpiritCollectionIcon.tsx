import { useId } from 'react'

interface SpiritCollectionIconProps {
  className?: string
}

/** 百灵收藏专属徽记：七颗灵珠环绕中央羽印。 */
export function SpiritCollectionIcon({ className = '' }: SpiritCollectionIconProps) {
  const id = useId().replace(/:/g, '')
  const jadeGradient = `${id}-jade`
  const goldGradient = `${id}-gold`
  const coreGlow = `${id}-glow`

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`spirit-collection-icon ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={jadeGradient} x1="9" y1="8" x2="39" y2="41">
          <stop stopColor="#8AF3D5" />
          <stop offset="0.5" stopColor="#2DD4A8" />
          <stop offset="1" stopColor="#0EA5A5" />
        </linearGradient>
        <linearGradient id={goldGradient} x1="12" y1="7" x2="38" y2="42">
          <stop stopColor="#FFF2A8" />
          <stop offset="0.5" stopColor="#E8C547" />
          <stop offset="1" stopColor="#B77A1F" />
        </linearGradient>
        <radialGradient id={coreGlow} cx="0" cy="0" r="1" gradientTransform="translate(24 24) rotate(90) scale(17)">
          <stop stopColor="#2DD4A8" stopOpacity="0.22" />
          <stop offset="1" stopColor="#071218" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="24" cy="24" r="20.25" fill={`url(#${coreGlow})`} stroke={`url(#${goldGradient})`} strokeWidth="1.2" />
      <circle cx="24" cy="24" r="16.3" stroke="#5EECC4" strokeOpacity="0.3" strokeWidth="0.8" strokeDasharray="1.2 2.4" />

      <g className="spirit-collection-orbit" fill={`url(#${jadeGradient})`} stroke="#FFF2A8" strokeWidth="0.55">
        <circle cx="24" cy="4.6" r="1.65" />
        <circle cx="36.1" cy="8.9" r="1.4" />
        <circle cx="43" cy="20.2" r="1.5" />
        <circle cx="39.2" cy="34.4" r="1.4" />
        <circle cx="28.5" cy="43" r="1.55" />
        <circle cx="13.1" cy="39.7" r="1.4" />
        <circle cx="4.8" cy="25.7" r="1.55" />
      </g>

      <path
        d="M25.2 9.8C31.7 13.6 34 19.1 31.4 24.7C29.1 29.6 24.5 32.5 17 35.8C20.6 31.4 21.4 27.6 19.9 23.7C18.2 19.3 19.8 13.8 25.2 9.8Z"
        fill={`url(#${jadeGradient})`}
        fillOpacity="0.2"
        stroke={`url(#${goldGradient})`}
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M25.5 13.1C25.9 20.8 23.3 27.9 17.2 35.7M24.8 20.4C27.2 19.5 29 18.1 30.2 16.3M22.8 26.3C25.6 25.8 28.1 24.6 30.2 22.8"
        stroke={`url(#${goldGradient})`}
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path
        d="M14.1 19.2C16.4 17 18.6 16.1 21 16.3M13.1 26.1C15.9 24.5 18.2 24.2 20.5 25M30.3 29.5C32.7 29.6 34.6 30.5 36.3 32.4"
        stroke="#5EECC4"
        strokeOpacity="0.74"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M24 18.4L26.6 22.1L24 25.8L21.4 22.1L24 18.4Z"
        fill={`url(#${goldGradient})`}
        stroke="#FFF2A8"
        strokeWidth="0.55"
      />
      <circle cx="24" cy="22.1" r="1.15" fill="#071218" stroke="#5EECC4" strokeWidth="0.65" />
    </svg>
  )
}

export default SpiritCollectionIcon
