import { useCallback, useRef, useState } from 'react'
import { reshuffle } from '../services/harmony.service'
import type { HarmonyId } from '../types'

/**
 * Shared editing model for every screen that shows a strip of swatches:
 * harmonies, random palettes and image extraction. Owns the colours plus the
 * per-swatch lock that the shuffle button relies on.
 *
 * Colours and locks are always written together, so the two arrays can never
 * drift out of alignment when swatches are added, removed or replaced.
 */
export function usePaletteEditor(initial: string[]): {
  colors: string[]
  locked: boolean[]
  setColors: (next: string[]) => void
  setColorAt: (index: number, hex: string) => void
  removeAt: (index: number) => void
  moveColor: (from: number, to: number) => void
  toggleLock: (index: number) => void
  clearLocks: () => void
  shuffle: (harmony: HarmonyId, baseHex: string) => void
  /** Replaces unlocked swatches only — used when the harmony rule changes. */
  applyRespectingLocks: (next: string[]) => void
} {
  const [colors, setColorsState] = useState<string[]>(initial)
  const [locked, setLocked] = useState<boolean[]>(() => initial.map(() => false))

  // Mirrors, so the callbacks below stay referentially stable and never read
  // stale state when several updates land in the same tick.
  const colorsRef = useRef(colors)
  colorsRef.current = colors
  const lockedRef = useRef(locked)
  lockedRef.current = locked

  const commit = useCallback((nextColors: string[], nextLocked: boolean[]) => {
    colorsRef.current = nextColors
    lockedRef.current = nextLocked
    setColorsState(nextColors)
    setLocked(nextLocked)
  }, [])

  const setColors = useCallback(
    (next: string[]) => {
      // Locks follow position; anything past the new end is dropped with it.
      commit(
        next,
        next.map((_, index) => lockedRef.current[index] ?? false)
      )
    },
    [commit]
  )

  const setColorAt = useCallback(
    (index: number, hex: string) => {
      commit(
        colorsRef.current.map((item, i) => (i === index ? hex : item)),
        lockedRef.current
      )
    },
    [commit]
  )

  const removeAt = useCallback(
    (index: number) => {
      commit(
        colorsRef.current.filter((_, i) => i !== index),
        lockedRef.current.filter((_, i) => i !== index)
      )
    },
    [commit]
  )

  /** Reorders a swatch; its lock travels with it. */
  const moveColor = useCallback(
    (from: number, to: number) => {
      const colours = colorsRef.current
      if (from === to || from < 0 || to < 0 || from >= colours.length || to >= colours.length) {
        return
      }
      const reorder = <T>(items: T[]): T[] => {
        const next = [...items]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      }
      commit(reorder(colours), reorder(lockedRef.current))
    },
    [commit]
  )

  const toggleLock = useCallback((index: number) => {
    const next = colorsRef.current.map((_, i) =>
      i === index ? !lockedRef.current[i] : (lockedRef.current[i] ?? false)
    )
    lockedRef.current = next
    setLocked(next)
  }, [])

  const clearLocks = useCallback(() => {
    const next = colorsRef.current.map(() => false)
    lockedRef.current = next
    setLocked(next)
  }, [])

  const applyRespectingLocks = useCallback(
    (next: string[]) => {
      const current = colorsRef.current
      const locks = lockedRef.current

      // Locked swatches keep their colour where they are…
      const merged = next.map((hex, index) => (locks[index] ? (current[index] ?? hex) : hex))

      // …and locked swatches that sit past the end of a *shorter* palette are
      // carried over rather than silently dropped. Switching from a five-colour
      // harmony to a two-colour one must not throw away what you pinned.
      const carried = current
        .map((hex, index) => ({ hex, index }))
        .filter((entry) => entry.index >= next.length && locks[entry.index])

      commit(
        [...merged, ...carried.map((entry) => entry.hex)],
        [...next.map((_, index) => locks[index] ?? false), ...carried.map(() => true)]
      )
    },
    [commit]
  )

  const shuffle = useCallback(
    (harmony: HarmonyId, baseHex: string) => {
      commit(reshuffle(colorsRef.current, lockedRef.current, harmony, baseHex), lockedRef.current)
    },
    [commit]
  )

  return {
    colors,
    locked,
    setColors,
    setColorAt,
    removeAt,
    moveColor,
    toggleLock,
    clearLocks,
    shuffle,
    applyRespectingLocks
  }
}
