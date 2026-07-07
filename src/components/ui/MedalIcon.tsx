const MEDAL_STYLES = {
  1: {
    medal: '#EAB308',
    highlight: '#FDE68A',
    shadow: '#A16207',
    stroke: '#CA8A04',
    text: '#422006',
  },
  2: {
    medal: '#9CA3AF',
    highlight: '#E5E7EB',
    shadow: '#4B5563',
    stroke: '#6B7280',
    text: '#111827',
  },
  3: {
    medal: '#D97706',
    highlight: '#FCD34D',
    shadow: '#92400E',
    stroke: '#B45309',
    text: '#451A03',
  },
} as const

const SIZES = { sm: 20, md: 24, lg: 32 } as const

interface MedalIconProps {
  rank: 1 | 2 | 3
  size?: keyof typeof SIZES
  className?: string
}

export function MedalIcon({ rank, size = 'md', className }: MedalIconProps) {
  const px = SIZES[size]
  const colors = MEDAL_STYLES[rank]

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 28"
      fill="none"
      aria-hidden
      className={`shrink-0 ${className ?? ''}`}
    >
      <path d="M7.5 0L11 8.5L9.5 14L3.5 5.5L7.5 0Z" fill="#DC2626" />
      <path d="M10 0H14V14H10V0Z" fill="#F7F7F4" />
      <path d="M16.5 0L13 8.5L14.5 14L20.5 5.5L16.5 0Z" fill="#2563EB" />
      <circle cx="12" cy="20.5" r="7.5" fill={colors.shadow} />
      <circle cx="12" cy="19.5" r="7.5" fill={colors.medal} />
      <circle cx="10.5" cy="18" r="2.5" fill={colors.highlight} opacity="0.45" />
      <circle
        cx="12"
        cy="19.5"
        r="7.5"
        fill="none"
        stroke={colors.stroke}
        strokeWidth="0.75"
      />
      <text
        x="12"
        y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fill={colors.text}
        fontSize="8"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {rank}
      </text>
    </svg>
  )
}
