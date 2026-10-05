import { useCallback, useEffect, useState } from 'react'
import { Toast } from './components/Controls'
import { Icon, type IconName } from './components/Icon'
import { InfoSheet, type SheetId } from './components/InfoSheets'
import type { Plan } from './data/sample'
import { defaultDate, summaryForDate, type ComparisonMode } from './lib/earnings'
import { EarningsScreen } from './screens/EarningsScreen'
import { InsightsScreen } from './screens/InsightsScreen'
import { PlanScreen } from './screens/PlanScreen'
import { RequestsScreen } from './screens/RequestsScreen'

type Tab = 'earnings' | 'insights' | 'plan' | 'requests'
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'earnings', label: 'Earnings', icon: 'earnings' },
  { id: 'insights', label: 'Insights', icon: 'insights' },
  { id: 'plan', label: 'Plan', icon: 'plan' },
]

const tabFromHash = (): Tab => {
  const h = window.location.hash.replace('#/', '')
  return TABS.some((t) => t.id === h) || h === 'requests' ? (h as Tab) : 'earnings'
}

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash)
  const [date, setDate] = useState(defaultDate)
  const [mode, setMode] = useState<ComparisonMode>('self')
  const [sheet, setSheet] = useState<SheetId | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [previewPlan, setPreviewPlan] = useState<Plan | null>(null)

  // Hash routing so the browser/Android back button moves between destinations.
  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((t: Tab) => {
    if (tabFromHash() !== t) window.location.hash = `/${t}`
    setTab(t)
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.page-title')?.focus())
  }, [])

  const clearToast = useCallback(() => setToast(null), [])
  const titles: Record<Tab, string> = { earnings: 'Earnings', insights: 'Shift insights', plan: 'Plan', requests: 'Trip requests' }
  useEffect(() => {
    document.title = `${titles[tab]} · Driver earnings`
  })

  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <div className="nav__brand">Driver</div>
        <ul className="nav__list">
          {TABS.map((t) => (
            <li key={t.id}>
              <button type="button" className="nav__item" aria-current={tab === t.id || (tab === 'requests' && t.id === 'plan') ? 'page' : undefined} onClick={() => go(t.id)}>
                <Icon name={t.icon} />
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="main" id="main">
        {tab === 'earnings' && (
          <EarningsScreen date={date} onDate={setDate} onInfo={setSheet} onExplain={() => go('insights')} />
        )}
        {tab === 'insights' && (
          <InsightsScreen date={date} onDate={setDate} mode={mode} onMode={setMode} onInfo={setSheet} onPlan={() => go('plan')} />
        )}
        {tab === 'plan' && <PlanScreen onInfo={setSheet} onToast={setToast} onOpenRequests={(p) => {
              setPreviewPlan(p)
              go('requests')
            }} />}
        {tab === 'requests' && <RequestsScreen plan={previewPlan} onBack={() => go('plan')} onToast={setToast} />}
      </main>

      {sheet && <InfoSheet id={sheet} summary={summaryForDate(date)} onClose={() => setSheet(null)} />}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  )
}
