import { useEffect, useRef, useState } from 'react'
import { InfoButton, SelectField, Switch } from '../components/Controls'
import { Icon } from '../components/Icon'
import type { SheetId } from '../components/InfoSheets'
import { RouteCard } from '../components/RouteCard'
import { AREA_TRIP_EARNINGS, AREAS, DEFAULT_PLAN, TODAY, type AreaId, type Plan } from '../data/sample'
import { clock, clockRange, dateLong, duration, fromMinutes, inr, toMinutes } from '../lib/format'
import {
  allPatterns,
  areaLabel,
  BREAK_LENGTHS,
  checkPlan,
  clearPlan,
  dayType,
  estimatedRate,
  loadPlan,
  planDates,
  planSlots,
  relativeShade,
  savePlan,
  suggestRoute,
  TIME_OPTIONS,
  type AreaPattern,
  type Strength,
} from '../lib/plan'

interface Props {
  onInfo: (id: SheetId) => void
  onToast: (msg: string) => void
  onOpenRequests: (plan: Plan) => void
}

const SHADES = ['var(--c-demand-0)', 'var(--c-demand-1)', 'var(--c-demand-2)', 'var(--c-demand-3)']
const STRENGTH_BARS: Record<Strength, number> = { Low: 1, Medium: 2, High: 3 }

function StrengthMark({ strength }: { strength: Strength }) {
  return (
    <span className="level">
      <span className="level__bars" aria-hidden="true">
        {[6, 9, 12].map((h, i) => (
          <i key={h} style={{ height: h }} className={i < STRENGTH_BARS[strength] ? 'on' : ''} />
        ))}
      </span>
      {strength} request level
    </span>
  )
}

