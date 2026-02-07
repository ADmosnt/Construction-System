import { useState, useEffect, useCallback } from 'react'

interface ToastMessage {
  id: number
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message?: string
}

let toastId = 0
const listeners: ((toast: ToastMessage) => void)[] = []

export function showToast(
  title: string,
  type: ToastMessage['type'] = 'info',
  message?: string
) {
  const toast: ToastMessage = { id: ++toastId, type, title, message }
  listeners.forEach((fn) => fn(toast))
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const handleToast = useCallback((toast: ToastMessage) => {
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, 10000)
  }, [])

  useEffect(() => {
    listeners.push(handleToast)
    return () => {
      const idx = listeners.indexOf(handleToast)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [handleToast])

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const getStyles = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-400 text-green-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-400 text-yellow-800'
      case 'error':
        return 'bg-red-50 border-red-400 text-red-800'
      case 'info':
        return 'bg-blue-50 border-blue-400 text-blue-800'
    }
  }

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return '\u2705'
      case 'warning':
        return '\u26A0\uFE0F'
      case 'error':
        return '\uD83D\uDEA8'
      case 'info':
        return '\u2139\uFE0F'
    }
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`border-l-4 rounded-lg shadow-lg p-4 animate-slide-in ${getStyles(toast.type)}`}
          style={{
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">{getIcon(toast.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{toast.title}</p>
              {toast.message && <p className="text-xs mt-1 opacity-80">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-500 hover:text-gray-800 flex-shrink-0 ml-2 p-1 rounded hover:bg-black/10 transition-colors text-base leading-none font-bold"
              title="Cerrar notificacion"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
