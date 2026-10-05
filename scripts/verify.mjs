/**
 * End-to-end check of the core flow and the figures on screen.
 *
 *   npm run build:single && npm run verify
 *
 * Needs Playwright's Chromium (`npx playwright install chromium`), or set
 * CHROMIUM_PATH to an existing Chromium/Chrome executable.
 * Screenshots are written to ./verify-shots.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const URL = pathToFileURL(resolve('dist-single/index.html')).href
const SHOTS = resolve('verify-shots')
mkdirSync(SHOTS, { recursive: true })

let failures = 0
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`)
  if (!cond) failures++
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})

// ---------- Layout at each width ----------
for (const [w, h] of [[360, 740], [390, 844], [768, 1024], [1280, 860]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  for (const tab of ['earnings', 'insights', 'plan']) {
    await page.goto(`${URL}#/${tab}`)
    await page.waitForTimeout(150)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(overflow === 0, `${w}px ${tab}: no horizontal scroll`)
    // The last element of the page must clear the bottom navigation when scrolled to the end.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const clear = await page.evaluate(() => {
      const nav = document.querySelector('.nav').getBoundingClientRect()
      const items = [...document.querySelectorAll('main button, main a, main p, main li')]
      const last = items[items.length - 1].getBoundingClientRect()
      return window.innerWidth >= 1024 || last.bottom <= nav.top
    })
    ok(clear, `${w}px ${tab}: bottom navigation doesn't cover content`)
    await page.screenshot({ path: `${SHOTS}/${w}-${tab}.png`, fullPage: false })
  }
  ok(errors.length === 0, `${w}px: no runtime errors ${errors.join('; ')}`)
  await page.close()
}

// ---------- Core flow at 390px ----------
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto(URL)
await page.evaluate(() => localStorage.clear())
await page.reload()
const text = () => page.locator('main').innerText()

// Earnings first viewport
let t = await text()
ok(t.includes('₹225') && t.includes('/ online hr'), 'Earnings opens on ₹225 / online hr')
ok(/25% below\s*your usual ₹300\/hr/.test(t), 'Comparison: 25% below your usual ₹300/hr')
ok(/Total earnings\s*₹1,350\s*6 hr online\s*9 trips/.test(t), 'Total earnings ₹1,350 shown prominently with 6 hr online · 9 trips')
ok(t.includes('Fewer trips during your afternoon hours'), 'Insight title')
ok(t.includes('You completed 9 trips, compared with 12 in similar shifts. Average earnings per trip stayed at ₹150.'), 'Insight body')
const btn = page.getByRole('button', { name: 'Understand this shift' })
const box = await btn.boundingBox()
ok(box && box.y + box.height <= 844 - 64, 'Action is inside the first viewport, above the nav')

// Info sheet: focus management
await page.getByRole('button', { name: 'About earnings per online hour' }).click()
ok(await page.getByRole('dialog').isVisible(), 'Info sheet opens')
ok((await page.getByRole('dialog').innerText()).includes('₹1,350 ÷ 6 hr = ₹225'), 'Sheet formula reconciles')
ok(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Close'), 'Focus moves into the sheet')
await page.keyboard.press('Escape')
ok((await page.getByRole('dialog').count()) === 0, 'Escape dismisses the sheet')
ok(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'About earnings per online hour'), 'Focus returns to the trigger')

// Breakdown
await page.getByRole('button', { name: /Trip earnings/ }).click()
ok((await page.locator('.trip').count()) === 9, 'Breakdown expands to 9 trips')
const tripSum = await page.locator('.trip').evaluateAll((els) =>
  els.reduce((a, el) => a + Number(el.lastElementChild.firstChild.textContent.replace(/[₹,]/g, '')), 0),
)
ok(tripSum === 1350, `Trip amounts sum to ₹1,350 (got ₹${tripSum})`)

// Chart inspection
await page.getByRole('button', { name: /Mon, 28 Sep: ₹348 per online hour/ }).click()
ok((await page.locator('.readout').first().innerText()).includes('₹348/online hr'), 'Chart inspection shows Monday')

// Date selection: second sample day with tips and incentives
await page.getByRole('radio', { name: /Mon, 28 Sep/ }).click()
t = await text()
ok(t.includes('₹348') && /9% above\s*your usual ₹320\/hr/.test(t), 'Mon: ₹348/hr, 9% above usual ₹320/hr')
ok(/Total earnings\s*₹1,740\s*5 hr online\s*10 trips/.test(t), 'Mon: ₹1,740 · 5 hr · 10 trips')
ok(t.includes('Tips and incentives added ₹260'), 'Mon insight: tips and incentives')
ok(/Tips\s*On 2 trips\s*₹60/.test(t) && /Incentives\s*Weekday incentive\s*₹200/.test(t), 'Mon breakdown: ₹60 tips, ₹200 incentive')
ok(/Toll reimbursements[\s\S]*₹65/.test(t), 'Mon: toll reimbursement shown outside earnings')

// Insufficient data and empty states
await page.getByRole('radio', { name: /Wed, 30 Sep/ }).click()
t = await text()
ok(t.includes('No usual rate yet for shifts like this'), 'Wed: insufficient-data state')
ok(
  t.includes('Fewer trip offers than similar drivers') &&
    t.includes('You received 7 offers in 4 hr, compared with about 10 for similar drivers.') &&
    t.includes('cancellation rate over the last 7 days is 8%, above your usual 3%'),
  'Wed: offers insight links fewer offers to the cancellation rate',
)
await page.getByRole('button', { name: 'Understand this shift' }).click()
t = await text()
ok(t.includes('Not enough similar shifts yet'), 'Wed Insights: personal comparison unavailable')
ok(/7 offers[\s\S]*30% fewer/.test(t) && /Cancellation rate[\s\S]*8%[\s\S]*Higher than usual/.test(t), 'Wed Insights: factors expanded and flagged')
ok(/Rating[\s\S]*4\.79[\s\S]*Slightly lower/.test(t), 'Wed Insights: rating slide shown calmly')
await page.getByRole('button', { name: 'Earnings', exact: true }).click()
await page.getByRole('radio', { name: /Tue, 29 Sep/ }).click()
ok((await text()).includes('You were offline on Tue, 29 Sep'), 'Tue: empty state')
await page.getByRole('radio', { name: /Sat, 3 Oct/ }).click()
ok((await text()).includes('No online time yet today'), 'Today: empty state')
await page.getByRole('button', { name: 'Show latest shift' }).click()
ok((await text()).includes('₹225'), 'Back to latest shift')

// Earnings → Insights
await page.getByRole('button', { name: 'Understand this shift' }).click()
t = await text()
ok(t.includes('Your trip rate fell; earnings per trip stayed steady.'), 'Insights lead')
ok(/10 am–2 pm[\s\S]*7 trips · ₹1,050/.test(t) && /2–4 pm[\s\S]*2 trips · ₹300/.test(t), 'Time breakdown 7 trips ₹1,050 / 2 trips ₹300')
ok(t.includes('Andheri East · 2–4 pm') && t.includes('Demand was below the area’s usual level.'), 'Weak period explained')
ok(t.includes('doesn’t show that another area or time would have earned more'), 'Observed-pattern caveat')
ok(/Per online hr\s*₹225\s*−25%\s*₹300/.test(t), 'Table: ₹225 vs ₹300')
await page.getByRole('radio', { name: 'Similar drivers' }).click()
t = await text()
ok(t.includes('Average of 48 drivers') && /Per online hr\s*₹225[\s\S]*₹275/.test(t), 'Similar drivers: ₹275/hr')
ok(/11 offers[\s\S]*About 14 for similar drivers/.test(t), 'Fri offers vs similar drivers')
ok(
  (await page.getByRole('button', { name: /Cancellation rate and rating/ }).getAttribute('aria-expanded')) === 'false' &&
    t.includes('Rating slightly lower · cancellations usual'),
  'Fri: factors collapsed to one line when nothing is flagged',
)
await page.screenshot({ path: `${SHOTS}/flow-insights-drivers.png`, fullPage: true })

// Insights → Plan
await page.getByRole('button', { name: 'Plan my next shift' }).click()
t = await text()
ok(t.includes('Andheri East · 6–8 pm') && t.includes('Usually busier during weekday evenings.'), 'Plan: Andheri East · 6–8 pm, weekday evenings')

// Suggested route from start point to end point
ok(/About ₹333\s*\/ online hr/.test(t) && /\+5%\s*vs ₹316\/hr staying in Andheri East/.test(t), 'Route: about ₹333/online hr, +5% vs staying put')
ok(/4–6 pm\s*BKC\s*~₹322\/hr/.test(t) && /6–8 pm\s*BKC\s*~₹397\/hr/.test(t) && /8–9 pm\s*Andheri East\s*~₹230\/hr/.test(t), 'Route legs reconcile (₹322×2 + ₹397×2 + ₹230×1 ≈ ₹333×5)')
await page.getByLabel('End at').selectOption('lower-parel')
t = await text()
ok(/8–9 pm\s*Lower Parel/.test(t) && t.includes('Finish near Lower Parel'), 'Changing end point changes the route')
await page.getByLabel('End at').selectOption('andheri-east')

// Two-hour slot selector
await page.getByRole('radio', { name: '6–8 pm' }).click()
t = await text()
ok(t.includes('Typical weekday ride requests for 6–8 pm, quietest to busiest') && /BKC · 6–8 pm\s*Your route/.test(t), 'Slot selector re-ranks areas and marks the route area')
const firstCard = await page.locator('.area-card__title').first().innerText()
ok(firstCard.startsWith('Andheri East'), `Busiest area for 6–8 pm listed first (${firstCard})`)
ok(/BKC · 6–8 pm[\s\S]*Est\. ~₹397\/online hr/.test(t) && /Andheri East · 6–8 pm[\s\S]*Est\. ~₹344\/online hr/.test(t), 'Slot cards show the estimate that explains the route choice')
await page.getByRole('radio', { name: 'All hours' }).click()

// Trip requests flagged against the route
await page.getByRole('button', { name: 'Preview trip requests on this route' }).click()
t = await text()
ok(t.includes('Trip requests') && t.includes('Takes you to BKC, your 4–6 pm area.'), 'Requests screen opens on the first request, on route')
const tags = await page.locator('.req-row .tag').allInnerTexts()
ok(JSON.stringify(tags) === JSON.stringify(['On your route', 'On your route', 'Off your route', 'Near your route', 'On your route', 'Past your finish']), `Each request is flagged (${tags.join(', ')})`)
await page.getByRole('button', { name: /8:45 pm/ }).click()
ok((await text()).includes('about 22 min after your planned finish'), 'A request that ends after the planned finish is called out')
await page.getByRole('button', { name: 'Accept' }).click()
ok((await page.getByRole('status').innerText()).includes('Accepted ₹214 trip (sample)'), 'Accept confirms and moves on')
await page.screenshot({ path: `${SHOTS}/flow-requests.png`, fullPage: true })
await page.getByRole('button', { name: 'Back to Plan' }).click()
await page.getByLabel('Start', { exact: true }).selectOption('10:00')
await page.getByLabel('Finish', { exact: true }).selectOption('14:00')
t = await text()
ok(!t.includes('Andheri East · 6–8 pm') && t.includes('Andheri East · 10 am–12 pm'), 'Changing time updates patterns')
await page.getByLabel('Start', { exact: true }).selectOption('16:00')
await page.getByLabel('Finish', { exact: true }).selectOption('21:00')
await page.getByRole('switch', { name: 'Add a break' }).click()
await page.getByLabel('Break starts').selectOption('18:00')
t = await text()
ok(t.includes('4 hr 30 min online'), 'Break is excluded from planned online time')
ok(!t.includes('Andheri East · 6–8 pm'), 'Patterns skip the break')

// Save → confirmation → persist → edit
await page.getByRole('button', { name: 'Save plan' }).click()
ok((await page.getByRole('status').innerText()).includes('Plan saved for Mon, 5 Oct'), 'Save confirmation')
t = await text()
ok(t.includes('Mon, 5 Oct · 4–9 pm') && t.includes('Break 6–6:30 pm'), 'Saved plan summary')
await page.reload()
await page.goto(`${URL}#/plan`)
ok((await text()).includes('Mon, 5 Oct · 4–9 pm'), 'Saved plan survives reload')
await page.getByRole('button', { name: 'Edit plan' }).click()
ok((await page.getByLabel('Break starts').inputValue()) === '18:00', 'Edit form is prefilled')
await page.getByLabel('Prefer to stay in').selectOption('powai')
await page.getByRole('button', { name: 'Save changes' }).click()
ok((await page.getByRole('status').innerText()).includes('Plan updated'), 'Edit confirmation')
ok((await text()).includes('Prefers Powai'), 'Edited plan saved')
await page.screenshot({ path: `${SHOTS}/flow-plan-saved.png`, fullPage: true })

// Validation
await page.getByRole('button', { name: 'Edit plan' }).click()
await page.getByLabel('Finish', { exact: true }).selectOption('16:00')
ok((await text()).includes('Finish at least 1 hour after you start.'), 'Invalid times are flagged')

await browser.close()
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
