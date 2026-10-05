import {
  ACCOUNT_HISTORY,
  AREAS,
  CANCEL_FLAG_POINTS,
  CANCEL_WINDOW_DAYS,
  COHORTS,
  COMPARISON_GROUPS,
  HISTORY,
  MIN_COHORT_DRIVERS,
  MIN_ACCEPTED_FOR_RATE,
  MIN_SIMILAR_SHIFTS,
  OFFERS_DROP,
  OTHER_DAYS,
  RATING_BY_DATE,
  RATING_FLAG_DROP,
  RATING_SLIGHT_DROP,
  SHIFTS,
  TODAY,
  WEEK,
  type AreaId,
  type AreaObservation,
  type Shift,
  type Trip,
} from '../data/sample'
import { addDays, clockRange, duration, hourRange, inr, toMinutes } from './format'

export type ComparisonMode = 'self' | 'drivers'

export interface HourBucket {
  hour: number
  trips: number
  /** Trip earnings + tips for trips started in this hour. */
  earnings: number
  onlineMinutes: number
}

export interface ShiftSummary {
  shift: Shift
  date: string
  onlineMinutes: number
  trips: number
  tripEarnings: number
  tips: number
  incentives: number
  /** Trip earnings + tips + incentives. Excludes toll reimbursements. */
  earnings: number
  perHour: number
  /** Trip earnings ÷ trips (tips and incentives excluded). */
  perTrip: number
  tripsPerHour: number
  tollsReimbursed: number
  cashCollected: number
  hourly: HourBucket[]
  windowLabel: string
  mainArea: AreaId
  /** Trip requests offered while online. */
  offers: number
  offersPerHour: number
}

export interface Baseline {
  mode: ComparisonMode
  available: boolean
  count: number
  required: number
  criteria: string
  insufficientReason?: string
  onlineMinutes: number
  trips: number
  tripEarnings: number
  tips: number
  incentives: number
  earnings: number
  perHour: number
  perTrip: number
  tripsPerHour: number
  hourlyTrips: Record<number, number>
  offers: number
  offersPerHour: number
}

export interface Period {
  startHour: number
  endHour: number
  label: string
  trips: number
  earnings: number
  onlineMinutes: number
  perHour: number
  baselineTrips: number
  weak: boolean
  observation?: AreaObservation
  area: AreaId
}

export interface Insight {
  title: string
  body: string
  tone: 'neutral' | 'caution' | 'positive'
}

export type DayStatus = 'shift' | 'off' | 'today' | 'future'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0)

/** Under this relative change we call a figure "steady". */
export const STEADY = 0.05
/** An hour is "weak" when its trips fall below this share of the comparison. */
const WEAK_HOUR_RATIO = 0.75

export const areaName = (id: AreaId) => AREAS.find((a) => a.id === id)?.name ?? id

export function shiftForDate(date: string): Shift | undefined {
  return SHIFTS.find((s) => s.date === date)
}

export function dayStatus(date: string): DayStatus {
  if (shiftForDate(date)) return 'shift'
  if (date === TODAY) return 'today'
  if (date > TODAY) return 'future'
  return 'off'
}

export const weekDates = () => Array.from({ length: 7 }, (_, i) => addDays(WEEK.start, i))

function hourOf(trip: Trip) {
  return Math.floor(toMinutes(trip.start) / 60)
}

