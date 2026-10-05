/**
 * Central sample dataset.
 *
 * Every figure shown in the interface is calculated from this file by
 * `src/lib/earnings.ts` and `src/lib/plan.ts`. Nothing on screen is hard-coded.
 *
 * Definitions used throughout:
 * - Trip earnings: what the driver earned for a trip after applicable platform
 *   charges, before fuel and vehicle costs.
 * - Earnings = trip earnings + credited tips + credited incentives.
 *   Toll reimbursements are excluded (they repay a cost, they are not earnings).
 * - Online time: time waiting for requests, travelling to pickups and completing
 *   trips. Time offline is excluded.
 * - Cash collected is money riders paid in cash. It is not added to earnings and
 *   is kept separate from bank payouts.
 * - Trip offers: trip requests offered to the driver while online.
 * - Cancellation rate: trips the driver accepted and then cancelled, as a share
 *   of trips accepted, over the last 7 days. Safety cancellations the driver
 *   reports, rider no-shows and rider cancellations are not counted.
 * - Rating: average of the driver's last 100 rated trips.
 *
 * All data is fictional sample data for a concept prototype.
 */

export type AreaId = 'andheri-east' | 'bkc' | 'powai' | 'lower-parel' | 'goregaon'

export interface Area {
  id: AreaId
  name: string
  /** Position on the schematic area view (100 × 66 grid units, roughly north at top; not to scale). */
  tile: { x: number; y: number; w: number; h: number }
}

export const AREAS: Area[] = [
  { id: 'goregaon', name: 'Goregaon', tile: { x: 6, y: 2, w: 40, h: 14 } },
  { id: 'andheri-east', name: 'Andheri East', tile: { x: 26, y: 19, w: 44, h: 14 } },
  { id: 'powai', name: 'Powai', tile: { x: 73, y: 12, w: 25, h: 24 } },
  { id: 'bkc', name: 'BKC', tile: { x: 40, y: 36, w: 30, h: 12 } },
  { id: 'lower-parel', name: 'Lower Parel', tile: { x: 12, y: 51, w: 40, h: 13 } },
]

export interface Trip {
  id: string
  /** Local time the trip started, 24h "HH:MM". */
  start: string
  area: AreaId
  /** Trip earnings in ₹ (after applicable platform charges). */
  earnings: number
  /** Credited tip in ₹. */
  tip: number
  /** Toll reimbursed in ₹ — excluded from earnings. */
  tollReimbursed: number
  /** Amount the rider paid in cash, ₹ (0 for digital payment). */
  cashCollected: number
}

export interface Incentive {
  id: string
  label: string
  amount: number
}

export interface AreaObservation {
  area: AreaId
  startHour: number
  endHour: number
  /** Ride requests in the area as a % of its usual level for this day and time. */
  requestsVsUsual: number
}

export interface Shift {
  id: string
  date: string // YYYY-MM-DD
  /** Online periods, 24h "HH:MM". */
  online: { start: string; end: string }[]
  trips: Trip[]
  incentives: Incentive[]
  /** Which comparison groups this shift belongs to. */
  comparisonKey: string
  observations: AreaObservation[]
  /** Trip requests offered while online. */
  offers: number
  /** Trips accepted and then cancelled by the driver (counted in the cancellation rate). */
  cancelledByDriver: number
}

/** A summarised past shift used to build "My similar shifts". */
export interface HistoricalShift {
  date: string
  comparisonKey: string
  onlineMinutes: number
  /** Trips started in each clock hour. */
  hourlyTrips: Record<number, number>
  tripEarnings: number
  tips: number
  incentives: number
  offers: number
  cancelledByDriver: number
}

/** Aggregated anonymous figures for "Similar drivers" (per-driver averages). */
export interface DriverCohort {
  comparisonKey: string
  drivers: number
  onlineMinutes: number
  hourlyTrips: Record<number, number>
  tripEarnings: number
  tips: number
  incentives: number
  offers: number
}

export interface ComparisonGroup {
  key: string
  weekday: string
  hours: string
  area: AreaId
}

