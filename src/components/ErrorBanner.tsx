interface ErrorBannerProps {
  message: string
  variant?: 'error' | 'warning'
  onDismiss?: () => void
}

const VARIANT_CLASSES = {
  error: 'bg-red-900/30 border-red-800 text-red-300',
  warning: 'bg-yellow-900/40 border-yellow-700 text-yellow-300',
}

export function ErrorBanner({ message, variant = 'error', onDismiss }: ErrorBannerProps) {
  return (
    <div className={`border rounded px-3 py-2 flex items-center justify-between ${VARIANT_CLASSES[variant]}`}>
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="ml-2 text-current opacity-70 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  )
}
