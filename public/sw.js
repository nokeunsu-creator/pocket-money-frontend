/* 서비스 워커 - 웹 푸시 알림 수신/클릭 처리 */

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = { title: '알림', body: '', url: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch (_) {
    if (event.data) data.body = event.data.text()
  }

  const options = {
    body: data.body,
    icon: '/sportage.png',
    badge: '/sportage.png',
    data: { url: data.url || '/' },
    vibrate: [150, 75, 150],
    tag: 'pocket-money-todo',
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        // 같은 origin의 탭이 있으면 포커스
        if ('focus' in client) {
          client.postMessage({ type: 'notification-click', url: targetUrl })
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})