export const TODAY = '2026-10-03'
export const WEEK = { start: '2026-09-28', end: '2026-10-04' }
/** Minimum similar shifts before we show a personal comparison. */
export const MIN_SIMILAR_SHIFTS = 3
/** Minimum drivers before we show a cohort comparison. */
export const MIN_COHORT_DRIVERS = 20

export const COMPARISON_GROUPS: ComparisonGroup[] = [
  { key: 'fri-midday-andheri', weekday: 'Friday', hours: '10 am–4 pm', area: 'andheri-east' },
  { key: 'mon-split-andheri', weekday: 'Monday', hours: '8–11 am and 6–8 pm', area: 'andheri-east' },
  { key: 'wed-afternoon-powai', weekday: 'Wednesday', hours: '2–6 pm', area: 'powai' },
]

const t = (
  id: string,
  start: string,
  area: AreaId,
  earnings: number,
  extra: Partial<Pick<Trip, 'tip' | 'tollReimbursed' | 'cashCollected'>> = {},
): Trip => ({ id, start, area, earnings, tip: 0, tollReimbursed: 0, cashCollected: 0, ...extra })

export const SHIFTS: Shift[] = [
  // Second sample day: includes tips, an incentive, a toll reimbursement and cash trips.
  {
    id: 'shift-2026-09-28',
    date: '2026-09-28',
    online: [
      { start: '08:00', end: '11:00' },
      { start: '18:00', end: '20:00' },
    ],
    trips: [
      t('M1', '08:06', 'andheri-east', 152),
      t('M2', '08:41', 'andheri-east', 139, { cashCollected: 170 }),
      t('M3', '09:04', 'goregaon', 161, { tip: 20 }),
      t('M4', '09:39', 'andheri-east', 144),
      t('M5', '10:12', 'andheri-east', 133),
      t('M6', '10:44', 'bkc', 158, { tollReimbursed: 65 }),
      t('M7', '18:08', 'bkc', 149),
      t('M8', '18:43', 'andheri-east', 142, { cashCollected: 160 }),
      t('M9', '19:05', 'andheri-east', 155, { tip: 40 }),
      t('M10', '19:37', 'andheri-east', 147),
    ],
    incentives: [{ id: 'I1', label: 'Weekday incentive', amount: 200 }],
    comparisonKey: 'mon-split-andheri',
    observations: [],
    offers: 12,
    cancelledByDriver: 0,
  },
  // Too little personal history to compare; fewer offers while the cancellation rate was high.
  {
    id: 'shift-2026-09-30',
    date: '2026-09-30',
    online: [{ start: '14:00', end: '18:00' }],
    trips: [
      t('W1', '14:18', 'powai', 160),
      t('W2', '15:02', 'powai', 148, { cashCollected: 180 }),
      t('W3', '15:41', 'powai', 152),
      t('W4', '16:10', 'andheri-east', 170, { tip: 40 }),
      t('W5', '17:04', 'powai', 141),
      t('W6', '17:36', 'powai', 159),
    ],
    incentives: [],
    comparisonKey: 'wed-afternoon-powai',
    observations: [],
    offers: 7,
    cancelledByDriver: 0,
  },
  // The featured shift.
  {
    id: 'shift-2026-10-02',
    date: '2026-10-02',
    online: [{ start: '10:00', end: '16:00' }],
    trips: [
      t('F1', '10:05', 'andheri-east', 165),
      t('F2', '10:38', 'andheri-east', 132, { cashCollected: 180 }),
      t('F3', '11:10', 'andheri-east', 148),
      t('F4', '11:42', 'goregaon', 171),
      t('F5', '12:25', 'andheri-east', 139, { cashCollected: 165 }),
      t('F6', '13:05', 'andheri-east', 152),
      t('F7', '13:40', 'andheri-east', 143),
      t('F8', '14:35', 'andheri-east', 140),
      t('F9', '15:20', 'andheri-east', 160, { cashCollected: 195 }),
    ],
    incentives: [],
    comparisonKey: 'fri-midday-andheri',
    observations: [{ area: 'andheri-east', startHour: 14, endHour: 16, requestsVsUsual: 68 }],
    offers: 11,
    cancelledByDriver: 0,
  },
]

