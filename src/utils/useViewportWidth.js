import { useState, useEffect } from 'react'

/** 창 너비 실시간 추적 훅. 리사이즈 시 자동 업데이트. */
export function useViewportWidth() {
  const [w, setW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 480
  )
  useEffect(() => {
    const onResize = () => setW(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return w
}
