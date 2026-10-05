const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** ₹1,350 — Indian digit grouping, whole rupees. */
export const inr = (n: number) => `₹${inrFormatter.format(Math.round(n))}`

/** "6 hr", "5 hr 30 min", "45 min" */
export function duration(minutes: number): string {
  const m = Math.round(minutes)
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r} min`
  if (r === 0) return `${h} hr`
  return `${h} hr ${r} min`
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const fromMinutes = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

function parts(mins: number) {
  const h24 = Math.floor(mins / 60) % 24
  const m = mins % 60
  const suffix = h24 < 12 ? 'am' : 'pm'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return { h12, m, suffix }
}

/** "4 pm", "6:30 pm" */
export function clock(mins: number): string {
  const { h12, m, suffix } = parts(mins)
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${suffix}`
}

export const clockHHMM = (hhmm: string) => clock(toMinutes(hhmm))

/** "2–4 pm", "10 am–2 pm" — drops the first suffix when both share it. */
export function clockRange(startMins: number, endMins: number): string {
  const a = parts(startMins)
  const b = parts(endMins)
  const aText = `${a.h12}${a.m ? `:${String(a.m).padStart(2, '0')}` : ''}`
  return a.suffix === b.suffix ? `${aText}–${clock(endMins)}` : `${clock(startMins)}–${clock(endMins)}`
}

export const hourRange = (startHour: number, endHour: number) => clockRange(startHour * 60, endHour * 60)

const parseDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** "Fri, 2 Oct" */
export const dateLong = (iso: string) => {
  const d = parseDate(iso)
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}
/** "2 Oct" */
export const dateShort = (iso: string) => {
  const d = parseDate(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export const weekdayShort = (iso: string) => DAYS[parseDate(iso).getDay()]
export const weekdayLong = (iso: string) => DAYS_LONG[parseDate(iso).getDay()]
export const dayOfMonth = (iso: string) => parseDate(iso).getDate()
export const dayIndex = (iso: string) => parseDate(iso).getDay() // 0 = Sunday

export function addDays(iso: string, n: number): string {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const pct = (n: number) => `${Math.round(Math.abs(n))}%`
