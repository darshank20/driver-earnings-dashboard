import {
  AREA_TRIP_EARNINGS,
  AREAS,
  DEFAULT_PLAN,
  DEMAND,
  DEMAND_FIRST_HOUR,
  ROUTE_MODEL,
  TODAY,
  TRAVEL_MINUTES,
  type AreaId,
  type Plan,
  type RequestSample,
} from '../data/sample'
import { addDays, clock, clockRange, dayIndex, toMinutes } from './format'
import { partOfDay } from './earnings'

export const isWeekend = (date: string) => [0, 6].includes(dayIndex(date))
export const dayType = (date: string) => (isWeekend(date) ? 'weekend' : 'weekday')

/** Plan days offered: today and the next 6 days. */
export const planDates = () => Array.from({ length: 7 }, (_, i) => addDays(TODAY, i))

/** Time options in 30-minute steps from 5:00 to 23:30. */
export const TIME_OPTIONS = Array.from({ length: 38 }, (_, i) => 5 * 60 + i * 30)
export const BREAK_LENGTHS = [15, 30, 45, 60]

export const areaLabel = (id: AreaId) => AREAS.find((a) => a.id === id)!.name

export interface PlanCheck {
  errors: Partial<Record<'finish' | 'break', string>>
  onlineMinutes: number
  breakRange?: [number, number]
  longShift: boolean
}

export const LONG_SHIFT_MINUTES = 10 * 60

export function checkPlan(plan: Plan): PlanCheck {
  const s = toMinutes(plan.start)
  const f = toMinutes(plan.finish)
  const errors: PlanCheck['errors'] = {}
  if (f - s < 60) errors.finish = 'Finish at least 1 hour after you start.'
  let breakRange: [number, number] | undefined
  if (plan.breakEnabled) {
    const b = toMinutes(plan.breakStart)
    const be = b + plan.breakMinutes
    if (b <= s || be >= f) errors.break = 'Your break needs to fall between your start and finish.'
    else breakRange = [b, be]
  }
  const onlineMinutes = Math.max(0, f - s - (breakRange ? plan.breakMinutes : 0))
  return { errors, onlineMinutes, breakRange, longShift: onlineMinutes > LONG_SHIFT_MINUTES }
}

const demandAt = (area: AreaId, date: string, hour: number) => {
  const series = DEMAND[area][dayType(date)]
  return series[hour - DEMAND_FIRST_HOUR] ?? 0
}

/** Minute-weighted demand for an area between two clock times, skipping the break. */
function demandBetween(area: AreaId, date: string, start: number, end: number, breakRange?: [number, number]) {
  let total = 0
  let minutes = 0
  for (let m = start; m < end; m += 15) {
    if (breakRange && m >= breakRange[0] && m < breakRange[1]) continue
    total += demandAt(area, date, Math.floor(m / 60)) * 15
    minutes += 15
  }
  return minutes ? total / minutes : 0
}

// ---------- Two-hour slots ----------

export interface Slot {
  id: string
  start: number
  end: number
  label: string
  /** Online minutes in the slot (break excluded). */
  onlineMinutes: number
}

/** The plan split into two-hour slots from its start; the last one may be shorter. */
export function planSlots(plan: Plan): Slot[] {
  const check = checkPlan(plan)
  if (check.errors.finish) return []
  const s = toMinutes(plan.start)
  const f = toMinutes(plan.finish)
  const slots: Slot[] = []
  for (let a = s; a < f; a += ROUTE_MODEL.slotMinutes) {
    const b = Math.min(f, a + ROUTE_MODEL.slotMinutes)
    const br = check.breakRange
    const overlap = br ? Math.max(0, Math.min(b, br[1]) - Math.max(a, br[0])) : 0
    const onlineMinutes = b - a - overlap
    if (onlineMinutes >= 30) slots.push({ id: `${a}-${b}`, start: a, end: b, label: clockRange(a, b), onlineMinutes })
  }
  return slots
}

// ---------- Area patterns ----------

