# Driver Earnings Dashboard (concept)

A mobile-first earnings feature for ride-hailing drivers in India. It puts **earnings per online hour** first, explains why a shift went better or worse than usual, and helps drivers plan within hours they choose.

> This is an independent design concept that uses fictional sample data. It isn't affiliated with or endorsed by Uber.

**Live demo:** https://darshank20.github.io/driver-earnings-dashboard/

## Deploy (GitHub Pages)

Every push to `main` builds the app and publishes it with `.github/workflows/deploy.yml`. Set it up once: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site then appears at `https://<user>.github.io/<repo>/`.

## Run it

**Quickest:** open `driver-earnings.html` (the single-file build) in any modern browser. It needs no install and no server.

**Development (Node 20+):**

```bash
npm install
npm run dev          # http://localhost:5173 — opens on Earnings
```

**Builds:**

```bash
npm run build        # dist/  (serve with: npm run preview)
npm run build:single # dist-single/index.html — one self-contained file
```

**Automated checks** (layout at 360/390/768/1280 px, the core flow, and that figures reconcile):

```bash
npx playwright install chromium   # once
npm run build:single && npm run verify
```

## What's implemented

- **Earnings:** compact header and a week/day selector. The figure ₹225 / online hr leads, followed by "25% below your usual ₹300/hr". **Total earnings (₹1,350)** sits as a clear second figure, with 6 hr online · 9 trips beside it. One insight sits under that, with an action to "Understand this shift". The week trend chart has a per-hour/total toggle; tap a bar to inspect it. The earnings breakdown expands to show trips. Tolls and cash are kept apart from earnings.
- **Insights:** a "safely parked" notice, then the lead line "Your trip rate fell; earnings per trip stayed steady." A switch compares the shift with **My similar shifts** or **Similar drivers**, and the comparison criteria are explained. Trips by hour are charted against the comparison. A time breakdown shows 10 am–2 pm (7 trips, ₹1,050) and 2–4 pm (2 trips, ₹300). The Andheri East · 2–4 pm card is framed as an observed pattern, not proof. Ends with "Plan my next shift".
- **Plan:** editable day, start, finish, optional break (start and length), **start point, end point** and an optional preferred area. A schematic area view and area cards show historical patterns inside the planned hours only, and the break is excluded. Patterns update as times change. Save shows a confirmation and is stored in `localStorage`. The saved plan can be edited or removed. Invalid times are flagged, and a long-shift caution appears over 10 hours. There are no streaks, countdowns or prompts to work longer.
- **Suggested route:** the planned hours are split into two-hour slots, and one area is picked per slot to maximise estimated earnings per online hour. The route starts at the start point and finishes near the end point by the finish time. Drives between areas cost time, and the route never runs into the break. It's compared with staying in the start area. For the sample (Mon, 4–9 pm, Andheri East → Andheri East) it suggests BKC from 4–8 pm, then back to Andheri East from 8–9 pm: about ₹333/hr vs ₹316/hr (+5%).
- **Two-hour slot selector (Area patterns):** choose "All hours" or a slot. Areas are re-shaded from quietest to busiest for that slot and listed busiest first. The route's area is marked, and each card shows the estimate behind the route choice.
- **Trip requests (rider screen):** opened from the suggested route with "Preview trip requests on this route". Six sample requests are each checked against the route:
  - **On your route:** keeps you in the slot's area, takes you to the next one, or ends near your end point.
  - **Near your route:** drops you within 25 minutes of the route area.
  - **Off your route:** drops you further away.
  - **Past your finish:** the trip would end after the planned finish.

  Each request shows a schematic map of pickup → drop-off, the estimated fare, the times, and Accept or Skip. There's no countdown, and skipping isn't a cancellation.