export const HISTORY: HistoricalShift[] = [
  // Fridays 10 am–4 pm, Andheri East
  { date: '2026-09-25', comparisonKey: 'fri-midday-andheri', onlineMinutes: 360, hourlyTrips: { 10: 2, 11: 2, 12: 1, 13: 2, 14: 2, 15: 3 }, tripEarnings: 1800, tips: 0, incentives: 0, offers: 15, cancelledByDriver: 1 },
  { date: '2026-09-18', comparisonKey: 'fri-midday-andheri', onlineMinutes: 360, hourlyTrips: { 10: 2, 11: 2, 12: 1, 13: 1, 14: 2, 15: 3 }, tripEarnings: 1690, tips: 0, incentives: 0, offers: 14, cancelledByDriver: 0 },
  { date: '2026-09-11', comparisonKey: 'fri-midday-andheri', onlineMinutes: 360, hourlyTrips: { 10: 2, 11: 2, 12: 2, 13: 2, 14: 2, 15: 3 }, tripEarnings: 1910, tips: 0, incentives: 0, offers: 16, cancelledByDriver: 0 },
  { date: '2026-09-04', comparisonKey: 'fri-midday-andheri', onlineMinutes: 360, hourlyTrips: { 10: 2, 11: 2, 12: 1, 13: 3, 14: 2, 15: 2 }, tripEarnings: 1800, tips: 0, incentives: 0, offers: 15, cancelledByDriver: 0 },
  // Mondays 8–11 am and 6–8 pm, Andheri East
  { date: '2026-09-21', comparisonKey: 'mon-split-andheri', onlineMinutes: 300, hourlyTrips: { 8: 2, 9: 2, 10: 1, 18: 2, 19: 2 }, tripEarnings: 1350, tips: 50, incentives: 200, offers: 11, cancelledByDriver: 0 },
  { date: '2026-09-14', comparisonKey: 'mon-split-andheri', onlineMinutes: 300, hourlyTrips: { 8: 2, 9: 1, 10: 2, 18: 2, 19: 2 }, tripEarnings: 1330, tips: 40, incentives: 200, offers: 11, cancelledByDriver: 0 },
  { date: '2026-09-07', comparisonKey: 'mon-split-andheri', onlineMinutes: 300, hourlyTrips: { 8: 2, 9: 2, 10: 1, 18: 2, 19: 2 }, tripEarnings: 1370, tips: 60, incentives: 200, offers: 11, cancelledByDriver: 0 },
  // Wednesdays 2–6 pm, Powai — only one, so not enough to compare
  { date: '2026-09-23', comparisonKey: 'wed-afternoon-powai', onlineMinutes: 240, hourlyTrips: { 14: 1, 15: 1, 16: 2, 17: 1 }, tripEarnings: 760, tips: 0, incentives: 0, offers: 7, cancelledByDriver: 0 },
]

export const COHORTS: DriverCohort[] = [
  { comparisonKey: 'fri-midday-andheri', drivers: 48, onlineMinutes: 360, hourlyTrips: { 10: 2, 11: 2, 12: 1, 13: 2, 14: 2, 15: 2 }, tripEarnings: 1650, tips: 0, incentives: 0, offers: 14 },
  { comparisonKey: 'mon-split-andheri', drivers: 52, onlineMinutes: 300, hourlyTrips: { 8: 2, 9: 2, 10: 1, 18: 2, 19: 2 }, tripEarnings: 1370, tips: 40, incentives: 150, offers: 11 },
  { comparisonKey: 'wed-afternoon-powai', drivers: 36, onlineMinutes: 240, hourlyTrips: { 14: 1.5, 15: 1.5, 16: 2, 17: 2 }, tripEarnings: 1050, tips: 20, incentives: 0, offers: 10 },
]

/** Other days with accepted trips that aren't in a comparison group (used for the cancellation rate). */
export const OTHER_DAYS: { date: string; completedTrips: number; cancelledByDriver: number }[] = [
  { date: '2026-09-24', completedTrips: 6, cancelledByDriver: 2 },
]

