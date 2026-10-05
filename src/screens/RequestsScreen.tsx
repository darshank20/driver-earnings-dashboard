import { useState } from 'react'
import { Icon } from '../components/Icon'
import { AREAS, DEFAULT_PLAN, REQUEST_SAMPLES, type AreaId, type Plan } from '../data/sample'
import { clock, dateLong, inr } from '../lib/format'
import { areaLabel, loadPlan, requestFit, suggestRoute, type FitKind } from '../lib/plan'

const TAG: Record<FitKind, string> = {
  fits: 'tag tag--positive',
  near: 'tag',
  off: 'tag tag--outline',
  late: 'tag tag--caution',
  outside: 'tag',
}

const centre = (id: AreaId) => {
  const t = AREAS.find((a) => a.id === id)!.tile
  return { x: t.x + t.w / 2, y: t.y + t.h / 2 }
}

/** Pickup → drop-off over the schematic area view, with the current route area outlined. */
function RequestMap({ pickup, drop, routeArea }: { pickup: AreaId; drop: AreaId; routeArea?: AreaId }) {
  const a = centre(pickup)
  const b = centre(drop)
  const same = pickup === drop
  return (
    <svg className="req-map" viewBox="0 0 102 66" role="img" aria-label={`Pickup in ${areaLabel(pickup)}, drop-off in ${areaLabel(drop)}`}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#000" />
        </marker>
      </defs>
      {AREAS.map((t) => {
        const active = t.id === pickup || t.id === drop
        return (
          <g key={t.id}>
            <rect
              x={t.tile.x}
              y={t.tile.y}
              width={t.tile.w}
              height={t.tile.h}
              rx={2.5}
              fill={active ? '#e2e2e2' : '#f3f3f3'}
              stroke={t.id === routeArea ? '#0b7a3e' : '#fff'}
              strokeWidth={t.id === routeArea ? 1.2 : 0.6}
              strokeDasharray={t.id === routeArea ? '2 1.2' : undefined}
            />
            <text x={t.tile.x + 2.5} y={t.tile.y + 6.5} fontSize={3.8} fontWeight={active ? 700 : 500} fill={active ? '#000' : '#6b6b6b'}>
              {t.name}
            </text>
          </g>
        )
      })}
      {!same && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#000" strokeWidth={0.9} markerEnd="url(#arrow)" />}
      <circle cx={a.x} cy={a.y} r={1.8} fill="#000" />
      <rect x={b.x - 1.6 + (same ? 6 : 0)} y={b.y - 1.6} width={3.2} height={3.2} fill="#000" />
    </svg>
  )
}

export function RequestsScreen({ plan: given, onBack, onToast }: { plan: Plan | null; onBack: () => void; onToast: (m: string) => void }) {
  const savedPlan = given ?? loadPlan()
  const plan = savedPlan ?? DEFAULT_PLAN
  const route = suggestRoute(plan)
  const [index, setIndex] = useState(0)

  if (!route) {
    return (
      <>
        <header className="page-head">
          <button type="button" className="icon-btn" aria-label="Back to Plan" onClick={onBack}>
            <Icon name="chevronLeft" />
          </button>
        </header>
        <p>Fix your plan’s times to preview requests.</p>
      </>
    )
  }

  const items = REQUEST_SAMPLES.map((r) => ({ r, fit: requestFit(r, plan, route) }))
  const { r, fit } = items[index]
  const next = () => setIndex((i) => (i + 1) % items.length)

  return (
    <>
      <header className="page-head req-head">
        <button type="button" className="icon-btn" aria-label="Back to Plan" onClick={onBack} style={{ marginLeft: -10 }}>
          <Icon name="chevronLeft" />
        </button>
        <h1 className="page-title" tabIndex={-1} style={{ flex: 1 }}>
          Trip requests
        </h1>
      </header>
      <p className="page-sub">
        Sample requests along your {savedPlan ? '' : 'example '}plan for {dateLong(plan.date)}. Each one is checked against your suggested route.
      </p>

      <ol className="route-strip" aria-label="Your route">
        {route.legs.map((l) => (
          <li key={l.slot.id} className={fit.leg?.slot.id === l.slot.id ? 'is-current' : undefined} aria-current={fit.leg?.slot.id === l.slot.id ? 'step' : undefined}>
            <span className="num">{l.slot.label}</span>
            <strong>{areaLabel(l.area)}</strong>
          </li>
        ))}
      </ol>

      <div className="cols cols--even">
        <div>
          <section className="req-card" aria-labelledby="req-title" aria-live="polite">
            <RequestMap pickup={r.pickup} drop={r.drop} routeArea={fit.leg?.area} />
            <div className="req-card__body">
              <div className="req-card__fit">
                <span className={TAG[fit.kind]}>
                  {fit.kind === 'fits' && <Icon name="check" size={14} />}
                  {fit.title}
                </span>
                <span className="caption num">
                  Request at {clock(fit.at)} · {index + 1} of {items.length}
                </span>
              </div>
              <p className="req-card__reason">{fit.reason}</p>
              <h2 className="req-card__fare num" id="req-title">
                {inr(r.fare)}
                <span className="req-card__fare-label">est. trip earnings</span>
              </h2>
              <ul className="req-legs num">
                <li>
                  <span className="req-legs__mark" aria-hidden="true" />
                  <span>
                    <strong>{r.pickupMin} min</strong> ({r.pickupKm} km) away
                    <span className="row__sub">Pickup in {areaLabel(r.pickup)}</span>
                  </span>
                </li>
                <li>
                  <span className="req-legs__mark req-legs__mark--drop" aria-hidden="true" />
                  <span>
                    <strong>{r.tripMin} min</strong> trip ({r.tripKm} km)
                    <span className="row__sub">
                      Drop-off in {areaLabel(r.drop)} · ends around {clock(fit.endsAt)}
                    </span>
                  </span>
                </li>
              </ul>
              <p className="req-card__meta">
                {r.payment} · Rider rating {r.riderRating.toFixed(1)}
              </p>
              <div className="form-actions">
                <button type="button" className="btn btn--secondary" onClick={next}>
                  Skip
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    onToast(`Accepted ${inr(r.fare)} trip (sample)`)
                    next()
                  }}
                >
                  Accept
                </button>
              </div>
              <p className="caption" style={{ marginTop: 'var(--s-2)' }}>
                Skipping a request doesn’t count as a cancellation. No timer: this is a preview.
              </p>
            </div>
          </section>
        </div>

        <div>
          <section className="section section--band" aria-labelledby="req-list-title">
            <h2 className="section__title" id="req-list-title" style={{ marginBottom: 'var(--s-2)' }}>
              All sample requests
            </h2>
            <ul className="rows">
              {items.map((it, i) => (
                <li key={it.r.id}>
                  <button type="button" className="row req-row" aria-current={i === index ? 'true' : undefined} onClick={() => setIndex(i)}>
                    <span className="req-row__main">
                      <span className="num">
                        {clock(it.fit.at)} · {inr(it.r.fare)}
                      </span>
                      <span className="row__sub">
                        {areaLabel(it.r.pickup)} → {areaLabel(it.r.drop)}
                      </span>
                    </span>
                    <span className={TAG[it.fit.kind]}>{it.fit.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
