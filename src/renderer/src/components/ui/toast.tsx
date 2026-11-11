import * as React from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
  action?: ToastAction
}

type ShowToast = (message: string, variant?: ToastVariant, action?: ToastAction) => void

const ToastContext = React.createContext<ShowToast>(() => {})

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info } as const
const STYLES: Record<ToastVariant, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  info: 'text-indigo-600 dark:text-indigo-400'
}
const MAX_VISIBLE = 4

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const nextId = React.useRef(0)
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = React.useCallback((id: number) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts(list => list.filter(t => t.id !== id))
  }, [])

  const show = React.useCallback<ShowToast>((message, variant = 'success', action) => {
    const id = ++nextId.current
    setToasts(list => [...list, { id, message, variant, action }].slice(-MAX_VISIBLE))
    // Give people time to reach an Undo button.
    timers.current.set(id, setTimeout(() => dismiss(id), action || variant === 'error' ? 6000 : 3500))
  }, [dismiss])

  React.useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
        {toasts.map(({ id, message, variant, action }) => {
          const Icon = ICONS[variant]
          return (
            <div
              key={id}
              role={variant === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs text-text shadow-xl animate-slide-up"
            >
              <Icon className={cn('mt-px h-4 w-4 shrink-0', STYLES[variant])} />
              <span className="flex-1 leading-relaxed">{message}</span>
              {action && (
                <button
                  type="button"
                  onClick={() => {
                    action.onClick()
                    dismiss(id)
                  }}
                  className="-my-0.5 rounded-md px-2 py-0.5 font-semibold text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400"
                >
                  {action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label="Dismiss notification"
                className="rounded p-0.5 text-muted hover:bg-elevated hover:text-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ShowToast {
  return React.useContext(ToastContext)
}