export type Level = 'busier' | 'typical' | 'quieter'
export type Strength = 'High' | 'Medium' | 'Low'
const strengthFor = (v: number): Strength => (v >= 85 ? 'High' : v >= 65 ? 'Medium' : 'Low')

export interface AreaPattern {
  areaId: AreaId
  name: string
  /** The best window (all hours) or the selected slot. */
  window?: { start: number; end: number; label: string }
  windowIndex: number
  /** Historical level across the hours being shown (0–100). Drives the map shading. */
  planIndex: number
  level: Level
  strength: Strength
  note: string
}

function levelFor(area: AreaId, date: string, value: number): Level {
  const series = DEMAND[area][dayType(date)]
  // Typical level across 7 am–10 pm for that day type.
  const day = series.slice(7 - DEMAND_FIRST_HOUR, 22 - DEMAND_FIRST_HOUR)
  const typical = day.reduce((a, b) => a + b, 0) / day.length
  const ratio = value / typical
  if (ratio >= 1.15) return 'busier'
  if (ratio <= 0.85) return 'quieter'
  return 'typical'
}

function noteFor(level: Level, date: string, startMinutes: number) {
  const when = `${dayType(date)} ${partOfDay(Math.floor(startMinutes / 60))}s`
  return level === 'busier'
    ? `Usually busier during ${when}.`
    : level === 'quieter'
      ? `Usually quieter than its typical level during ${when}.`
      : `Usually around its typical level during ${when}.`
}

/** Whole clock hours fully inside the plan and outside the break. */
function plannedHours(plan: Plan): number[] {
  const { breakRange } = checkPlan(plan)
  const s = toMinutes(plan.start)
  const f = toMinutes(plan.finish)
  const hours: number[] = []
  for (let h = Math.ceil(s / 60); (h + 1) * 60 <= f; h++) {
    const overlapsBreak = breakRange && breakRange[0] < (h + 1) * 60 && breakRange[1] > h * 60
    if (!overlapsBreak) hours.push(h)
  }
  return hours
}

export function areaPattern(area: AreaId, plan: Plan): AreaPattern {
  const name = areaLabel(area)
  const hours = plannedHours(plan)
  const planIndex = hours.length ? hours.reduce((a, h) => a + demandAt(area, plan.date, h), 0) / hours.length : 0

  // Best contiguous window: 2 hours if possible, else 1.
  let best: { start: number; end: number; value: number } | undefined
  for (const len of [2, 1]) {
    for (const h of hours) {
      const run = Array.from({ length: len }, (_, i) => h + i)
      if (!run.every((x) => hours.includes(x))) continue
      const value = run.reduce((a, x) => a + demandAt(area, plan.date, x), 0) / len
      if (!best || value > best.value) best = { start: h, end: h + len, value }
    }
    if (best) break
  }

  if (!best) {
    return { areaId: area, name, windowIndex: 0, planIndex, level: 'typical', strength: 'Low', note: 'Plan at least one full hour to see patterns.' }
  }
  const level = levelFor(area, plan.date, best.value)
  return {
    areaId: area,
    name,
    window: { start: best.start * 60, end: best.end * 60, label: clockRange(best.start * 60, best.end * 60) },
    windowIndex: best.value,
    planIndex,
    level,
    strength: strengthFor(best.value),
    note: noteFor(level, plan.date, best.start * 60),
  }
}

/** Patterns for every area, busiest first — across all planned hours, or for one slot. */
export function allPatterns(plan: Plan, slot?: Slot): AreaPattern[] {
  if (!slot) return AREAS.map((a) => areaPattern(a.id, plan)).sort((a, b) => b.planIndex - a.planIndex)
  const br = checkPlan(plan).breakRange
  return AREAS.map((a) => {
    const v = demandBetween(a.id, plan.date, slot.start, slot.end, br)
    const level = levelFor(a.id, plan.date, v)
    return {
      areaId: a.id,
      name: a.name,
      window: { start: slot.start, end: slot.end, label: slot.label },
      windowIndex: v,
      planIndex: v,
      level,
      strength: strengthFor(v),
      note: noteFor(level, plan.date, slot.start),
    }
  }).sort((a, b) => b.windowIndex - a.windowIndex)
}