- **Cancellations, rating and trip offers (pain point #5):** a driver hears about this on three tiers, so most days nothing is added.
  1. **Earnings stays quiet** unless a factor is out of range *and* offers fell *and* nothing observed (such as low area demand) explains it better. Only then does the single Earnings insight become "Fewer trip offers than …". Wed 30 Sep shows this case.
  2. **Insights has a "Trip offers" section** (a factor that needs attention gets an amber tint, a marker and a bold value) with offers against the comparison. The cancellation-rate and rating rows collapse to one line when nothing is flagged (Fri). They expand with one plain explanation when something is: Wed when offers fell, and Mon as a calm heads-up when offers didn't fall.
  3. **A sheet explains it on demand:** what counts, what doesn't (safety cancellations, rider no-shows), how the rate recovers, and what helps. Safety always comes first, and acceptance rate is never shown.
- **States:** Wed 30 Sep shows insufficient data (one similar shift). Tue 29 Sep and Thu 1 Oct are offline days, and Sat 3 Oct is today with no online time yet.
- **Sheets:** definitions of earnings per online hour, online time, earnings, payouts and cash, comparisons, historical patterns, and About. Sheets close with the close button, Esc, a tap on the scrim, or by dragging the handle. Focus is trapped while open and returns to the trigger.
- **Responsive:** designed at 390 px and works down to 360 px without horizontal scrolling. The bottom nav respects the safe area and doesn't cover content. From 1024 px there's a side rail and two-column layouts that keep the mobile hierarchy.

## Structure

```
src/
  data/sample.ts        Central sample dataset (shifts, trips, history, cohorts, area demand)
  lib/earnings.ts       All earnings calculations, comparisons, periods, insights
  lib/plan.ts           Plan validation, area patterns, persistence
  lib/format.ts         ₹ (en-IN grouping), durations, times, dates
  styles/tokens.css     Design tokens (colour, type, spacing, radius, motion)
  styles/app.css        Component styles built on the tokens
  components/           Shared UI: BottomSheet, DateStrip, WeekChart, HourlyChart, Breakdown, Controls, Icon, InfoSheets
  screens/              Earnings, Insights, Plan
scripts/verify.mjs      Playwright end-to-end check
```

## Definitions used

- **Earnings** = trip earnings (after applicable platform charges) + credited tips + credited incentives. Fuel and vehicle costs are not deducted, so this isn't profit. Toll reimbursements are excluded.
- **Online time** = time waiting for requests, travelling to pickups and completing trips. Time offline isn't counted.
- **Average per trip** = trip earnings ÷ trips (tips and incentives excluded).
- **Cash collected** and **bank payouts** are shown separately from earnings. No universal commission rate is shown.
- **Cancellation rate** = trips accepted then cancelled by the driver ÷ trips accepted, over the last 7 days. It needs at least 20 accepted trips and is flagged at 3 or more points above the 8-week usual rate. Safety cancellations, rider no-shows and rider cancellations aren't counted.
- **Rating** = average of the last 100 rated trips. It's shown as "slightly lower" at 0.05 below the usual rating and flagged at 0.10 below.
- **Offers** = trip requests offered while online. They're shown as "fewer" when offers per online hour are 15% or more below the comparison.

## Sample figures (all calculated from `src/data/sample.ts`)

| Day | Earnings | Online | Trips | Tips + incentives | ₹/online hr | vs usual |
|---|---|---|---|---|---|---|
| Fri 2 Oct | ₹1,350 | 6 hr | 9 | ₹0 | ₹225 | −25% vs ₹300 |
| Mon 28 Sep | ₹1,740 | 5 hr | 10 | ₹60 + ₹200 | ₹348 | +9% vs ₹320 |
| Wed 30 Sep | ₹970 | 4 hr | 6 | ₹40 + ₹0 | ₹243 | not enough data (7 offers vs ~10 for similar drivers; cancellation rate 8% vs usual 3%) |
| **Week** | **₹4,060** | **15 hr** | **25** | | **₹271** | |

## Route estimate model (sample)

Estimated ₹ per online hour = average earnings per trip in the area × (1.2 + 1.2 × historical request level ÷ 100).

- Half of each drive between areas counts as unpaid, since trips often come up on the way.
- Other areas are weighted 0.9 when a preferred area is set.
- The constants are in `ROUTE_MODEL`, `AREA_TRIP_EARNINGS` and `TRAVEL_MINUTES` in `src/data/sample.ts`.
- These are illustrative estimates, not a pricing or dispatch model.

## Assumptions

- Uber Move wasn't supplied, so DM Sans (self-hosted via Fontsource, SIL OFL) stands in. To use Uber Move, change `--font` in `tokens.css`.
- "Today" is fixed at Sat, 3 Oct 2026 so the sample week behaves predictably.
- Times are planned in 30-minute steps between 5 am and 11:30 pm. Plans that run past midnight aren't supported.
