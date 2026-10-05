import { MIN_COHORT_DRIVERS, MIN_SIMILAR_SHIFTS } from '../data/sample'
import { defaultDate, offerFactors, pctText, type ShiftSummary } from '../lib/earnings'
import { dateLong, duration, inr } from '../lib/format'
import { BottomSheet } from './BottomSheet'

export type SheetId = 'perHour' | 'onlineTime' | 'earnings' | 'payouts' | 'comparison' | 'patterns' | 'offers' | 'route' | 'about'

const TITLES: Record<SheetId, string> = {
  perHour: 'Earnings per online hour',
  onlineTime: 'Online time',
  earnings: 'What counts as earnings',
  payouts: 'Earnings, payouts and cash',
  comparison: 'How comparisons work',
  patterns: 'About historical patterns',
  offers: 'Cancellations, rating and offers',
  route: 'How the suggested route works',
  about: 'About this prototype',
}

function OnlineDef() {
  return (
    <div className="def">
      <p className="def__title">Online time</p>
      <p>Time waiting for requests, travelling to pickups and completing trips. Time offline isn’t counted.</p>
    </div>
  )
}

function EarningsDef() {
  return (
    <div className="def">
      <p className="def__title">Earnings</p>
      <p>What you earned after applicable platform charges, before fuel and vehicle costs.</p>
      <ul>
        <li>Includes trip earnings and credited tips and incentives</li>
        <li>Excludes toll reimbursements</li>
      </ul>
    </div>
  )
}

