import { useId } from 'react'

export default function RecipePlaceholder({ className }) {
  const id = useId().replace(/:/g, '')
  const backgroundId = `placeholder-background-${id}`
  const glowId = `placeholder-glow-${id}`
  const smokeId = `placeholder-smoke-${id}`

  return (
    <svg
      className={className}
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="BBQ grill illustration"
    >
      <defs>
        <linearGradient id={backgroundId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a1a1a" />
          <stop offset="1" stopColor="#0d0d0d" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff6600" stopOpacity="0.8" />
          <stop offset="0.45" stopColor="#cc0000" stopOpacity="0.35" />
          <stop offset="1" stopColor="#0d0d0d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={smokeId} x1="0" y1="1" x2="0.2" y2="0">
          <stop offset="0" stopColor="#777" stopOpacity="0.55" />
          <stop offset="1" stopColor="#b3b3b3" stopOpacity="0.08" />
        </linearGradient>
        <filter id={`blur-${id}`} x="-30%" y="-100%" width="160%" height="300%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id={`soft-blur-${id}`} x="-30%" y="-100%" width="160%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <rect width="400" height="240" fill={`url(#${backgroundId})`} />
      <ellipse cx="200" cy="190" rx="118" ry="32" fill={`url(#${glowId})`} filter={`url(#blur-${id})`} />
      <ellipse cx="200" cy="184" rx="78" ry="13" fill="#cc0000" opacity="0.3" filter={`url(#soft-blur-${id})`} />

      <g fill="none" stroke={`url(#${smokeId})`} strokeLinecap="round">
        <path d="M174 119 C158 104 180 92 166 77 C153 63 174 50 165 35" strokeWidth="5" opacity="0.42" />
        <path d="M202 116 C219 100 197 88 213 72 C229 57 207 45 219 28" strokeWidth="4" opacity="0.3" />
        <path d="M230 121 C246 108 229 96 242 84 C255 72 247 59 255 48" strokeWidth="3" opacity="0.25" />
      </g>

      <g>
        <path d="M119 119 Q119 101 137 96 H263 Q281 101 281 119 V146 Q281 158 269 162 H131 Q119 158 119 146 Z" fill="#111" stroke="#454545" strokeWidth="3" />
        <path d="M128 119 H272" stroke="#ff6600" strokeOpacity="0.7" strokeWidth="3" />
        <path d="M133 127 H267 M133 137 H267 M143 116 V143 M161 116 V143 M179 116 V143 M197 116 V143 M215 116 V143 M233 116 V143 M251 116 V143" fill="none" stroke="#666" strokeWidth="2" opacity="0.85" />
        <path d="M135 162 L120 197 M265 162 L280 197" fill="none" stroke="#292929" strokeWidth="9" strokeLinecap="round" />
        <path d="M112 198 H145 M255 198 H288" stroke="#454545" strokeWidth="5" strokeLinecap="round" />
        <path d="M145 151 Q200 169 255 151" fill="none" stroke="#0a0a0a" strokeWidth="6" />
        <path d="M151 151 Q162 143 173 151 T195 151 T217 151 T239 151 T260 151" fill="none" stroke="#ff6600" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
        <ellipse cx="165" cy="157" rx="9" ry="4" fill="#cc0000" opacity="0.8" />
        <ellipse cx="200" cy="159" rx="11" ry="4" fill="#ff6600" opacity="0.8" />
        <ellipse cx="236" cy="157" rx="9" ry="4" fill="#cc0000" opacity="0.8" />
      </g>
    </svg>
  )
}
