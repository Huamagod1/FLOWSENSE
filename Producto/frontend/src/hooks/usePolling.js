import { useEffect, useRef } from 'react'

export function usePolling(fn, intervalo, activo = true) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!activo) return
    const id = setInterval(() => fnRef.current(), intervalo)
    return () => clearInterval(id)
  }, [intervalo, activo])
}
