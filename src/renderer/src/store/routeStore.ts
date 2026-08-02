import { create } from 'zustand'
import type { RouteId } from '../data/navigation'

/**
 * The app is a single window with a side nav, so a full router would be
 * overkill — one piece of state names the visible page.
 */
interface RouteState {
  route: RouteId
  navigate(route: RouteId): void
}

export const useRouteStore = create<RouteState>((set) => ({
  route: 'picker',
  navigate: (route) => set({ route })
}))
