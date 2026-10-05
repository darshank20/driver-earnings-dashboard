import { useState } from 'react'
import { week } from '../lib/earnings'
import { dateLong, duration, inr, weekdayShort } from '../lib/format'
import { Segmented } from './Controls'

type Metric = 'perHour' | 'total'

/** Week trend: earnings per online hour (default) or total earnings per day. Bars are inspectable. */
export function WeekChart({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const [metric, setMetric] = useState<Metric>('perHour')
  const [inspected, setInspected] = useState<string>(selected)
  const [prevSelected, setPrevSelected] = useState(selected)
  if (prevSelected !== selected) {
    setPrevSelected(selected)
    setInspected(selected)
  }
  const w = week()
  const value = (d: (typeof w.days)[number]) => (d.summary ? (metric === 'perHour' ? d.summary.perHour : d.summary.earnings) : 0)
  const max = Math.max(...w.days.map(value)) * 1.15 || 1
  const ref = metric === 'perHour' ? w.perHour : undefined
  const current = w.days.find((d) => d.date === inspected) ?? w.days[0]

  return (
    <div>
      <div className="section__head">
        <h2 className="section__title">This week</h2>
        <Segmented
          compact
          label="Chart measure"
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'perHour', label: 'Per online hr' },
            { value: 'total', label: 'Total' },
          ]}
        />
      </div>
      <p className="caption">
        <span className="num">{inr(w.perHour)}</span>/online hr · <span className="num">{inr(w.earnings)}</span> earned ·{' '}
        {duration(w.onlineMinutes)} online · {w.trips} trips
      </p>

      <div className="readout" aria-live="polite">
        {current.summary ? (
          <>
            <div className="readout__value num">
              {metric === 'perHour' ? `${inr(current.summary.perHour)}/online hr` : inr(current.summary.earnings)}
            </div>
            <div className="readout__meta">
              {dateLong(current.date)} ·{' '}
              {metric === 'perHour' ? `${inr(current.summary.earnings)} earned` : `${inr(current.summary.perHour)}/online hr`} ·{' '}
              {duration(current.summary.onlineMinutes)} online
              {current.date !== selected && (
                <>
                  {' · '}
                  <button type="button" className="link" style={{ minHeight: 0 }} onClick={() => onSelect(current.date)}>
                    View day
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="readout__value">No earnings</div>
            <div className="readout__meta">
              {dateLong(current.date)} · {current.status === 'future' ? 'Upcoming' : current.status === 'today' ? 'No online time yet' : 'Offline'}
            </div>
          </>
        )}
      </div>

      <div className="chart" role="group" aria-label={`Daily ${metric === 'perHour' ? 'earnings per online hour' : 'earnings'}, tap a bar for details`}>
        {ref !== undefined && (
          <div className="chart__ref" style={{ bottom: `${(ref / max) * 100}%` }}>
            <span className="chart__ref-label num">Week {inr(ref)}</span>
          </div>
        )}
        {w.days.map((d) => {
          const v = value(d)
          const cls = ['bar', d.date === selected ? 'bar--selected' : '', d.date === inspected ? 'bar--inspected' : ''].join(' ')
          return (
            <button
              key={d.date}
              type="button"
              className={cls}
              aria-pressed={d.date === inspected}
              aria-label={`${dateLong(d.date)}: ${d.summary ? (metric === 'perHour' ? `${inr(v)} per online hour` : `${inr(v)} earned`) : 'no earnings'}`}
              onClick={() => setInspected(d.date)}
            >
              {d.summary ? <span className="bar__fill" style={{ height: `${(v / max) * 100}%` }} /> : <span className="bar__empty" />}
            </button>
          )
        })}
      </div>
      <div className="chart-axis" aria-hidden="true">
        {w.days.map((d) => (
          <span key={d.date} data-selected={d.date === selected}>
            {weekdayShort(d.date)}
          </span>
        ))}
      </div>
    </div>
  )
}
