import { useId, useState } from 'react'
import { areaName, type ShiftSummary } from '../lib/earnings'
import { clockHHMM, inr } from '../lib/format'
import { InfoButton } from './Controls'
import { Icon } from './Icon'
import type { SheetId } from './InfoSheets'

/** Earnings breakdown with expandable trip list; amounts outside earnings are kept separate. */
export function Breakdown({ summary, onInfo }: { summary: ShiftSummary; onInfo: (id: SheetId) => void }) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const { shift } = summary
  const tipped = shift.trips.filter((t) => t.tip > 0).length

  return (
    <div>
      <div className="section__head">
        <h2 className="section__title">Earnings breakdown</h2>
        <InfoButton label="What counts as earnings" onClick={() => onInfo('earnings')} />
      </div>
      <ul className="rows">
        <li>
          <button
            type="button"
            className="expander row"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="row__label">
              <span>
                Trip earnings
                <span className="row__sub">
                  {summary.trips} trips · avg {inr(summary.perTrip)}
                </span>
              </span>
            </span>
            <span className="row__label">
              <span className="row__value num">{inr(summary.tripEarnings)}</span>
              <Icon name="chevronDown" size={20} className="expander__chev" />
            </span>
          </button>
          {open && (
            <ul className="trip-list" id={listId} aria-label="Trips">
              {shift.trips.map((t) => (
                <li key={t.id} className="trip">
                  <span>
                    <span className="trip__time num">{clockHHMM(t.start)}</span> · {areaName(t.area)}
                  </span>
                  <span className="num">
                    {inr(t.earnings)}
                    {t.tip > 0 && <span className="caption"> + {inr(t.tip)} tip</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </li>
        <li className="row">
          <span>
            Tips
            {summary.tips > 0 && <span className="row__sub">On {tipped} {tipped === 1 ? 'trip' : 'trips'}</span>}
          </span>
          <span className="row__value num">{inr(summary.tips)}</span>
        </li>
        <li className="row">
          <span>
            Incentives
            {shift.incentives.map((i) => (
              <span key={i.id} className="row__sub">
                {i.label}
              </span>
            ))}
          </span>
          <span className="row__value num">{inr(summary.incentives)}</span>
        </li>
        <li className="row row--total">
          <span>Earnings</span>
          <span className="row__value num">{inr(summary.earnings)}</span>
        </li>
      </ul>
      <p className="caption">After applicable platform charges. Fuel and vehicle costs are not deducted.</p>

      <h3 className="subhead">Not added to earnings</h3>
      <ul className="rows">
        <li className="row">
          <span>
            Toll reimbursements
            <span className="row__sub">Repays tolls you paid</span>
          </span>
          <span className="row__value num">{inr(summary.tollsReimbursed)}</span>
        </li>
        <li className="row">
          <span className="row__label">
            <span>
              Cash collected
              <span className="row__sub">Paid to you by riders in cash</span>
            </span>
          </span>
          <span className="row__label">
            <span className="row__value num">{inr(summary.cashCollected)}</span>
          </span>
        </li>
      </ul>
      <button type="button" className="link" onClick={() => onInfo('payouts')}>
        How earnings differ from payouts and cash
      </button>
    </div>
  )
}