/** 0–3 shade step, relative to the quietest and busiest areas being shown. */
export function relativeShade(value: number, all: number[]) {
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  if (hi - lo < 1) return 1
  return Math.round(((value - lo) / (hi - lo)) * 3)
}

// ---------- Suggested route ----------

export function travelMinutes(a: AreaId, b: AreaId): number {
  if (a === b) return 0
  const row = TRAVEL_MINUTES.find(([x, y]) => (x === a && y === b) || (x === b && y === a))
  return row ? row[2] : 60
}

/** Estimated ₹ per productive online hour in an area during a slot. */
export function estimatedRate(area: AreaId, plan: Plan, slot: Slot) {
  const v = demandBetween(area, plan.date, slot.start, slot.end, checkPlan(plan).breakRange)
  return AREA_TRIP_EARNINGS[area] * (ROUTE_MODEL.baseTripsPerHour + (ROUTE_MODEL.tripsPerHourAtPeak * v) / 100)
}

export interface RouteLeg {
  slot: Slot
  area: AreaId
  /** Drive from the previous area (or start point) into this one, minutes. */
  driveIn: number
  /** Last leg only: drive to the end point, minutes. */
  driveOut: number
  earnings: number
  /** Estimated earnings ÷ online hours in this slot. */
  perHour: number
}

export interface Route {
  legs: RouteLeg[]
  earnings: number
  onlineMinutes: number
  perHour: number
  /** Staying in the start area all shift, for comparison. */
  stayPerHour: number
  uplift: number
  /** When to leave for the end point so you arrive by the planned finish. */
  leaveBy?: number
}

function legValue(plan: Plan, slot: Slot, from: AreaId, to: AreaId, last: boolean) {
  const share = ROUTE_MODEL.unpaidDriveShare
  const driveIn = travelMinutes(from, to)
  const driveOut = last ? travelMinutes(to, plan.endArea) : 0
  const productive = Math.max(0, slot.onlineMinutes / 60 - (share * (driveIn + driveOut)) / 60)
  return { driveIn, driveOut, earnings: productive * estimatedRate(to, plan, slot) }
}

/**
 * Picks one area per two-hour slot to maximise estimated earnings per online hour,
 * starting from the start point and finishing near the end point by the planned finish.
 */
export function suggestRoute(plan: Plan): Route | null {
  const slots = planSlots(plan)
  if (!slots.length) return null
  const ids = AREAS.map((a) => a.id)
  const weight = (a: AreaId) => (plan.area !== 'any' && a !== plan.area ? ROUTE_MODEL.preferenceWeight : 1)

  // Dynamic programming over slots × areas.
  type Cell = { score: number; prev?: AreaId }
  const table: Record<AreaId, Cell>[] = []
  slots.forEach((slot, i) => {
    const last = i === slots.length - 1
    const row = {} as Record<AreaId, Cell>
    for (const to of ids) {
      const froms: AreaId[] = i === 0 ? [plan.startArea] : ids
      let best: Cell = { score: -Infinity }
      for (const from of froms) {
        const base = i === 0 ? 0 : table[i - 1][from].score
        const score = base + legValue(plan, slot, from, to, last).earnings * weight(to)
        if (score > best.score) best = { score, prev: i === 0 ? undefined : from }
      }
      row[to] = best
    }
    table.push(row)
  })

  // Backtrack.
  let area = ids.reduce((a, b) => (table[slots.length - 1][b].score > table[slots.length - 1][a].score ? b : a))
  const path: AreaId[] = []
  for (let i = slots.length - 1; i >= 0; i--) {
    path.unshift(area)
    area = table[i][area].prev ?? area
  }

  const legs = slots.map((slot, i) => {
    const from = i === 0 ? plan.startArea : path[i - 1]
    const v = legValue(plan, slot, from, path[i], i === slots.length - 1)
    return { slot, area: path[i], driveIn: v.driveIn, driveOut: v.driveOut, earnings: v.earnings, perHour: v.earnings / (slot.onlineMinutes / 60) }
  })
  const onlineMinutes = slots.reduce((a, s) => a + s.onlineMinutes, 0)
  const earnings = legs.reduce((a, l) => a + l.earnings, 0)
  const stay = slots.reduce((a, slot, i) => a + legValue(plan, slot, plan.startArea, plan.startArea, i === slots.length - 1).earnings, 0)
  const perHour = earnings / (onlineMinutes / 60)
  const stayPerHour = stay / (onlineMinutes / 60)
  const lastLeg = legs[legs.length - 1]
  return {
    legs,
    earnings,
    onlineMinutes,
    perHour,
    stayPerHour,
    uplift: stayPerHour ? perHour / stayPerHour - 1 : 0,
    leaveBy: lastLeg.driveOut ? lastLeg.slot.end - lastLeg.driveOut : undefined,
  }
}

