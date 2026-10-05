import { EmptyState, InfoButton, Segmented } from '../components/Controls'
import { HourlyChart } from '../components/HourlyChart'
import { OffersSection } from '../components/OffersSection'
import { Icon } from '../components/Icon'
import type { SheetId } from '../components/InfoSheets'
import { SHIFTS } from '../data/sample'
import {
  areaName,
  baselineFor,
  change,
  defaultDate,
  headline,
  periods as getPeriods,
  STEADY,
  summaryForDate,
  type Baseline,
  type ComparisonMode,
  type ShiftSummary,
} from '../lib/earnings'
import { dateLong, duration, inr, pct, weekdayLong } from '../lib/format'

interface Props {
  date: string
  onDate: (d: string) => void
  mode: ComparisonMode
  onMode: (m: ComparisonMode) => void
  onInfo: (id: SheetId) => void
  onPlan: () => void
}

const fmtTrips = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const fmtRate = (n: number) => `${n.toFixed(1)}/hr`

type Better = 'higher' | 'lower'
function Diff({ value, base, kind = 'pct', better = 'higher' }: { value: number; base: number; kind?: 'pct' | 'abs'; better?: Better }) {
  const c = change(value, base)
  if (Math.abs(c) < STEADY) return <span className="diff diff--neutral">Steady</span>
  const good = better === 'higher' ? c > 0 : c < 0
  const text = kind === 'pct' ? `${c > 0 ? '+' : '−'}${pct(c * 100)}` : `${value - base > 0 ? '+' : '−'}${fmtTrips(Math.abs(value - base))}`
  return <span className={`diff diff--${good ? 'positive' : 'caution'}`}>{text}</span>
}

function CompareTable({ s, b }: { s: ShiftSummary; b: Baseline }) {
  const label = b.mode === 'self' ? 'Your usual' : 'Similar drivers'
  return (
    <table className="compare-table num">
      <caption className="sr-only">This shift compared with {label.toLowerCase()}</caption>
      <thead>
        <tr>
          <th scope="col">
            <span className="sr-only">Measure</span>
          </th>
          <th scope="col">This shift</th>
          <th scope="col">{label}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Online time</th>
          <td className="col-shift">{duration(s.onlineMinutes)}</td>
          <td className="col-base">{duration(b.onlineMinutes)}</td>
        </tr>
        <tr className="is-highlight">
          <th scope="row">Trips</th>
          <td className="col-shift">
            {s.trips}
            <Diff value={s.trips} base={b.trips} kind="abs" />
          </td>
          <td className="col-base">{fmtTrips(b.trips)}</td>
        </tr>
        <tr>
          <th scope="row">Trips per online hr</th>
          <td className="col-shift">{fmtRate(s.tripsPerHour)}</td>
          <td className="col-base">{fmtRate(b.tripsPerHour)}</td>
        </tr>
        <tr className="is-highlight">
          <th scope="row">Avg per trip</th>
          <td className="col-shift">
            {inr(s.perTrip)}
            <Diff value={s.perTrip} base={b.perTrip} />
          </td>
          <td className="col-base">{inr(b.perTrip)}</td>
        </tr>
        <tr>
          <th scope="row">Tips and incentives</th>
          <td className="col-shift">{inr(s.tips + s.incentives)}</td>
          <td className="col-base">{inr(b.tips + b.incentives)}</td>
        </tr>
        <tr>
          <th scope="row">Earnings</th>
          <td className="col-shift">{inr(s.earnings)}</td>
          <td className="col-base">{inr(b.earnings)}</td>
        </tr>
        <tr className="is-highlight">
          <th scope="row">Per online hr</th>
          <td className="col-shift">
            {inr(s.perHour)}
            <Diff value={s.perHour} base={b.perHour} />
          </td>
          <td className="col-base">{inr(b.perHour)}</td>
        </tr>
      </tbody>
    </table>
  )
}

function ShiftOnlyTable({ s }: { s: ShiftSummary }) {
  return (
    <ul className="rows num" style={{ marginTop: 'var(--s-3)' }}>
      {[
        ['Online time', duration(s.onlineMinutes)],
        ['Trips', String(s.trips)],
        ['Avg per trip', inr(s.perTrip)],
        ['Tips and incentives', inr(s.tips + s.incentives)],
        ['Earnings', inr(s.earnings)],
        ['Per online hr', inr(s.perHour)],
      ].map(([k, v]) => (
        <li className="row" key={k}>
          <span>{k}</span>
          <span className="row__value">{v}</span>
        </li>
      ))}
    </ul>
  )
}

