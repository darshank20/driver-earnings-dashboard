import { Breakdown } from '../components/Breakdown'
import { EmptyState, InfoButton } from '../components/Controls'
import { DateStrip } from '../components/DateStrip'
import { Icon } from '../components/Icon'
import type { SheetId } from '../components/InfoSheets'
import { WeekChart } from '../components/WeekChart'
import { baselineFor, change, dayInsight, dayStatus, defaultDate, STEADY, summaryForDate } from '../lib/earnings'
import { dateLong, duration, inr, pct } from '../lib/format'

interface Props {
  date: string
  onDate: (d: string) => void
  onInfo: (id: SheetId) => void
  onExplain: () => void
}

export function EarningsScreen({ date, onDate, onInfo, onExplain }: Props) {
  const summary = summaryForDate(date)
  const status = dayStatus(date)
  const base = summary ? baselineFor(summary, 'self') : undefined
  const insight = summary ? dayInsight(summary) : undefined
  const delta = summary && base?.available ? change(summary.perHour, base.perHour) : undefined
  const tone = delta === undefined ? 'neutral' : Math.abs(delta) < STEADY ? 'neutral' : delta < 0 ? 'caution' : 'positive'

  return (
    <>
      <header className="page-head">
        <h1 className="page-title" tabIndex={-1}>Earnings</h1>
        <button type="button" className="icon-btn" aria-label="About this prototype" onClick={() => onInfo('about')}>
          <Icon name="info" />
        </button>
      </header>

      <div className="cols">
        <div className="col-left">
          <DateStrip value={date} onChange={onDate} />

          {summary && base && insight ? (
            <section className="summary" aria-labelledby="summary-title">
              <p className="summary__meta">
                <span>{dateLong(date)}</span>
                <span aria-hidden="true">·</span>
                <span>{summary.windowLabel}</span>
              </p>
              <h2 className="sr-only" id="summary-title">
                Summary for {dateLong(date)}
              </h2>
              <div className="figure">
                <span className="figure__value num">{inr(summary.perHour)}</span>
                <span className="figure__unit-wrap">
                  <span className="figure__unit">/ online hr</span>
                  <InfoButton label="About earnings per online hour" onClick={() => onInfo('perHour')} />
                </span>
              </div>

              {delta !== undefined ? (
                <p className={`delta delta--${tone}`}>
                  <span className="delta__chip">
                    {tone !== 'neutral' && <Icon name={delta < 0 ? 'arrowDown' : 'arrowUp'} size={18} />}
                    {tone === 'neutral' ? 'In line with' : `${pct(delta * 100)} ${delta < 0 ? 'below' : 'above'}`}
                  </span>
                  <span>
                    your usual <span className="num">{inr(base.perHour)}</span>/hr
                  </span>
                </p>
              ) : (
                <p className="delta">
                  <span>No usual rate yet for shifts like this</span>
                </p>
              )}

              <div className="total num">
                <div>
                  <p className="total__label">
                    Total earnings
                    <InfoButton label="What counts as earnings" onClick={() => onInfo('earnings')} />
                  </p>
                  <p className="total__value">{inr(summary.earnings)}</p>
                </div>
                <p className="supporting total__meta">
                  <span>{duration(summary.onlineMinutes)} online</span>
                  <span>{summary.trips} trips</span>
                </p>
              </div>

              <div className="insight">
                <p className="insight__label">
                  <span className={`insight__mark insight__mark--${insight.tone}`} aria-hidden="true" />
                  Shift insight
                </p>
                <h3 className="insight__title">{insight.title}</h3>
                <p className="insight__body">{insight.body}</p>
                <button type="button" className="btn btn--primary btn--block" onClick={onExplain}>
                  Understand this shift
                </button>
              </div>
            </section>
          ) : (
            <EmptyState
              icon="clock"
              title={status === 'today' ? 'No online time yet today' : `You were offline on ${dateLong(date)}`}
              body={status === 'today' ? 'Earnings for today appear here after your first trip.' : 'There are no earnings for this day.'}
              action={
                <button type="button" className="btn btn--secondary" onClick={() => onDate(defaultDate())}>
                  Show latest shift
                </button>
              }
            />
          )}
        </div>

        <div className="col-right">
          <section className="section">
            <WeekChart selected={date} onSelect={onDate} />
          </section>
          {summary && (
            <section className="section">
              <Breakdown summary={summary} onInfo={onInfo} />
            </section>
          )}
          <footer className="foot">
            <button type="button" className="link" onClick={() => onInfo('onlineTime')}>
              What is online time?
            </button>
            <button type="button" className="link" onClick={() => onInfo('offers')}>
              Cancellations, rating and offers
            </button>
            <button type="button" className="link" onClick={() => onInfo('about')}>
              About this prototype
            </button>
          </footer>
        </div>
      </div>
    </>
  )
}
