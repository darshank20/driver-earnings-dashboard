import { WEEK } from '../data/sample'
import { dayStatus, weekDates } from '../lib/earnings'
import { dateLong, dateShort, dayOfMonth, weekdayShort } from '../lib/format'
import { Icon } from './Icon'

/** Week label with previous/next controls, and a 7-day radiogroup. */
export function DateStrip({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const dates = weekDates()
  const enabled = dates.filter((d) => dayStatus(d) !== 'future')

  const onKey = (e: React.KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const i = enabled.indexOf(value)
    const next = enabled[Math.min(enabled.length - 1, Math.max(0, i + dir))]
    onChange(next)
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus())
  }

  return (
    <div>
      <div className="week-nav">
        <button type="button" className="icon-btn" disabled aria-label="Previous week (not in sample data)">
          <Icon name="chevronLeft" size={20} />
        </button>
        <span className="week-nav__label">
          {dateShort(WEEK.start)} – {dateShort(WEEK.end)}
        </span>
        <button type="button" className="icon-btn" disabled aria-label="Next week (not in sample data)">
          <Icon name="chevronRight" size={20} />
        </button>
      </div>
      <div className="day-strip" role="radiogroup" aria-label="Choose a day">
        {dates.map((d) => {
          const status = dayStatus(d)
          const selected = d === value
          const stateLabel =
            status === 'shift' ? 'online' : status === 'today' ? 'today, no online time yet' : status === 'future' ? 'upcoming' : 'offline'
          return (
            <button
              key={d}
              type="button"
              role="radio"
              data-date={d}
              aria-checked={selected}
              aria-label={`${dateLong(d)}, ${stateLabel}`}
              tabIndex={selected ? 0 : -1}
              disabled={status === 'future'}
              className="day"
              onClick={() => onChange(d)}
              onKeyDown={onKey}
            >
              <span className="day__dow">{status === 'today' ? 'Today' : weekdayShort(d).charAt(0)}</span>
              <span className="day__num">{dayOfMonth(d)}</span>
              <span className={`day__dot${status === 'shift' ? '' : ' day__dot--none'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