export function InsightsScreen({ date, onDate, mode, onMode, onInfo, onPlan }: Props) {
  const summary = summaryForDate(date)
  const shiftDates = SHIFTS.map((s) => s.date).sort().reverse()
  const options = shiftDates.includes(date) ? shiftDates : [date, ...shiftDates]

  const header = (
    <>
      <header className="page-head">
        <h1 className="page-title" tabIndex={-1}>Shift insights</h1>
        <label className="date-select">
          <span className="sr-only">Shift</span>
          <select value={date} onChange={(e) => onDate(e.target.value)}>
            {options.map((d) => (
              <option key={d} value={d} disabled={!shiftDates.includes(d)}>
                {dateLong(d)}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} />
        </label>
      </header>
      <p className="parked">
        <Icon name="parked" size={18} />
        Detailed view. Review when you’re safely parked.
      </p>
    </>
  )

  if (!summary) {
    return (
      <>
        {header}
        <EmptyState
          icon="insights"
          title="No shift to explain"
          body={`You weren’t online on ${dateLong(date)}. Choose a day with online time.`}
          action={
            <button type="button" className="btn btn--secondary" onClick={() => onDate(defaultDate())}>
              Show latest shift
            </button>
          }
        />
      </>
    )
  }

  const base = baselineFor(summary, mode)
  const other = baselineFor(summary, mode === 'self' ? 'drivers' : 'self')
  const periods = getPeriods(summary, base)
  const weak = periods.filter((p) => p.weak)

  return (
    <>
      {header}
      <p className="caption">
        {dateLong(date)} · {summary.windowLabel} · mostly {areaName(summary.mainArea)}
      </p>
      <h2 className="lead">{base.available ? headline(summary, base) : `Here’s how your ${weekdayLong(date)} shift went.`}</h2>

      <div className="cols cols--even">
        <div>
          <section className="section" aria-labelledby="compare-title">
            <div className="section__head">
              <h2 className="section__title" id="compare-title">
                Compare with
              </h2>
              <InfoButton label="How comparisons work" onClick={() => onInfo('comparison')} />
            </div>
            <Segmented
              label="Compare with"
              value={mode}
              onChange={onMode}
              options={[
                { value: 'self', label: 'My similar shifts' },
                { value: 'drivers', label: 'Similar drivers' },
              ]}
            />
            {base.available ? (
              <>
                <p className="caption" style={{ marginTop: 'var(--s-3)' }}>
                  {base.criteria}
                </p>
                <CompareTable s={summary} b={base} />
              </>
            ) : (
              <>
                <EmptyState
                  inline
                  title={mode === 'self' ? 'Not enough similar shifts yet' : 'Not enough similar drivers'}
                  body={base.insufficientReason ?? ''}
                  action={
                    other.available ? (
                      <button type="button" className="btn btn--secondary" onClick={() => onMode(other.mode)}>
                        Compare with {other.mode === 'self' ? 'my similar shifts' : 'similar drivers'}
                      </button>
                    ) : undefined
                  }
                />
                <ShiftOnlyTable s={summary} />
              </>
            )}
          </section>
        </div>

        <div>
          <section className="section section--band" aria-labelledby="time-title">
            <h2 className="section__title" id="time-title">
              Where the time went
            </h2>
            <HourlyChart summary={summary} base={base} periods={periods} />
            <div style={{ marginTop: 'var(--s-4)' }}>
              {periods.map((p) => (
                <div className="period num" key={p.startHour}>
                  <span className="period__label">
                    {p.label}
                    {p.weak && <span className="tag tag--caution">Fewer trips</span>}
                  </span>
                  <span className="period__rate">{inr(p.perHour)}/hr</span>
                  <span className="period__meta">
                    {p.trips} {p.trips === 1 ? 'trip' : 'trips'} · {inr(p.earnings)}
                    {base.available && ` · usual ${Math.round(p.baselineTrips)}`}
                  </span>
                  <span className="period__meta" style={{ textAlign: 'right' }}>
                    {duration(p.onlineMinutes)} online
                  </span>
                </div>
              ))}
            </div>
          </section>

          {base.available && (
            <section className="section" aria-labelledby="weak-title">
              {weak.length ? (
                weak.map((p) => (
                  <div className="callout" key={p.startHour}>
                    <h2 className="callout__title" id="weak-title">
                      <Icon name="pin" size={20} />
                      {areaName(p.area)} · {p.label}
                    </h2>
                    <p className="callout__body">
                      You completed {p.trips} {p.trips === 1 ? 'trip' : 'trips'} during this period.{' '}
                      {p.observation && p.observation.requestsVsUsual < 90
                        ? 'Demand was below the area’s usual level.'
                        : `That’s fewer than the ${Math.round(p.baselineTrips)} usual for these hours.`}
                    </p>
                    {p.observation && (
                      <div className="meter">
                        <p className="caption">
                          Ride requests in {areaName(p.area)}: <strong className="num">{p.observation.requestsVsUsual}%</strong> of the usual level for{' '}
                          {weekdayLong(date)}s at this time
                        </p>
                        <div
                          className="meter__track"
                          role="img"
                          aria-label={`Requests were ${p.observation.requestsVsUsual}% of usual`}
                        >
                          <div className="meter__fill" style={{ width: `${(p.observation.requestsVsUsual / 120) * 100}%` }} />
                          <span className="meter__usual" style={{ left: `${(100 / 120) * 100}%` }} />
                        </div>
                        <div className="meter__row" aria-hidden="true">
                          <span style={{ left: `${(p.observation.requestsVsUsual / 120) * 100}%` }}>This period</span>
                          <span style={{ left: `${(100 / 120) * 100}%` }}>Usual</span>
                        </div>
                      </div>
                    )}
                    <p className="note">
                      <Icon name="info" size={16} />
                      This is an observed pattern. It doesn’t show that another area or time would have earned more.
                    </p>
                  </div>
                ))
              ) : (
                <div className="callout">
                  <h2 className="callout__title" id="weak-title">
                    No hours stood out
                  </h2>
                  <p className="callout__body">
                    Each hour of this shift had a trip count close to {base.mode === 'self' ? 'your usual' : 'similar drivers'}.
                  </p>
                </div>
              )}
            </section>
          )}

          <section className="section" aria-labelledby="offers-title">
            <OffersSection summary={summary} mode={mode} onInfo={onInfo} />
          </section>

          <section className="section">
            <button type="button" className="btn btn--primary btn--block" onClick={onPlan}>
              Plan my next shift
            </button>
            <p className="caption" style={{ marginTop: 'var(--s-2)', textAlign: 'center' }}>
              Plans use your own start, finish and break times.
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
