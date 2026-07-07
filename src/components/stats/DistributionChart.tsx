import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface DistributionChartProps {
  data: { number: number; count: number }[]
  maxCount: number
  highlightNumbers?: Set<number>
  compact?: boolean
  centered?: boolean
  groupInterval?: number
  minNum?: number
  maxNum?: number
  playerChoice?: number
  /** Muestra barras grises en rangos con números repetidos. */
  showCollisionColors?: boolean
  /** Muestra la cantidad de jugadores encima de cada barra. */
  showCounts?: boolean
}

interface Bucket {
  key: string
  label: string
  start: number
  end: number
  count: number
}

function playerCountLabel(count: number, rangeLabel?: string): string {
  const countText = count === 1 ? '1 jugador' : `${count} jugadores`
  return rangeLabel ? `${countText} (${rangeLabel})` : countText
}

function groupIntoBuckets(
  data: { number: number; count: number }[],
  interval: number,
  minNum: number,
  maxNum: number,
): Bucket[] {
  const buckets = new Map<number, number>()

  for (const item of data) {
    if (item.count === 0) continue
    const bucketStart =
      minNum + Math.floor((item.number - minNum) / interval) * interval
    buckets.set(bucketStart, (buckets.get(bucketStart) ?? 0) + item.count)
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([start, count]) => {
      const end = Math.min(start + interval - 1, maxNum)
      return {
        key: `${start}-${end}`,
        label: start === end ? `${start}` : `${start}-${end}`,
        start,
        end,
        count,
      }
    })
}

function bucketHasCollision(
  data: { number: number; count: number }[],
  start: number,
  end: number,
  highlightNumbers?: Set<number>,
): boolean {
  return data.some((item) => {
    if (item.number < start || item.number > end) return false
    if (highlightNumbers) return highlightNumbers.has(item.number)
    return item.count > 1
  })
}

function ChartBar({
  barKey,
  label,
  count,
  height,
  barClassName,
  minWidth,
  barMaxHeight,
  isActive,
  onHoverStart,
  onSelect,
  showCountAlways,
}: {
  barKey: string
  label: string
  count: number
  height: number
  barClassName: string
  minWidth: number
  barMaxHeight: number
  isActive: boolean
  onHoverStart: () => void
  onSelect: (key: string) => void
  showCountAlways?: boolean
}) {
  const showTooltip = isActive || showCountAlways
  const tooltip = playerCountLabel(count, label)

  return (
    <div className="flex flex-col items-center gap-1 min-w-[36px] shrink-0">
      <button
        type="button"
        data-bar-key={barKey}
        className="relative flex flex-col items-center justify-end w-full touch-manipulation select-none cursor-pointer"
        style={{ height: barMaxHeight, minWidth: Math.max(minWidth, 36) }}
        aria-label={tooltip}
        aria-pressed={isActive}
        onMouseEnter={onHoverStart}
        onFocus={onHoverStart}
        onClick={() => onSelect(barKey)}
      >
        {showTooltip && (
          <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-bg-elevated border border-border-subtle text-[11px] text-text-primary whitespace-nowrap tabular-nums z-20 shadow-sm pointer-events-none">
            {tooltip}
          </span>
        )}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: Math.max(height, count > 0 ? 4 : 0) }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={`w-full rounded-t-sm ${barClassName} ${
            isActive ? 'opacity-100 ring-1 ring-text-primary/30' : 'opacity-90'
          }`}
          style={{ minWidth }}
        />
      </button>
      <span className="text-[10px] text-text-secondary tabular-nums font-mono pointer-events-none">
        {label}
      </span>
    </div>
  )
}

export function DistributionChart({
  data,
  maxCount,
  highlightNumbers,
  compact = false,
  centered = false,
  groupInterval,
  minNum,
  maxNum,
  playerChoice,
  showCollisionColors = true,
  showCounts = false,
}: DistributionChartProps) {
  const [activeBarKey, setActiveBarKey] = useState<string | null>(null)
  const nonZero = data.filter((d) => d.count > 0)

  useEffect(() => {
    setActiveBarKey(null)
  }, [data, playerChoice, groupInterval, minNum, maxNum])

  if (nonZero.length === 0) {
    return (
      <p className="text-text-secondary text-sm text-center py-8">
        Sin datos aún
      </p>
    )
  }

  const barMaxHeight = compact ? 80 : 120
  const useBuckets =
    groupInterval !== undefined &&
    minNum !== undefined &&
    maxNum !== undefined

  const chartClassName = `relative z-10 flex items-end gap-2 ${
    compact ? 'min-h-24' : 'min-h-36'
  } overflow-x-auto overflow-y-visible pt-10 pb-2 ${
    centered ? 'justify-center' : ''
  }`

  const selectBar = (key: string) => {
    setActiveBarKey((current) => (current === key ? null : key))
  }

  const renderBars = (
    items: Array<{
      key: string
      label: string
      count: number
      height: number
      barClassName: string
      minWidth: number
    }>,
  ) => (
    <div
      className={chartClassName}
      onMouseLeave={() => setActiveBarKey(null)}
    >
      {items.map((item) => (
        <ChartBar
          key={item.key}
          barKey={item.key}
          label={item.label}
          count={item.count}
          height={item.height}
          barClassName={item.barClassName}
          minWidth={item.minWidth}
          barMaxHeight={barMaxHeight}
          isActive={activeBarKey === item.key}
          onHoverStart={() => setActiveBarKey(item.key)}
          onSelect={selectBar}
          showCountAlways={showCounts}
        />
      ))}
    </div>
  )

  if (useBuckets) {
    const buckets = groupIntoBuckets(data, groupInterval, minNum, maxNum)
    const bucketMax = Math.max(...buckets.map((b) => b.count), 1)

    return renderBars(
      buckets.map((bucket) => {
        const isPlayerBucket =
          playerChoice !== undefined &&
          playerChoice >= bucket.start &&
          playerChoice <= bucket.end
        const isCollision =
          showCollisionColors &&
          bucketHasCollision(
            data,
            bucket.start,
            bucket.end,
            highlightNumbers,
          )

        return {
          key: bucket.key,
          label: bucket.label,
          count: bucket.count,
          height: (bucket.count / bucketMax) * barMaxHeight,
          barClassName: isPlayerBucket
            ? 'bg-text-primary'
            : showCollisionColors && !isCollision
              ? 'bg-text-primary'
              : 'bg-text-muted',
          minWidth: compact ? 20 : 24,
        }
      }),
    )
  }

  const displayData = compact
    ? nonZero
    : data.filter((d) => d.count > 0 || (d.number >= 1 && d.number <= 20))

  return renderBars(
    displayData.map((item) => {
      const isCollision =
        showCollisionColors &&
        (highlightNumbers
          ? highlightNumbers.has(item.number)
          : item.count > 1)

      return {
        key: String(item.number),
        label: String(item.number),
        count: item.count,
        height: maxCount > 0 ? (item.count / maxCount) * barMaxHeight : 0,
        barClassName: isCollision ? 'bg-text-muted' : 'bg-text-primary',
        minWidth: compact ? 12 : 16,
      }
    }),
  )
}
