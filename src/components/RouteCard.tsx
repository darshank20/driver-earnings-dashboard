import type { Plan } from '../data/sample'
import { clock, inr, pct } from '../lib/format'
import { areaLabel, type Route } from '../lib/plan'
import { InfoButton } from './Controls'
import { Icon } from './Icon'
import type { SheetId } from './InfoSheets'

/** Suggested route: one area per two-hour slot, from start point to end point, inside planned hours. */
export function RouteCard({ plan, route, onInfo, onPreview }: { plan: Plan; route: Route | null; onInfo: (id: SheetId) => void; onPreview: () => void }) {
  return (
    <div>
      <div className="section__head">
        <h2 className="section__title" id="route-title">
          Suggested route
        </h2>
        <InfoButton label="How the route is estimated" onClick={() => onInfo('route')} />
      </div>
      <p className="history-label">
        <Icon name="history" size={16} />
        Estimate from past patterns · not guaranteed
      </p>

      {!route ? (
        <p className="caption" style={{ marginTop: 'var(--s-3)' }}>
          Fix your times to see a suggested route.
        </p>
      ) : (
        <>
          <div className="route-sum num" aria-live="polite">
            <p className="route-sum__value">
              About {inr(route.perHour)} <span className="route-sum__unit">/ online hr</span>
            </p>
            <p className="route-sum__meta">
              {route.uplift >= 0.02 ? (
                <>
                  <span className="tag tag--positive">+{pct(route.uplift * 100)}</span> vs {inr(route.stayPerHour)}/hr staying in {areaLabel(plan.startArea)}
                </>
              ) : (
                <>Staying in {areaLabel(plan.startArea)} is about as good as moving around.</>
              )}
            </p>
          </div>

          <ol className="route" aria-label="Route steps">
            <li className="route__step route__step--point">
              <span className="route__time num">{clock(route.legs[0].slot.start)}</span>
              <span className="route__dot" aria-hidden="true" />
              <span className="route__body">
                <strong>Start in {areaLabel(plan.startArea)}</strong>
                {route.legs[0].driveIn > 0 && (
                  <span className="route__sub">
                    Head to {areaLabel(route.legs[0].area)} · about {route.legs[0].driveIn} min. Trips may come up on the way.
                  </span>
                )}
              </span>
            </li>
            {route.legs.map((leg, i) => (
              <li className="route__step" key={leg.slot.id}>
                <span className="route__time num">{leg.slot.label}</span>
                <span className="route__dot route__dot--leg" aria-hidden="true" />
                <span className="route__body">
                  <span className="route__row">
                    <strong>{areaLabel(leg.area)}</strong>
                    <span className="num">~{inr(leg.perHour)}/hr</span>
                  </span>
                  {i > 0 && leg.driveIn > 0 && <span className="route__sub">Move from {areaLabel(route.legs[i - 1].area)} · about {leg.driveIn} min</span>}
                  {i > 0 && leg.driveIn === 0 && <span className="route__sub">Stay in {areaLabel(leg.area)}</span>}
                  {leg.driveOut > 0 && route.leaveBy !== undefined && (
                    <span className="route__sub">Head to {areaLabel(plan.endArea)} by {clock(route.leaveBy)} to finish on time</span>
                  )}
                </span>
              </li>
            ))}
            <li className="route__step route__step--point">
              <span className="route__time num">{clock(route.legs[route.legs.length - 1].slot.end)}</span>
              <span className="route__dot" aria-hidden="true" />
              <span className="route__body">
                <strong>Finish near {areaLabel(plan.endArea)}</strong>
              </span>
            </li>
          </ol>

          <button type="button" className="btn btn--secondary btn--block" onClick={onPreview}>
            Preview trip requests on this route
          </button>
          <p className="note">
            <Icon name="info" size={16} />
            Uses past ride requests and average trip earnings in each area. Actual earnings vary. The route stays within your hours and break.
          </p>
        </>
      )}
    </div>
  )
}
