import { useId, useState } from 'react'
import {
  offerFactors,
  offersComparison,
  pctText,
  type ComparisonMode,
  type FactorStatus,
  type ShiftSummary,
} from '../lib/earnings'
import { InfoButton } from './Controls'
import { Icon } from './Icon'
import type { SheetId } from './InfoSheets'

const TAG: Record<FactorStatus, { text: string; cls: string }> = {
  flagged: { text: 'Higher than usual', cls: 'tag tag--caution' },
  slight: { text: 'Slightly lower', cls: 'tag' },
  ok: { text: 'Usual range', cls: 'tag' },
  unavailable: { text: 'Not enough trips', cls: 'tag' },
}

/**
 * Trip offers and the two account factors that can affect them.
 * Progressive disclosure: collapsed to one line when nothing is flagged,
 * expanded with one plain explanation when something is.
 */
export function OffersSection({ summary, mode, onInfo }: { summary: ShiftSummary; mode: ComparisonMode; onInfo: (id: SheetId) => void }) {
  const f = offerFactors(summary.date)
  const offers = offersComparison(summary, mode)
  const flagged = Boolean(f.lead)
  const [open, setOpen] = useState(flagged)
  const panelId = useId()
  const who = offers.base?.mode === 'self' ? 'in your similar shifts' : 'for similar drivers'

  const ratingTag =
    f.rating.status === 'flagged' ? { text: 'Lower than usual', cls: 'tag tag--caution' } : TAG[f.rating.status]

  const summaryText = flagged
    ? f.lead === 'cancel'
      ? 'Cancellation rate higher than usual'
      : 'Rating lower than usual'
    : f.rating.status === 'slight'
      ? 'Rating slightly lower · cancellations usual'
      : 'Both in your usual range'

  let message: string
  if (f.lead === 'cancel') {
    message = offers.fewer
      ? 'A higher cancellation rate can reduce the trip offers you receive. It’s one possible factor; demand near you matters too. The rate comes down as days pass without cancellations.'
      : 'Offers weren’t lower in this shift. If the rate stays high, it can reduce offers. It comes down as days pass without cancellations.'
  } else if (f.lead === 'rating') {
    message = 'A lower rating can reduce the trip offers you receive. One low rating has a small effect; a steady slide is worth a look.'
  } else if (f.rating.status === 'slight') {
    message = `Neither is outside your usual range. Your rating has eased from ${f.rating.usual.toFixed(2)} to ${f.rating.value.toFixed(2)}; small changes are common, and we’ll tell you if it keeps falling.`
  } else {
    message = 'Neither has moved outside your usual range.'
  }

  return (
    <div>
      <div className="section__head">
        <h2 className="section__title" id="offers-title">
          Trip offers
        </h2>
        <InfoButton label="How cancellations and rating relate to offers" onClick={() => onInfo('offers')} />
      </div>

      <div className="offers num">
        <p className="offers__value">
          {summary.offers} offers
          <span className="offers__rate"> · {summary.offersPerHour.toFixed(1)} per online hr</span>
        </p>
        {offers.base ? (
          <p className="offers__base">
            About {Math.round(offers.base.offers)} {who}
            {offers.fewer && offers.delta !== undefined && <span className="tag tag--caution">{pctText(Math.abs(offers.delta))} fewer</span>}
          </p>
        ) : (
          <p className="offers__base">No comparison available yet</p>
        )}
      </div>

      <button
        type="button"
        className={`expander row factor-toggle${flagged ? ' factor-toggle--attention' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="row__label">
          <span>
            Cancellation rate and rating
            <span className={`row__sub${flagged ? ' factor-toggle__flag' : ''}`}>
              {flagged && <span className="insight__mark insight__mark--caution" aria-hidden="true" />}
              {summaryText}
            </span>
          </span>
        </span>
        <Icon name="chevronDown" size={20} className="expander__chev" />
      </button>

      {open && (
        <div id={panelId} className="factors">
          <ul className="rows num">
            <li className={`row${f.cancel.status === 'flagged' ? ' row--attention' : ''}`}>
              <span>
                <span className="factor__label">
                  {f.cancel.status === 'flagged' && <span className="insight__mark insight__mark--caution" aria-hidden="true" />}
                  Cancellation rate
                  {f.cancel.status === 'flagged' && <span className="sr-only">, needs attention</span>}
                </span>
                <span className="row__sub">
                  Last 7 days · usual {pctText(f.cancel.usual)}
                </span>
              </span>
              <span className="factor__value">
                <strong>{f.cancel.status === 'unavailable' ? '—' : pctText(f.cancel.rate)}</strong>
                <span className={TAG[f.cancel.status].cls}>{TAG[f.cancel.status].text}</span>
              </span>
            </li>
            <li className={`row${f.rating.status === 'flagged' ? ' row--attention' : ''}`}>
              <span>
                <span className="factor__label">
                  {f.rating.status === 'flagged' && <span className="insight__mark insight__mark--caution" aria-hidden="true" />}
                  Rating
                  {f.rating.status === 'flagged' && <span className="sr-only">, needs attention</span>}
                </span>
                <span className="row__sub">Last 100 rated trips · usual {f.rating.usual.toFixed(2)}</span>
              </span>
              <span className="factor__value">
                <strong>{Number.isNaN(f.rating.value) ? '—' : f.rating.value.toFixed(2)}</strong>
                <span className={ratingTag.cls}>{ratingTag.text}</span>
              </span>
            </li>
          </ul>
          <p className={flagged && offers.fewer ? 'caution-box' : 'factor-note'}>
            {flagged && offers.fewer && <Icon name="info" size={18} />}
            <span>{message}</span>
          </p>
          <button type="button" className="link" onClick={() => onInfo('offers')}>
            What counts, and what helps
          </button>
        </div>
      )}
    </div>
  )
}
