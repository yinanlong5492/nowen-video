import { useState, useLayoutEffect, useRef } from 'react'

export function useDropdownPosition(activeId: string | null) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (activeId && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      })
    }
  }, [activeId])

  return { buttonRef, position }
}