function mode<T>(xs: T[]): T {
  const counts = new Map<T, number>()
  xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

export function summarize(shift: Shift): ShiftSummary {
  const onlineMinutes = sum(shift.online.map((p) => toMinutes(p.end) - toMinutes(p.start)))
  const tripEarnings = sum(shift.trips.map((t) => t.earnings))
  const tips = sum(shift.trips.map((t) => t.tip))
  const incentives = sum(shift.incentives.map((i) => i.amount))
  const earnings = tripEarnings + tips + incentives
  const trips = shift.trips.length

  const hourly: HourBucket[] = []
  for (const p of shift.online) {
    const s = toMinutes(p.start)
    const e = toMinutes(p.end)
    for (let h = Math.floor(s / 60); h * 60 < e; h++) {
      const overlap = Math.min(e, (h + 1) * 60) - Math.max(s, h * 60)
      const inHour = shift.trips.filter((t) => hourOf(t) === h)
      hourly.push({
        hour: h,
        trips: inHour.length,
        earnings: sum(inHour.map((t) => t.earnings + t.tip)),
        onlineMinutes: overlap,
      })
    }
  }

  return {
    shift,
    date: shift.date,
    onlineMinutes,
    trips,
    tripEarnings,
    tips,
    incentives,
    earnings,
    perHour: onlineMinutes ? earnings / (onlineMinutes / 60) : 0,
    perTrip: trips ? tripEarnings / trips : 0,
    tripsPerHour: onlineMinutes ? trips / (onlineMinutes / 60) : 0,
    tollsReimbursed: sum(shift.trips.map((t) => t.tollReimbursed)),
    cashCollected: sum(shift.trips.map((t) => t.cashCollected)),
    hourly,
    windowLabel: shift.online.map((p) => clockRange(toMinutes(p.start), toMinutes(p.end))).join(', '),
    mainArea: mode(shift.trips.map((t) => t.area)),
    offers: shift.offers,
    offersPerHour: onlineMinutes ? shift.offers / (onlineMinutes / 60) : 0,
  }
}

export function summaryForDate(date: string): ShiftSummary | undefined {
  const s = shiftForDate(date)
  return s ? summarize(s) : undefined
}

function group(key: string) {
  return COMPARISON_GROUPS.find((g) => g.key === key)!
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export function baselineFor(summary: ShiftSummary, mode: ComparisonMode): Baseline {
  const g = group(summary.shift.comparisonKey)
  const area = areaName(g.area)

  if (mode === 'self') {
    const hist = HISTORY.filter((h) => h.comparisonKey === g.key && h.date < summary.date)
    const n = hist.length
    const hours = [...new Set(hist.flatMap((h) => Object.keys(h.hourlyTrips).map(Number)))].sort((a, b) => a - b)
    const hourlyTrips: Record<number, number> = {}
    hours.forEach((h) => (hourlyTrips[h] = avg(hist.map((x) => x.hourlyTrips[h] ?? 0))))
    const trips = avg(hist.map((h) => sum(Object.values(h.hourlyTrips))))
    const onlineMinutes = avg(hist.map((h) => h.onlineMinutes))
    const tripEarnings = avg(hist.map((h) => h.tripEarnings))
    const tips = avg(hist.map((h) => h.tips))
    const incentives = avg(hist.map((h) => h.incentives))
    const earnings = tripEarnings + tips + incentives
    const offers = avg(hist.map((h) => h.offers))
    return {
      mode,
      available: n >= MIN_SIMILAR_SHIFTS,
      count: n,
      required: MIN_SIMILAR_SHIFTS,
      criteria: `Average of your last ${plural(n, `${g.weekday} shift`, `${g.weekday} shifts`)} online ${g.hours}, mostly in ${area}, over the past 8 weeks.`,
      insufficientReason: `You have ${plural(n, 'similar shift', 'similar shifts')}. We compare once you have ${MIN_SIMILAR_SHIFTS} ${g.weekday} shifts at similar times in ${area}.`,
      onlineMinutes,
      trips,
      tripEarnings,
      tips,
      incentives,
      earnings,
      perHour: onlineMinutes ? earnings / (onlineMinutes / 60) : 0,
      perTrip: trips ? tripEarnings / trips : 0,
      tripsPerHour: onlineMinutes ? trips / (onlineMinutes / 60) : 0,
      hourlyTrips,
      offers,
      offersPerHour: onlineMinutes ? offers / (onlineMinutes / 60) : 0,
    }
  }

  const c = COHORTS.find((x) => x.comparisonKey === g.key)
  const drivers = c?.drivers ?? 0
  const trips = c ? sum(Object.values(c.hourlyTrips)) : 0
  const onlineMinutes = c?.onlineMinutes ?? 0
  const tripEarnings = c?.tripEarnings ?? 0
  const tips = c?.tips ?? 0
  const incentives = c?.incentives ?? 0
  const earnings = tripEarnings + tips + incentives
  return {
    mode,
    available: drivers >= MIN_COHORT_DRIVERS,
    count: drivers,
    required: MIN_COHORT_DRIVERS,
    criteria: `Average of ${drivers} drivers online ${g.hours} on ${g.weekday}s in ${area}, same vehicle category, over the past 8 weeks. No individual driver can be identified.`,
    insufficientReason: `Not enough drivers worked similar hours in ${area} to compare fairly.`,
    onlineMinutes,
    trips,
    tripEarnings,
    tips,
    incentives,
    earnings,
    perHour: onlineMinutes ? earnings / (onlineMinutes / 60) : 0,
    perTrip: trips ? tripEarnings / trips : 0,
    tripsPerHour: onlineMinutes ? trips / (onlineMinutes / 60) : 0,
    hourlyTrips: c?.hourlyTrips ?? {},
    offers: c?.offers ?? 0,
    offersPerHour: onlineMinutes && c ? c.offers / (onlineMinutes / 60) : 0,
  }
}

export const change = (value: number, base: number) => (base ? (value - base) / base : 0)

export function partOfDay(hour: number) {
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'late evening'
}

/** Splits the shift into contiguous periods that ran at, or below, the comparison's trip rate. */
export function periods(summary: ShiftSummary, base: Baseline): Period[] {
  const out: Period[] = []
  for (const b of summary.hourly) {
    const expected = base.hourlyTrips[b.hour] ?? 0
    const weak = base.available && expected > 0 && b.trips < expected * WEAK_HOUR_RATIO
    const last = out[out.length - 1]
    if (last && last.weak === weak && last.endHour === b.hour) {
      last.endHour = b.hour + 1
      last.trips += b.trips
      last.earnings += b.earnings
      last.onlineMinutes += b.onlineMinutes
      last.baselineTrips += expected
    } else {
      out.push({
        startHour: b.hour,
        endHour: b.hour + 1,
        label: '',
        trips: b.trips,
        earnings: b.earnings,
        onlineMinutes: b.onlineMinutes,
        perHour: 0,
        baselineTrips: expected,
        weak,
        area: summary.mainArea,
      })
    }
  }
  for (const p of out) {
    p.label = hourRange(p.startHour, p.endHour)
    p.perHour = p.onlineMinutes ? p.earnings / (p.onlineMinutes / 60) : 0
    const tripsIn = summary.shift.trips.filter((t) => {
      const h = Math.floor(toMinutes(t.start) / 60)
      return h >= p.startHour && h < p.endHour
    })
    if (tripsIn.length) p.area = mode(tripsIn.map((t) => t.area))
    p.observation = summary.shift.observations.find(
      (o) => o.area === p.area && o.startHour < p.endHour && o.endHour > p.startHour,
    )
  }
  return out
}

export function headline(summary: ShiftSummary, base: Baseline): string {
  const rate = change(summary.tripsPerHour, base.tripsPerHour)
  const perTrip = change(summary.perTrip, base.perTrip)
  const rateSteady = Math.abs(rate) < STEADY
  const tripSteady = Math.abs(perTrip) < STEADY
  if (!rateSteady && tripSteady) return `Your trip rate ${rate < 0 ? 'fell' : 'rose'}; earnings per trip stayed steady.`
  if (rateSteady && tripSteady) return 'Your trip rate and earnings per trip were close to usual.'
  if (rateSteady) return `Trips came at your usual rate; earnings per trip ${perTrip < 0 ? 'were lower' : 'were higher'}.`
  return `Your trip rate ${rate < 0 ? 'fell' : 'rose'} and earnings per trip ${perTrip < 0 ? 'fell' : 'rose'}.`
}

// ---------- Trip offers: cancellation rate and rating ----------

export type FactorStatus = 'flagged' | 'slight' | 'ok' | 'unavailable'

export interface OfferFactors {
  date: string
  cancel: {
    status: FactorStatus
    rate: number // 0–1
    usual: number // 0–1
    accepted: number
    cancelled: number
    windowStart: string
  }
  rating: { status: FactorStatus; value: number; usual: number }
  /** The factor to mention first, if any is flagged. */
  lead?: 'cancel' | 'rating'
}

/** Accepted (completed + driver-cancelled) trips per day, from every source in the dataset. */
function acceptedLog() {
  return [
    ...SHIFTS.map((s) => ({ date: s.date, accepted: s.trips.length + s.cancelledByDriver, cancelled: s.cancelledByDriver })),
    ...HISTORY.map((h) => ({ date: h.date, accepted: sum(Object.values(h.hourlyTrips)) + h.cancelledByDriver, cancelled: h.cancelledByDriver })),
    ...OTHER_DAYS.map((d) => ({ date: d.date, accepted: d.completedTrips + d.cancelledByDriver, cancelled: d.cancelledByDriver })),
  ]
}

export function usualCancellationRate() {
  return sum(ACCOUNT_HISTORY.map((w) => w.cancelledByDriver)) / sum(ACCOUNT_HISTORY.map((w) => w.accepted))
}
export const usualRating = () => avg(ACCOUNT_HISTORY.map((w) => w.rating))

/** Cancellation rate and rating as they stood at the end of `date`. */
export function offerFactors(date: string): OfferFactors {
  const windowStart = addDays(date, -(CANCEL_WINDOW_DAYS - 1))
  const inWindow = acceptedLog().filter((d) => d.date >= windowStart && d.date <= date)
  const accepted = sum(inWindow.map((d) => d.accepted))
  const cancelled = sum(inWindow.map((d) => d.cancelled))
  const rate = accepted ? cancelled / accepted : 0
  const usual = usualCancellationRate()
  const cancelStatus: FactorStatus =
    accepted < MIN_ACCEPTED_FOR_RATE ? 'unavailable' : (rate - usual) * 100 >= CANCEL_FLAG_POINTS ? 'flagged' : 'ok'

  const ratingDates = Object.keys(RATING_BY_DATE).filter((d) => d <= date).sort()
  const value = ratingDates.length ? RATING_BY_DATE[ratingDates[ratingDates.length - 1]] : NaN
  const usualR = usualRating()
  const drop = Math.round((usualR - value) * 100) / 100
  const ratingStatus: FactorStatus = Number.isNaN(value)
    ? 'unavailable'
    : drop >= RATING_FLAG_DROP
      ? 'flagged'
      : drop >= RATING_SLIGHT_DROP
        ? 'slight'
        : 'ok'

  return {
    date,
    cancel: { status: cancelStatus, rate, usual, accepted, cancelled, windowStart },
    rating: { status: ratingStatus, value, usual: usualR },
    lead: cancelStatus === 'flagged' ? 'cancel' : ratingStatus === 'flagged' ? 'rating' : undefined,
  }
}

/** Offers in this shift against the first available comparison (preferring `prefer`). */
export function offersComparison(summary: ShiftSummary, prefer: ComparisonMode = 'self') {
  const order: ComparisonMode[] = prefer === 'self' ? ['self', 'drivers'] : ['drivers', 'self']
  const base = order.map((m) => baselineFor(summary, m)).find((b) => b.available)
  const delta = base ? change(summary.offersPerHour, base.offersPerHour) : undefined
  return { base, delta, fewer: delta !== undefined && delta <= -OFFERS_DROP }
}

export const pctText = (r: number) => `${Math.round(r * 100)}%`

/** One plain sentence describing the lead factor. */
export function factorSentence(f: OfferFactors): string | undefined {
  if (f.lead === 'cancel')
    return `Your cancellation rate over the last 7 days is ${pctText(f.cancel.rate)}, above your usual ${pctText(f.cancel.usual)}. A higher rate can reduce offers.`
  if (f.lead === 'rating')
    return `Your rating is ${f.rating.value.toFixed(2)}, below your usual ${f.rating.usual.toFixed(2)}. A lower rating can reduce offers.`
  return undefined
}

/** The single explanatory insight on the Earnings screen. */
export function dayInsight(summary: ShiftSummary): Insight {
  // A flagged offer factor leads only when offers really fell and nothing observed explains it better.
  const factors = offerFactors(summary.date)
  const offers = offersComparison(summary)
  const lowDemand = summary.shift.observations.some((o) => o.requestsVsUsual < 90)
  if (factors.lead && offers.fewer && offers.base && !lowDemand) {
    const who = offers.base.mode === 'self' ? 'in similar shifts' : 'for similar drivers'
    return {
      title: `Fewer trip offers than ${offers.base.mode === 'self' ? 'usual' : 'similar drivers'}`,
      body: `You received ${summary.offers} offers in ${duration(summary.onlineMinutes)}, compared with about ${Math.round(offers.base.offers)} ${who}. ${factorSentence(factors)}`,
      tone: 'caution',
    }
  }

  const base = baselineFor(summary, 'self')
  if (!base.available) {
    const g = group(summary.shift.comparisonKey)
    return {
      title: 'Not enough similar shifts to compare yet',
      body: `This was your ${base.count === 1 ? 'second' : 'first'} ${g.weekday} shift at these times in ${areaName(g.area)}. After ${base.required}, we’ll explain how each one compares.`,
      tone: 'neutral',
    }
  }
  const tripsLine = `You completed ${summary.trips} trips, compared with ${Math.round(base.trips)} in similar shifts.`
  const extras = summary.tips + summary.incentives
  if (extras > 0 && extras / summary.earnings >= 0.1) {
    const parts = [
      summary.incentives ? `a ${inr(summary.incentives)} incentive` : '',
      summary.tips ? `${inr(summary.tips)} in tips` : '',
    ].filter(Boolean)
    const credited = parts.join(' and ')
    return {
      title: `Tips and incentives added ${inr(extras)}`,
      body: `${tripsLine} ${credited.charAt(0).toUpperCase()}${credited.slice(1)} ${parts.length > 1 ? 'were' : 'was'} credited.`,
      tone: 'positive',
    }
  }
  const weak = periods(summary, base).filter((p) => p.weak)
  const perTrip = change(summary.perTrip, base.perTrip)
  const perTripLine =
    Math.abs(perTrip) < STEADY
      ? `Average earnings per trip stayed at ${inr(summary.perTrip)}.`
      : `Average earnings per trip was ${inr(summary.perTrip)}, compared with ${inr(base.perTrip)}.`
  if (weak.length) {
    const longest = [...weak].sort((a, b) => b.endHour - b.startHour - (a.endHour - a.startHour))[0]
    return {
      title: `Fewer trips during your ${partOfDay(longest.startHour)} hours`,
      body: `${tripsLine} ${perTripLine}`,
      tone: 'caution',
    }
  }
  return { title: headline(summary, base), body: `${tripsLine} ${perTripLine}`, tone: 'neutral' }
}

export interface WeekDay {
  date: string
  status: DayStatus
  summary?: ShiftSummary
}

export function week(): { days: WeekDay[]; earnings: number; onlineMinutes: number; trips: number; perHour: number } {
  const days = weekDates().map((date) => ({ date, status: dayStatus(date), summary: summaryForDate(date) }))
  const shifts = days.flatMap((d) => (d.summary ? [d.summary] : []))
  const earnings = sum(shifts.map((s) => s.earnings))
  const onlineMinutes = sum(shifts.map((s) => s.onlineMinutes))
  return {
    days,
    earnings,
    onlineMinutes,
    trips: sum(shifts.map((s) => s.trips)),
    perHour: onlineMinutes ? earnings / (onlineMinutes / 60) : 0,
  }
}

/** The most recent day with a shift on or before `TODAY`. */
export function defaultDate(): string {
  return [...SHIFTS].filter((s) => s.date <= TODAY).sort((a, b) => (a.date < b.date ? 1 : -1))[0].date
}
