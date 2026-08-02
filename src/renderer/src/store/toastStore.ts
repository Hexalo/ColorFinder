import { create } from 'zustand'
import type { ToastMessage } from '../types'

const DURATION = 2600

interface ToastState {
  toasts: ToastMessage[]
  push(text: string, tone?: ToastMessage['tone']): void
  dismiss(id: string): void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (text, tone = 'success') => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, text, tone }] }))
    window.setTimeout(() => get().dismiss(id), DURATION)
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
}))

/** Shorthand for services and event handlers outside React components. */
export const toast = {
  success: (text: string): void => useToastStore.getState().push(text, 'success'),
  info: (text: string): void => useToastStore.getState().push(text, 'info'),
  error: (text: string): void => useToastStore.getState().push(text, 'error')
}
