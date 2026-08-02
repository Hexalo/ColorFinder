import { useToastStore } from '../../store/toastStore'
import './Toaster.css'

/** Bottom-centre transient messages. Mounted once, next to the page outlet. */
export function Toaster(): React.JSX.Element {
  const toasts = useToastStore((state) => state.toasts)

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          {toast.text}
        </div>
      ))}
    </div>
  )
}
