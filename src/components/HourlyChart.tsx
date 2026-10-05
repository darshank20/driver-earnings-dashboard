import { useState } from 'react'
import type { Baseline, Period, ShiftSummary } from '../lib/earnings'
import { hourRange, inr } from '../lib/format'

const shortHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`
const trips = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} ${n === 1 ? 'trip' : 'trips'}`

/** Trips per online hour for the shift, with the comparison as a marker. Bars are inspectable. */
export function HourlyChart({ summary, base, periods }: { summary: ShiftSummary; base: Baseline; periods: Period[] }) {
  const weakHours = new Set(periods.filter((p) => p.weak).flatMap((p) => Array.from({ length: p.endHour - p.startHour }, (_, i) => p.startHour + i)))
  const firstWeak = summary.hourly.find((b) => weakHours.has(b.hour))?.hour
  const [inspected, setInspected] = useState<number>(firstWeak ?? summary.hourly[0].hour)
  const max = Math.max(...summary.hourly.map((b) => Math.max(b.trips, base.available ? (base.hourlyTrips[b.hour] ?? 0) : 0)), 1) * 1.2
  const cur = summary.hourly.find((b) => b.hour === inspected) ?? summary.hourly[0]
  const usual = base.available ? base.hourlyTrips[cur.hour] : undefined
  const compareName = base.mode === 'self' ? 'your usual' : 'similar drivers'

  return (
    <div>
      <div className="readout" aria-live="polite">
        <div className="readout__value num">
          {hourRange(cur.hour, cur.hour + 1)} · {trips(cur.trips)}
        </div>
        <div className="readout__meta num">
          {inr(cur.earnings)} earned
          {usual !== undefined && ` · ${compareName}: ${trips(usual)}`}
        </div>
      </div>
      <div className="chart" role="group" aria-label="Trips by hour, tap a bar for details">
        {summary.hourly.map((b) => {
          const u = base.available ? base.hourlyTrips[b.hour] : undefined
          const weak = weakHours.has(b.hour)
          return (
            <button
              key={b.hour}
              type="button"
              className={`bar${b.hour === inspected ? ' bar--inspected' : ''}`}
              aria-pressed={b.hour === inspected}
              aria-label={`${hourRange(b.hour, b.hour + 1)}: ${trips(b.trips)}, ${inr(b.earnings)}${u !== undefined ? `; ${compareName} ${trips(u)}` : ''}${weak ? '; fewer than usual' : ''}`}
              onClick={() => setInspected(b.hour)}
            >
              <span
                className="bar__fill"
                style={{
                  height: `${(b.trips / max) * 100}%`,
                  background: weak ? 'var(--c-caution-mark)' : 'var(--c-chart-bar-strong)',
                  outline: b.hour === inspected ? '2px solid var(--c-text)' : undefined,
                  outlineOffset: 2,
                }}
              />
              {u !== undefined && <span className="bar__marker" style={{ bottom: `${(u / max) * 100}%` }} />}
            </button>
          )
        })}
      </div>
      <div className="chart-axis" aria-hidden="true">
        {summary.hourly.map((b) => (
          <span key={b.hour} data-selected={b.hour === inspected}>
            {shortHour(b.hour)}
          </span>
        ))}
      </div>
      <div className="legend" aria-hidden="true">
        <span className="legend__item">
          <span className="legend__swatch" /> This shift
        </span>
        {weakHours.size > 0 && (
          <span className="legend__item">
            <span className="legend__swatch" style={{ background: 'var(--c-caution-mark)' }} /> Fewer trips than usual
          </span>
        )}
        {base.available && (
          <span className="legend__item">
            <span className="legend__line" /> {base.mode === 'self' ? 'Your usual' : 'Similar drivers'}
          </span>
        )}
      </div>
    </div>
  )
}