function AreaMap({
  patterns,
  marked,
  markLabel,
  onPick,
  scope,
}: {
  patterns: AreaPattern[]
  marked?: AreaId
  markLabel: string
  onPick?: (a: AreaId) => void
  scope: string
}) {
  const values = patterns.map((p) => p.planIndex)
  const ranked = [...patterns].sort((a, b) => b.planIndex - a.planIndex).map((p) => p.areaId)
  return (
    <div className="area-map">
      <svg viewBox="0 0 102 66" role="group" aria-label={`Schematic view of areas, shaded from quieter to busier for ${scope}`}>
        {AREAS.map((a) => {
          const p = patterns.find((x) => x.areaId === a.id)!
          const step = relativeShade(p.planIndex, values)
          const isPref = a.id === marked
          const fg = step >= 3 ? '#fff' : '#000'
          const { x, y, w, h } = a.tile
          const rank = ranked.indexOf(a.id) + 1
          const label = `${a.name}, ${rank === 1 ? 'busiest' : rank === AREAS.length ? 'quietest' : `number ${rank} of ${AREAS.length}`} for ${scope}${isPref ? `, ${markLabel.toLowerCase()}` : ''}`
          const interactive = Boolean(onPick)
          return (
            <g
              key={a.id}
              className={interactive ? 'area-map__tile' : undefined}
              role={interactive ? 'button' : 'img'}
              tabIndex={interactive ? 0 : undefined}
              aria-label={label}
              aria-pressed={interactive ? isPref : undefined}
              onClick={() => onPick?.(a.id)}
              onKeyDown={(e) => {
                if (onPick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onPick(a.id)
                }
              }}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={2.5}
                fill={SHADES[step]}
                stroke={isPref ? '#000' : '#fff'}
                strokeWidth={isPref ? 1.2 : 0.6}
              />
              <text x={x + 2.5} y={y + 5.8} fontSize={4.2} fontWeight={700} fill={fg}>
                {a.name}
              </text>
              {isPref && (
                <text x={x + 2.5} y={Math.min(y + 11.5, y + h - 1.8)} fontSize={3.2} fill={fg}>
                  {markLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="demand-scale" aria-hidden="true">
        <span>Quieter</span>
        <span className="demand-scale__steps">
          {SHADES.map((c) => (
            <span key={c} style={{ background: c, outline: '1px solid var(--c-border)' }} />
          ))}
        </span>
        <span>Busier</span>
        <span style={{ marginLeft: 'auto' }}>Relative · not to scale</span>
      </div>
    </div>
  )
}

export function PlanScreen({ onInfo, onToast, onOpenRequests }: Props) {
  const [saved, setSaved] = useState<Plan | null>(() => loadPlan())
  const [editing, setEditing] = useState(() => !loadPlan())
  const [draft, setDraft] = useState<Plan>(() => loadPlan() ?? DEFAULT_PLAN)
  const [showAll, setShowAll] = useState(false)
  const [slotId, setSlotId] = useState<string>('all')
  const savedHeading = useRef<HTMLHeadingElement>(null)
  const firstField = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<'saved' | 'form' | null>(null)

  useEffect(() => {
    if (pendingFocus.current === 'saved') savedHeading.current?.focus()
    if (pendingFocus.current === 'form') firstField.current?.querySelector('select')?.focus()
    pendingFocus.current = null
  }, [editing])

  const plan = editing ? draft : (saved ?? draft)
  const check = checkPlan(plan)
  const slots = planSlots(plan)
  const slot = slots.find((x) => x.id === slotId)
  const route = suggestRoute(plan)
  const routeArea = slot ? route?.legs.find((l) => l.slot.id === slot.id)?.area : undefined
  const patterns = allPatterns(plan, slot)
  const marked: AreaId | undefined = slot ? routeArea : plan.area === 'any' ? undefined : plan.area
  const markLabel = slot ? 'Your route' : 'Preferred'
  // All hours: preferred area first. A slot: strictly busiest first, route area marked in place.
  const first = !slot && marked ? patterns.find((p) => p.areaId === marked) : undefined
  const others = patterns.filter((p) => p !== first)
  const visible = [...(first ? [first] : []), ...(showAll ? others : others.slice(0, first ? 2 : 3))]
  const scope = slot ? slot.label : 'your planned hours'
  const s = toMinutes(plan.start)
  const f = toMinutes(plan.finish)
  const hasErrors = Object.keys(check.errors).length > 0

  const update = (patch: Partial<Plan>) => setDraft((d) => ({ ...d, ...patch }))

  const toggleBreak = (on: boolean) => {
    if (!on) return update({ breakEnabled: false })
    const mid = Math.round((s + f) / 2 / 30) * 30
    const ok = (b: number) => b > s && b + draft.breakMinutes < f
    update({ breakEnabled: true, breakStart: ok(toMinutes(draft.breakStart)) ? draft.breakStart : fromMinutes(mid) })
  }

  const onSave = () => {
    if (hasErrors) {
      document.getElementById(check.errors.finish ? 'plan-finish' : 'plan-break-start')?.focus()
      return
    }
    savePlan(draft)
    const wasSaved = Boolean(saved)
    setSaved(draft)
    pendingFocus.current = 'saved'
    setEditing(false)
    onToast(wasSaved ? 'Plan updated' : `Plan saved for ${dateLong(draft.date)}`)
  }

  const onEdit = () => {
    if (saved) setDraft(saved)
    pendingFocus.current = 'form'
    setEditing(true)
  }

  const onRemove = () => {
    clearPlan()
    setSaved(null)
    setDraft(DEFAULT_PLAN)
    pendingFocus.current = 'form'
    setEditing(true)
    onToast('Plan removed')
  }

  const timeOpts = TIME_OPTIONS.map((m) => ({ value: fromMinutes(m), label: clock(m) }))
  const breakOpts = TIME_OPTIONS.filter((m) => m > s && m < f).map((m) => ({ value: fromMinutes(m), label: clock(m) }))
  const rangeLabel = clockRange(s, f)

  return (
    <>
      <header className="page-head">
        <h1 className="page-title" tabIndex={-1}>Plan</h1>
      </header>
      <p className="page-sub">Choose your own hours. We’ll show how areas usually behave within them.</p>

      <div className="cols cols--even">
        <div>
          {!editing && saved ? (
            <section className="saved" aria-labelledby="saved-title">
              <div className="saved__head">
                <span className="tag tag--positive">
                  <Icon name="check" size={14} /> Saved
                </span>
                <span className="caption">On this device</span>
              </div>
              <h2 className="saved__title" id="saved-title" ref={savedHeading} tabIndex={-1}>
                {dateLong(saved.date)} · {rangeLabel}
              </h2>
              <ul className="saved__list">
                <li>
                  <Icon name="clock" size={18} />
                  <span className="num">{duration(check.onlineMinutes)} planned online</span>
                </li>
                <li>
                  <Icon name="pause" size={18} />
                  {check.breakRange ? <span>Break {clockRange(check.breakRange[0], check.breakRange[1])}</span> : <span>No break planned</span>}
                </li>
                <li>
                  <Icon name="pin" size={18} />
                  <span>
                    {areaLabel(saved.startArea)} → {areaLabel(saved.endArea)}
                  </span>
                </li>
                {saved.area !== 'any' && (
                  <li>
                    <Icon name="pin" size={18} />
                    <span>Prefers {areaLabel(saved.area)}</span>
                  </li>
                )}
              </ul>
              <div className="saved__actions">
                <button type="button" className="btn btn--primary" onClick={onEdit}>
                  Edit plan
                </button>
                <button type="button" className="btn btn--ghost" onClick={onRemove}>
                  Remove
                </button>
              </div>
            </section>
          ) : (
            <section aria-labelledby="form-title">
              <h2 className="sr-only" id="form-title">
                {saved ? 'Edit your plan' : 'Plan your next shift'}
              </h2>
              <div className="form">
                <div ref={firstField}>
                  <SelectField
                    id="plan-day"
                    label="Day"
                    value={draft.date}
                    onChange={(v) => update({ date: v })}
                    options={planDates().map((d) => ({ value: d, label: `${d === TODAY ? 'Today · ' : ''}${dateLong(d)}` }))}
                  />
                </div>
                <div className="field-pair">
                  <SelectField id="plan-start" label="Start" value={draft.start} onChange={(v) => update({ start: v })} options={timeOpts} />
                  <SelectField
                    id="plan-finish"
                    label="Finish"
                    value={draft.finish}
                    onChange={(v) => update({ finish: v })}
                    options={timeOpts}
                    error={check.errors.finish}
                  />
                </div>

                <div>
                  <div className="switch-row">
                    <span className="switch-row__text">
                      <span id="break-label" className="field__label">
                        Add a break
                      </span>
                      <span className="caption">Optional. Break time isn’t counted as online.</span>
                    </span>
                    <Switch checked={draft.breakEnabled} onChange={toggleBreak} labelledBy="break-label" />
                  </div>
                  {draft.breakEnabled && (
                    <div className="field-pair" style={{ marginTop: 'var(--s-2)' }}>
                      <SelectField
                        id="plan-break-start"
                        label="Break starts"
                        value={draft.breakStart}
                        onChange={(v) => update({ breakStart: v })}
                        options={breakOpts.length ? breakOpts : [{ value: draft.breakStart, label: clock(toMinutes(draft.breakStart)) }]}
                        error={check.errors.break}
                      />
                      <SelectField
                        id="plan-break-length"
                        label="Length"
                        value={String(draft.breakMinutes)}
                        onChange={(v) => update({ breakMinutes: Number(v) })}
                        options={BREAK_LENGTHS.map((m) => ({ value: String(m), label: duration(m) }))}
                      />
                    </div>
                  )}
                </div>

                <div className="field-pair">
                  <SelectField
                    id="plan-start-area"
                    label="Start from"
                    value={draft.startArea}
                    onChange={(v) => update({ startArea: v as AreaId })}
                    options={AREAS.map((a) => ({ value: a.id, label: a.name }))}
                  />
                  <SelectField
                    id="plan-end-area"
                    label="End at"
                    value={draft.endArea}
                    onChange={(v) => update({ endArea: v as AreaId })}
                    options={AREAS.map((a) => ({ value: a.id, label: a.name }))}
                  />
                </div>

                <SelectField
                  id="plan-area"
                  label="Prefer to stay in"
                  value={draft.area}
                  onChange={(v) => update({ area: v as AreaId | 'any' })}
                  options={[{ value: 'any', label: 'No preference' }, ...AREAS.map((a) => ({ value: a.id, label: a.name }))]}
                  hint="Optional. The route favours this area unless another is clearly busier."
                />

                <p className="plan-summary num" aria-live="polite">
                  <Icon name="clock" size={18} />
                  {hasErrors ? 'Check your times' : `${duration(check.onlineMinutes)} online · finish at ${clock(f)}`}
                </p>
                {check.longShift && !hasErrors && (
                  <p className="caution-box">
                    <Icon name="info" size={18} />
                    That’s a long shift. Consider a shorter plan or adding a break so you stay rested.
                  </p>
                )}
                <div className="form-actions">
                  {saved && (
                    <button type="button" className="btn btn--secondary" onClick={() => { pendingFocus.current = 'saved'; setEditing(false) }}>
                      Cancel
                    </button>
                  )}
                  <button type="button" className="btn btn--primary" onClick={onSave}>
                    {saved ? 'Save changes' : 'Save plan'}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="section section--band" aria-labelledby="route-title">
            <RouteCard plan={plan} route={check.errors.finish ? null : route} onInfo={onInfo} onPreview={() => onOpenRequests(plan)} />
          </section>
        </div>

        <div>
          <section className="section section--band" aria-labelledby="patterns-title">
            <div className="section__head">
              <h2 className="section__title" id="patterns-title">
                Area patterns
              </h2>
              <InfoButton label="About historical patterns" onClick={() => onInfo('patterns')} />
            </div>
            <p className="history-label">
              <Icon name="history" size={16} />
              Historical · last 8 weeks · not a live forecast
            </p>
            {slots.length > 0 && (
              <div className="slot-picker" role="radiogroup" aria-label="Show areas for">
                {[{ id: 'all', label: 'All hours' }, ...slots].map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    role="radio"
                    aria-checked={(slot ? slot.id : 'all') === x.id}
                    className="slot-chip num"
                    onClick={() => setSlotId(x.id)}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            )}
            <p className="caption" style={{ marginTop: 'var(--s-2)' }} aria-live="polite">
              Typical {dayType(plan.date)} ride requests {slot ? `for ${slot.label}` : `between ${rangeLabel}`}
              {check.breakRange ? `, excluding your break` : ''}, quietest to busiest.
            </p>

            <AreaMap
              patterns={patterns}
              marked={marked}
              markLabel={markLabel}
              scope={scope}
              onPick={editing && !slot ? (a) => update({ area: a }) : undefined}
            />

            <ul className="area-cards" aria-label={`Areas for ${scope}, busiest first`}>
              {visible.map((p) => (
                <li key={p.areaId} className={`area-card${p.areaId === marked ? ' area-card--preferred' : ''}`}>
                  <div className="area-card__head">
                    <h3 className="area-card__title">
                      {p.name}
                      {p.window ? ` · ${p.window.label}` : ''}
                    </h3>
                    {p.areaId === marked && <span className="tag tag--dark">{markLabel}</span>}
                  </div>
                  <p className="area-card__note">{p.note}</p>
                  {slot && (
                    <p className="area-card__est num">
                      Est. ~{inr(estimatedRate(p.areaId, plan, slot))}/online hr · avg {inr(AREA_TRIP_EARNINGS[p.areaId])} per trip
                    </p>
                  )}
                  <div className="area-card__foot">
                    <StrengthMark strength={p.strength} />
                    {editing && !slot && p.areaId !== plan.area && (
                      <button type="button" className="link" onClick={() => update({ area: p.areaId })} aria-label={`Set ${p.name} as preferred area`}>
                        Set as preferred
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {patterns.length > visible.length || showAll ? (
              <button type="button" className="link" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show fewer areas' : `Show all ${patterns.length} areas`}
              </button>
            ) : null}
            <p className="note">
              <Icon name="info" size={16} />
              Patterns describe past requests and don’t guarantee trips or earnings. They only cover the hours you choose.
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
