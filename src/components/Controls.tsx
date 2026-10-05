import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'

/* ---------- Segmented control (radiogroup with arrow-key support) ---------- */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  compact,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  compact?: boolean
}) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = options[(i + dir + options.length) % options.length]
    onChange(next.value)
    const group = (e.currentTarget as HTMLElement).parentElement
    requestAnimationFrame(() => group?.querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus())
  }
  return (
    <div role="radiogroup" aria-label={label} className={`segmented${compact ? ' segmented--compact' : ''}`}>
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          data-value={o.value}
          className="segmented__opt"
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Small info button that opens a definition sheet ---------- */
export function InfoButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="icon-btn icon-btn--sm" aria-label={label} onClick={onClick}>
      <Icon name="info" size={18} />
    </button>
  )
}

/* ---------- Select field ---------- */
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  error,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; disabled?: boolean }[]
  error?: string
  hint?: string
}) {
  const describedBy = [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={18} />
      </div>
      {hint && (
        <span id={`${id}-hint`} className="caption">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-err`} className="field__error">
          {error}
        </span>
      )}
    </div>
  )
}

/* ---------- Toggle switch ---------- */
export function Switch({ checked, onChange, labelledBy }: { checked: boolean; onChange: (v: boolean) => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  )
}

/* ---------- Toast (polite live region) ---------- */
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 3200)
    return () => window.clearTimeout(t)
  }, [message, onDone])
  return (
    <div className="toast" role="status">
      <Icon name="check" size={20} />
      {message}
    </div>
  )
}

/* ---------- Empty state ---------- */
export function EmptyState({
  icon,
  title,
  body,
  action,
  inline,
}: {
  icon?: 'clock' | 'history' | 'insights' | 'earnings'
  title: string
  body: string
  action?: ReactNode
  inline?: boolean
}) {
  return (
    <div className={`empty${inline ? ' empty--inline' : ''}`}>
      {!inline && icon && (
        <span className="empty__icon">
          <Icon name={icon} />
        </span>
      )}
      <p className="empty__title">{title}</p>
      <p className="empty__body">{body}</p>
      {action}
    </div>
  )
}