/** Cancellation rate is measured over this many days. */
export const CANCEL_WINDOW_DAYS = 7
/** Below this many accepted trips in the window we don't show a rate. */
export const MIN_ACCEPTED_FOR_RATE = 20
/** Flag when the rate is at least this many percentage points above usual. */
export const CANCEL_FLAG_POINTS = 3
/** Rating: "slightly lower" and "lower than usual" thresholds below the usual rating. */
export const RATING_SLIGHT_DROP = 0.05
export const RATING_FLAG_DROP = 0.1
/** Offers count as "fewer than usual" at this relative drop per online hour. */
export const OFFERS_DROP = 0.15

/** The 8 weeks before this one — sets the driver's usual cancellation rate and rating. */
export const ACCOUNT_HISTORY: { weekEnding: string; accepted: number; cancelledByDriver: number; rating: number }[] = [
  { weekEnding: '2026-08-02', accepted: 50, cancelledByDriver: 1, rating: 4.87 },
  { weekEnding: '2026-08-09', accepted: 50, cancelledByDriver: 2, rating: 4.86 },
  { weekEnding: '2026-08-16', accepted: 50, cancelledByDriver: 1, rating: 4.85 },
  { weekEnding: '2026-08-23', accepted: 50, cancelledByDriver: 2, rating: 4.87 },
  { weekEnding: '2026-08-30', accepted: 50, cancelledByDriver: 1, rating: 4.86 },
  { weekEnding: '2026-09-06', accepted: 50, cancelledByDriver: 2, rating: 4.86 },
  { weekEnding: '2026-09-13', accepted: 50, cancelledByDriver: 1, rating: 4.85 },
  { weekEnding: '2026-09-20', accepted: 50, cancelledByDriver: 2, rating: 4.86 },
]

/** Rating (last 100 rated trips) at the end of each day with a shift this week. */
export const RATING_BY_DATE: Record<string, number> = {
  '2026-09-28': 4.85,
  '2026-09-30': 4.79,
  '2026-10-02': 4.8,
}

/**
 * Historical ride-request level by area and hour (index; 100 = busiest hour
 * across all areas). Hours 5–23 (value = the hour starting at that time).
 * Last 8 weeks. Not a live forecast.
 */
export const DEMAND_FIRST_HOUR = 5
export const DEMAND: Record<AreaId, { weekday: number[]; weekend: number[] }> = {
  'andheri-east': {
    weekday: [20, 30, 55, 75, 80, 65, 55, 50, 50, 40, 42, 55, 72, 90, 92, 70, 50, 35, 22],
    weekend: [15, 18, 25, 35, 45, 55, 62, 65, 62, 55, 55, 60, 68, 75, 80, 78, 65, 50, 35],
  },
  bkc: {
    weekday: [10, 22, 50, 85, 95, 80, 55, 50, 52, 45, 48, 62, 88, 96, 82, 45, 30, 22, 12],
    weekend: [8, 10, 15, 20, 28, 35, 40, 45, 42, 38, 36, 40, 45, 50, 55, 52, 42, 30, 18],
  },
  powai: {
    weekday: [15, 25, 50, 72, 78, 60, 48, 45, 44, 40, 42, 50, 62, 75, 85, 80, 58, 38, 22],
    weekend: [12, 15, 22, 30, 40, 50, 58, 62, 60, 52, 50, 55, 62, 70, 76, 74, 62, 45, 30],
  },
  'lower-parel': {
    weekday: [12, 18, 35, 55, 68, 62, 60, 70, 72, 55, 50, 55, 68, 78, 82, 85, 80, 66, 45],
    weekend: [20, 15, 18, 25, 35, 45, 55, 68, 70, 60, 55, 58, 66, 78, 88, 95, 92, 80, 60],
  },
  goregaon: {
    weekday: [18, 32, 58, 78, 82, 62, 50, 46, 45, 40, 44, 58, 80, 86, 78, 58, 42, 28, 16],
    weekend: [12, 16, 24, 32, 42, 52, 58, 60, 58, 50, 50, 56, 64, 70, 72, 66, 54, 40, 26],
  },
}

