// 웹 푸시 알림 유틸 — Service Worker 등록, 구독 생성/해제, 서버와 동기화

const BASE_URL = import.meta.env.VITE_API_URL || ''

export function isPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

/** 현재 상태: 'unsupported' | 'denied' | 'default' | 'subscribed' | 'not-subscribed' */
export async function getPushStatus() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') return 'default'
  // permission === 'granted'
  try {
    const reg = await navigator.serviceWorker.getRegistration('/')
    if (!reg) return 'not-subscribed'
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'subscribed' : 'not-subscribed'
  } catch (_) {
    return 'not-subscribed'
  }
}

export async function subscribeToPush(userName) {
  if (!isPushSupported()) throw new Error('이 브라우저는 푸시 알림을 지원하지 않아요')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? '알림 권한이 거부되었어요. 브라우저 설정에서 허용해주세요.'
      : '알림 권한이 필요해요.')
  }

  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  const keyRes = await fetch(`${BASE_URL}/api/push/public-key`)
  if (!keyRes.ok) throw new Error('서버 VAPID 키를 가져올 수 없어요')
  const { publicKey } = await keyRes.json()

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  const subJson = sub.toJSON()
  const res = await fetch(`${BASE_URL}/api/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: userName || null,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    }),
  })
  if (!res.ok) throw new Error('서버 등록 실패')
  return true
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return false
  const reg = await navigator.serviceWorker.getRegistration('/')
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return false
  try {
    await fetch(`${BASE_URL}/api/push/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
  } catch (_) { /* 서버 해제 실패해도 브라우저는 해제 */ }
  await sub.unsubscribe()
  return true
}

/** 테스트용: 즉시 오늘 할일 알림 트리거 (dev 환경만 작동) */
export async function triggerTodoReminderNow() {
  const res = await fetch(`${BASE_URL}/api/push/trigger-todo-reminder`, { method: 'POST' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.message || '알림 전송 실패 (status ' + res.status + ')')
  }
  return body
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Str = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Str)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}
