import { motion } from 'framer-motion'

interface DistributionChartProps {
  data: { number: number; count: number }[]
  maxCount: number
  highlightNumbers?: Set<number>
  compact?: boolean
}

export function DistributionChart({
  data,
  maxCount,
  highlightNumbers: _highlightNumbers,
  compact = false,
}: DistributionChartProps) {
  const nonZero = data.filter((d) => d.count > 0)
  if (nonZero.length === 0) {
    return (
      <p className="text-text-secondary text-sm text-center py-8">
        Sin datos aún
      </p>
    )
  }

  const displayData = compact
    ? nonZero
    : data.filter((d) => d.count > 0 || (d.number >= 1 && d.number <= 20))

  const barMaxHeight = compact ? 80 : 120

  return (
    <div className={`flex items-end gap-1 ${compact ? 'h-24' : 'h-36'} overflow-x-auto pb-2`}>
      {displayData.map((item) => {
        const height =
          maxCount > 0 ? (item.count / maxCount) * barMaxHeight : 0
        const isCollision = item.count > 1

        return (
          <div
            key={item.number}
            className="flex flex-col items-center gap-1 min-w-[20px] shrink-0"
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: Math.max(height, item.count > 0 ? 4 : 0) }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className={
                isCollision
                  ? 'w-full rounded-t-sm bg-text-muted'
                  : 'w-full rounded-t-sm bg-text-primary'
              }
              style={{ minWidth: compact ? 12 : 16 }}
            />
            <span className="text-[10px] text-text-secondary tabular-nums font-mono">
              {item.number}
            </span>
          </div>
        )
      })}
    </div>
  )
}
