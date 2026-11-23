import { useEffect, useRef } from 'react'

/** Opens a native modal on mount and returns focus to the opener when it unmounts. */
export function useModalDialog() {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = ref.current
    opener.current ??= document.activeElement as HTMLElement | null
    if (dialog && !dialog.open) dialog.showModal()
    return () => opener.current?.focus?.()
  }, [])

  return ref
}