/** Average trip earnings per trip by area (₹, after platform charges). Used for route estimates only. */
export const AREA_TRIP_EARNINGS: Record<AreaId, number> = {
  'andheri-east': 150,
  bkc: 175,
  powai: 160,
  'lower-parel': 170,
  goregaon: 140,
}

/** Typical drive time between areas in minutes (sample). */
export const TRAVEL_MINUTES: [AreaId, AreaId, number][] = [
  ['andheri-east', 'goregaon', 20],
  ['andheri-east', 'powai', 25],
  ['andheri-east', 'bkc', 30],
  ['andheri-east', 'lower-parel', 50],
  ['goregaon', 'powai', 35],
  ['goregaon', 'bkc', 45],
  ['goregaon', 'lower-parel', 60],
  ['powai', 'bkc', 35],
  ['powai', 'lower-parel', 55],
  ['bkc', 'lower-parel', 25],
]

/**
 * Route estimate model (concept):
 * trips per online hour = BASE + PER_DEMAND × (request level ÷ 100);
 * share of a drive between areas assumed unpaid (trips often come up on the way);
 * weight applied to areas other than the driver's preferred one.
 */
export const ROUTE_MODEL = {
  baseTripsPerHour: 1.2,
  tripsPerHourAtPeak: 1.2,
  unpaidDriveShare: 0.5,
  preferenceWeight: 0.9,
  slotMinutes: 120,
  /** A drop-off within this many minutes of the route area counts as "near your route". */
  nearMinutes: 25,
}

/** Sample trip requests, timed relative to the plan's start. */
export interface RequestSample {
  id: string
  offsetMin: number
  pickup: AreaId
  drop: AreaId
  /** Estimated trip earnings, ₹. */
  fare: number
  pickupMin: number
  pickupKm: number
  tripMin: number
  tripKm: number
  payment: 'UPI' | 'Cash'
  riderRating: number
}

export const REQUEST_SAMPLES: RequestSample[] = [
  { id: 'R1', offsetMin: 5, pickup: 'andheri-east', drop: 'bkc', fare: 196, pickupMin: 3, pickupKm: 0.9, tripMin: 34, tripKm: 9.8, payment: 'UPI', riderRating: 4.9 },
  { id: 'R2', offsetMin: 50, pickup: 'bkc', drop: 'bkc', fare: 132, pickupMin: 4, pickupKm: 1.2, tripMin: 14, tripKm: 4.1, payment: 'UPI', riderRating: 4.8 },
  { id: 'R3', offsetMin: 85, pickup: 'bkc', drop: 'goregaon', fare: 228, pickupMin: 5, pickupKm: 1.6, tripMin: 41, tripKm: 15.2, payment: 'Cash', riderRating: 4.7 },
  { id: 'R4', offsetMin: 140, pickup: 'bkc', drop: 'lower-parel', fare: 171, pickupMin: 4, pickupKm: 1.1, tripMin: 22, tripKm: 7.5, payment: 'UPI', riderRating: 4.9 },
  { id: 'R5', offsetMin: 215, pickup: 'bkc', drop: 'andheri-east', fare: 238, pickupMin: 5, pickupKm: 1.4, tripMin: 36, tripKm: 10.6, payment: 'UPI', riderRating: 4.8 },
  { id: 'R6', offsetMin: 285, pickup: 'andheri-east', drop: 'powai', fare: 214, pickupMin: 4, pickupKm: 1.0, tripMin: 33, tripKm: 9.4, payment: 'Cash', riderRating: 4.9 },
]

export interface Plan {
  date: string
  start: string // "HH:MM"
  finish: string
  breakEnabled: boolean
  breakStart: string
  breakMinutes: number
  /** Where the driver starts and wants to finish. */
  startArea: AreaId
  endArea: AreaId
  /** Optional area the driver prefers to stay in. */
  area: AreaId | 'any'
}

export const DEFAULT_PLAN: Plan = {
  date: '2026-10-05',
  start: '16:00',
  finish: '21:00',
  breakEnabled: false,
  breakStart: '18:30',
  breakMinutes: 30,
  startArea: 'andheri-east',
  endArea: 'andheri-east',
  area: 'any',
}