export function InfoSheet({ id, summary, onClose }: { id: SheetId; summary?: ShiftSummary; onClose: () => void }) {
  let body: React.ReactNode
  switch (id) {
    case 'perHour':
      body = (
        <>
          <p>Your earnings divided by your online time. It shows how well your time online paid, which a total on its own can’t show.</p>
          {summary && (
            <p className="formula num">
              {inr(summary.earnings)} ÷ {duration(summary.onlineMinutes)} = {inr(summary.perHour)} / online hr
            </p>
          )}
          <EarningsDef />
          <OnlineDef />
        </>
      )
      break
    case 'onlineTime':
      body = (
        <>
          <OnlineDef />
          <p>Breaks you take while offline don’t lower your earnings per online hour.</p>
        </>
      )
      break
    case 'earnings':
      body = (
        <>
          <EarningsDef />
          <div className="def">
            <p className="def__title">This isn’t profit</p>
            <p>Fuel, maintenance, vehicle and other running costs are not deducted, so earnings are not your net profit.</p>
          </div>
          <div className="def">
            <p className="def__title">Platform charges</p>
            <p>Charges vary by trip, so we don’t show a single rate. Each trip’s earnings are already after its charges.</p>
          </div>
          <div className="def">
            <p className="def__title">Average per trip</p>
            <p>Trip earnings divided by trips. Tips and incentives are left out so trips can be compared fairly.</p>
          </div>
        </>
      )
      break
    case 'payouts':
      body = (
        <>
          <div className="def">
            <p className="def__title">Earnings</p>
            <p>What you earned in the period, whether riders paid digitally or in cash.</p>
          </div>
          <div className="def">
            <p className="def__title">Cash collected</p>
            <p>Money riders handed to you. It’s already with you, so it isn’t added to earnings a second time.</p>
          </div>
          <div className="def">
            <p className="def__title">Bank payouts</p>
            <p>Transfers to your bank account follow your payout schedule and account balance. A payout amount can differ from the earnings shown for a day.</p>
          </div>
        </>
      )
      break
    case 'comparison':
      body = (
        <>
          <div className="def">
            <p className="def__title">My similar shifts</p>
            <p>Your own past shifts on the same weekday, at similar hours, mostly in the same area, from the last 8 weeks. Needs at least {MIN_SIMILAR_SHIFTS} shifts.</p>
          </div>
          <div className="def">
            <p className="def__title">Similar drivers</p>
            <p>Averages for drivers in the same city and vehicle category, online at similar hours in the same area. Needs at least {MIN_COHORT_DRIVERS} drivers. No individual can be identified.</p>
          </div>
          <p>Comparisons describe what happened. They don’t show that a different time or area would have earned more.</p>
        </>
      )
      break
    case 'patterns':
      body = (
        <>
          <p>Area patterns show how busy each area usually was in the last 8 weeks, at the same hours on similar days (weekday or weekend).</p>
          <p>They are not live forecasts. Actual requests vary with weather, events and traffic, and patterns don’t guarantee trips or earnings.</p>
          <p>Patterns only cover the hours you plan to work. We won’t suggest starting earlier, finishing later or skipping your break.</p>
        </>
      )
      break
    case 'offers': {
      const f = offerFactors(summary?.date ?? defaultDate())
      body = (
        <>
          <p>Trip offers depend mostly on demand near you. Your cancellation rate and rating can also affect how many offers you receive.</p>
          <p className="formula num">
            As of {dateLong(f.date)}: cancellation rate {pctText(f.cancel.rate)} (usual {pctText(f.cancel.usual)}) · rating{' '}
            {f.rating.value.toFixed(2)} (usual {f.rating.usual.toFixed(2)})
          </p>
          <div className="def">
            <p className="def__title">Cancellation rate</p>
            <p>Trips you accepted and then cancelled, as a share of trips you accepted in the last 7 days. It comes down as days pass without cancellations.</p>
            <ul>
              <li>Not counted: cancellations for safety reasons you report</li>
              <li>Not counted: rider no-shows and trips the rider cancels</li>
            </ul>
          </div>
          <div className="def">
            <p className="def__title">Rating</p>
            <p>The average of your last 100 rated trips. One low rating has a small effect; a steady slide is worth a look.</p>
          </div>
          <div className="def">
            <p className="def__title">What helps</p>
            <ul>
              <li>Accept trips you plan to complete</li>
              <li>If a rider doesn’t arrive, mark a no-show instead of cancelling</li>
              <li>If something feels unsafe, cancel and report it. Your safety comes first, and it won’t count against you</li>
            </ul>
          </div>
          <p>We only mention these when one moves outside your usual range, and never while you’re driving.</p>
        </>
      )
      break
    }
    case 'route':
      body = (
        <>
          <p>We split your planned hours into two-hour slots and pick one area for each, starting from your start point and finishing near your end point by your planned finish time.</p>
          <div className="def">
            <p className="def__title">How each area is estimated</p>
            <p>From how busy it usually was at those hours on similar days in the last 8 weeks, and its average earnings per trip.</p>
          </div>
          <div className="def">
            <p className="def__title">Driving between areas</p>
            <p>Half of each drive is treated as unpaid time, since trips often come up on the way. A move is only suggested when it’s worth that time.</p>
          </div>
          <div className="def">
            <p className="def__title">Your limits come first</p>
            <p>The route never goes past your finish time or into your break, and it favours your preferred area if you set one.</p>
          </div>
          <p>These are estimates from past patterns, not live forecasts or guaranteed earnings.</p>
        </>
      )
      break
    case 'about':
      body = (
        <>
          <p>
            <strong>Independent concept.</strong> This is a design prototype of an earnings feature for ride-hailing drivers in India. It isn’t affiliated
            with, or endorsed by, Uber.
          </p>
          <p>
            <strong>Sample data.</strong> All drivers, trips, amounts, areas and demand levels are fictional. Today is treated as Sat, 3 Oct 2026.
          </p>
          <p>
            <strong>Use when parked.</strong> Detailed insights and planning are designed for when your vehicle is safely parked.
          </p>
          <p>
            <strong>Saved plans</strong> stay on this device only.
          </p>
        </>
      )
      break
  }
  return (
    <BottomSheet title={TITLES[id]} onClose={onClose}>
      {body}
    </BottomSheet>
  )
}
