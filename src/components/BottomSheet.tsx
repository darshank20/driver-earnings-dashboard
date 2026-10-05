import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

const FOCUSABLE = 'a[href], button:not([disabled]), select, input, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Modal bottom sheet (centred dialog on desktop).
 * Dismiss: close button, Escape, scrim tap, or drag the handle down.
 * Focus moves into the sheet, is trapped while open and returns to the trigger on close.
 */
export function BottomSheet({ title, onClose, children }: Props) {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  const [drag, setDrag] = useState(0)
  const dragStart = useRef<number | null>(null)

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement
    sheetRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      returnTo.current?.focus?.()
    }
  }, [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !sheetRef.current) return
    const items = [...sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="sheet-root" onKeyDown={onKeyDown}>
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        <div
          className="sheet__grab"
          aria-hidden="true"
          onPointerDown={(e) => {
            dragStart.current = e.clientY
            ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (dragStart.current !== null) setDrag(Math.max(0, e.clientY - dragStart.current))
          }}
          onPointerUp={() => {
            if (drag > 80) onClose()
            dragStart.current = null
            setDrag(0)
          }}
        >
          <span />
        </div>
        <div className="sheet__head">
          <h2 className="sheet__title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close" data-autofocus>
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  )
}
