import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const NAMES_CACHE_KEY = 'family-names-cache'
const BASE_URL = import.meta.env.VITE_API_URL || ''

async function fetchNames(timeoutMs) {
  const ctrl = new AbortController()
  const timer = timeoutMs ? setTimeout(() => ctrl.abort(), timeoutMs) : null
  try {
    const res = await fetch(`${BASE_URL}/api/family/names`, { signal: ctrl.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function hydrateNames() {
  const cached = localStorage.getItem(NAMES_CACHE_KEY)
  if (cached) {
    // 캐시 있으면 즉시 렌더 + 백그라운드에서 최신화 (변경은 다음 방문 시 반영)
    fetchNames().then(fresh => {
      if (fresh) localStorage.setItem(NAMES_CACHE_KEY, JSON.stringify(fresh))
    })
    return
  }
  // 최초 방문: 최대 5초 대기하여 서버 이름 시도 (Render 콜드스타트는 fallback 활용)
  const fresh = await fetchNames(5000)
  if (fresh) localStorage.setItem(NAMES_CACHE_KEY, JSON.stringify(fresh))
}

hydrateNames().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