// ---------- Trip requests against the route ----------

export type FitKind = 'fits' | 'near' | 'off' | 'late' | 'outside'

export interface RequestFit {
  kind: FitKind
  title: string
  reason: string
  at: number
  endsAt: number
  leg?: RouteLeg
}

export function requestFit(req: RequestSample, plan: Plan, route: Route): RequestFit {
  const at = toMinutes(plan.start) + req.offsetMin
  const endsAt = at + req.pickupMin + req.tripMin
  const finish = toMinutes(plan.finish)
  const i = route.legs.findIndex((l) => at >= l.slot.start && at < l.slot.end)
  if (i < 0) return { kind: 'outside', title: 'Outside your plan', reason: 'This request comes outside your planned hours.', at, endsAt }
  const leg = route.legs[i]
  const next = route.legs[i + 1]
  if (endsAt > finish) {
    return {
      kind: 'late',
      title: 'Past your finish',
      reason: `Ends around ${clock(endsAt)}, about ${endsAt - finish} min after your planned finish.`,
      at,
      endsAt,
      leg,
    }
  }
  const drop = areaLabel(req.drop)
  if (req.drop === leg.area)
    return { kind: 'fits', title: 'On your route', reason: `${req.pickup === leg.area ? 'Keeps you in' : 'Takes you to'} ${drop}, your ${leg.slot.label} area.`, at, endsAt, leg }
  if (next && req.drop === next.area)
    return { kind: 'fits', title: 'On your route', reason: `Takes you to ${drop} for ${next.slot.label}.`, at, endsAt, leg }
  if (!next && req.drop === plan.endArea)
    return { kind: 'fits', title: 'On your route', reason: `Ends near your end point, ${drop}.`, at, endsAt, leg }

  const target = next && endsAt >= next.slot.start - 15 ? next : leg
  const gap = travelMinutes(req.drop, target.area)
  if (gap <= ROUTE_MODEL.nearMinutes)
    return { kind: 'near', title: 'Near your route', reason: `Drops you in ${drop}, about ${gap} min from ${areaLabel(target.area)}.`, at, endsAt, leg }
  return {
    kind: 'off',
    title: 'Off your route',
    reason: `Drops you in ${drop}, about ${gap} min from ${areaLabel(target.area)} (${target.slot.label}).`,
    at,
    endsAt,
    leg,
  }
}

// ---- Persistence (localStorage with in-memory fallback) ----

const KEY = 'driver-earnings.plan.v1'
let memory: Plan | null = null

export function loadPlan(): Plan | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_PLAN, ...(JSON.parse(raw) as Partial<Plan>) }
  } catch {
    /* storage unavailable */
  }
  return memory
}

export function savePlan(plan: Plan) {
  memory = plan
  try {
    window.localStorage.setItem(KEY, JSON.stringify(plan))
  } catch {
    /* storage unavailable — kept in memory for this session */
  }
}

export function clearPlan() {
  memory = null
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
