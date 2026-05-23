// 배포 시 Koyeb 백엔드 URL로 변경
// 로컬 개발 시에는 Vite proxy가 /api를 localhost:8080으로 보내줌
const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// === 응답 캐시 (DB 트래픽 절약 + 서버 장애 시 stale fallback) ===
const CACHE_PREFIX = 'pm_apicache_'
const MIN = 60_000

function cacheRead(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function cacheWrite(key, data, ttlMs) {
  const entry = { data, expiresAt: Date.now() + ttlMs, savedAt: Date.now() }
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      cacheEvictHalf()
      try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry)) } catch { /* give up */ }
    }
  }
}

function cacheEvictHalf() {
  const keys = []
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith(CACHE_PREFIX)) continue
    let savedAt = 0
    try { savedAt = JSON.parse(localStorage.getItem(k))?.savedAt || 0 } catch { /* keep 0 */ }
    keys.push({ k, savedAt })
  }
  keys.sort((a, b) => a.savedAt - b.savedAt)
  for (let i = 0; i < Math.ceil(keys.length / 2); i++) localStorage.removeItem(keys[i].k)
}

function invalidateCache(...prefixes) {
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(CACHE_PREFIX)) continue
    const sub = key.slice(CACHE_PREFIX.length)
    if (prefixes.some(p => sub.startsWith(p))) localStorage.removeItem(key)
  }
}

async function cachedGet(path, ttlMs) {
  const cached = cacheRead(path)
  if (cached && Date.now() < cached.expiresAt) return cached.data
  try {
    const data = await request(path)
    cacheWrite(path, data, ttlMs)
    return data
  } catch (e) {
    if (cached) {
      console.warn(`[api] stale cache fallback for ${path}:`, e.message)
      return cached.data
    }
    throw e
  }
}

// 변경 후 결과를 그대로 반환하면서 관련 캐시를 비움
function mutate(promise, ...prefixes) {
  return promise.then(r => { invalidateCache(...prefixes); return r })
}

export function clearApiCache() { invalidateCache('') }

/** 기록 목록 조회 */
export function getEntries(user, year, month) {
  const params = new URLSearchParams({ user });
  if (year && month) {
    params.set('year', year);
    params.set('month', month);
  }
  return cachedGet(`/api/entries?${params}`, 3 * MIN)
}

/** 기록 추가 */
export function createEntry(entry) {
  return mutate(request('/api/entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  }), '/api/entries', '/api/stats')
}

/** 기록 수정 */
export function updateEntry(id, entry) {
  return mutate(request(`/api/entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entry),
  }), '/api/entries', '/api/stats')
}

/** 기록 삭제 */
export function deleteEntry(id) {
  return mutate(request(`/api/entries/${id}`, { method: 'DELETE' }),
    '/api/entries', '/api/stats')
}

/** 월별 통계 */
export function getStats(user, year, month) {
  const params = new URLSearchParams({ user, year, month });
  return cachedGet(`/api/stats?${params}`, 3 * MIN)
}

/** 서버 상태 확인 */
export function healthCheck() {
  return request('/api/health');
}

// === 통장 API ===

/** 통장 기록 목록 조회 */
export function getBankEntries(user, year, month) {
  const params = new URLSearchParams({ user });
  if (year && month) {
    params.set('year', year);
    params.set('month', month);
  }
  return cachedGet(`/api/bank/entries?${params}`, 3 * MIN)
}

/** 통장 기록 추가 */
export function createBankEntry(entry) {
  return mutate(request('/api/bank/entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  }), '/api/bank/')
}

/** 통장 기록 수정 */
export function updateBankEntry(id, entry) {
  return mutate(request(`/api/bank/entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entry),
  }), '/api/bank/')
}

/** 통장 기록 삭제 */
export function deleteBankEntry(id) {
  return mutate(request(`/api/bank/entries/${id}`, { method: 'DELETE' }),
    '/api/bank/')
}

/** 통장 월별 통계 */
export function getBankStats(user, year, month) {
  const params = new URLSearchParams({ user, year, month });
  return cachedGet(`/api/bank/stats?${params}`, 3 * MIN)
}

// === 삭제 내역 API ===

/** 삭제된 내돈 기록 조회 */
export function getDeletedEntries(user) {
  return cachedGet(`/api/entries/deleted?user=${encodeURIComponent(user)}`, 5 * MIN)
}

/** 삭제된 통장 기록 조회 */
export function getDeletedBankEntries(user) {
  return cachedGet(`/api/bank/entries/deleted?user=${encodeURIComponent(user)}`, 5 * MIN)
}

// === 공부 기록 API ===

/** 요일별 스케줄 조회 (7개) */
export function getStudySchedule(user) {
  return cachedGet(`/api/study/schedule?user=${encodeURIComponent(user)}`, 10 * MIN)
}

/** 특정 요일 스케줄 저장 */
export function updateStudySchedule(user, day, subjects) {
  const params = new URLSearchParams({ user, day });
  return mutate(request(`/api/study/schedule?${params}`, {
    method: 'PUT',
    body: JSON.stringify({ subjects }),
  }), '/api/study/')
}

/** 특정 날짜의 과목 + 체크 상태 */
export function getStudyDay(user, date) {
  const params = new URLSearchParams({ user, date });
  return cachedGet(`/api/study/day?${params}`, 1 * MIN)
}

/** 체크 (또는 시간 업데이트) */
export function checkStudy(user, date, subject, durationMinutes) {
  return mutate(request('/api/study/check', {
    method: 'POST',
    body: JSON.stringify({ user, date, subject, durationMinutes }),
  }), '/api/study/day', '/api/study/history', '/api/study/streak')
}

/** 체크 해제 */
export function uncheckStudy(user, date, subject) {
  const params = new URLSearchParams({ user, date, subject });
  return mutate(request(`/api/study/check?${params}`, { method: 'DELETE' }),
    '/api/study/day', '/api/study/history', '/api/study/streak')
}

/** 기간 히스토리 */
export function getStudyHistory(user, from, to) {
  const params = new URLSearchParams({ user, from, to });
  return cachedGet(`/api/study/history?${params}`, 3 * MIN)
}

/** 읽은 책 목록 */
export function getReadBooks(user) {
  return cachedGet(`/api/study/books?user=${encodeURIComponent(user)}`, 3 * MIN)
}

/** 책 추가 */
export function addReadBook(book) {
  return mutate(request('/api/study/books', {
    method: 'POST',
    body: JSON.stringify(book),
  }), '/api/study/books')
}

/** 책 삭제 */
export function deleteReadBook(id) {
  return mutate(request(`/api/study/books/${id}`, { method: 'DELETE' }),
    '/api/study/books')
}

// === 할 일 API ===

export function getTodos() { return cachedGet('/api/todos', 1 * MIN) }
export function createTodo(todo) {
  return mutate(request('/api/todos', { method: 'POST', body: JSON.stringify(todo) }), '/api/todos')
}
export function updateTodo(id, data) {
  return mutate(request(`/api/todos/${id}`, { method: 'PUT', body: JSON.stringify(data) }), '/api/todos')
}
export function deleteTodo(id) {
  return mutate(request(`/api/todos/${id}`, { method: 'DELETE' }), '/api/todos')
}

// === 메모 API ===

export function getMemos() { return cachedGet('/api/memos', 2 * MIN) }
export function createMemo(memo) {
  return mutate(request('/api/memos', { method: 'POST', body: JSON.stringify(memo) }), '/api/memos')
}
export function updateMemo(id, data) {
  return mutate(request(`/api/memos/${id}`, { method: 'PUT', body: JSON.stringify(data) }), '/api/memos')
}
export function deleteMemo(id) {
  return mutate(request(`/api/memos/${id}`, { method: 'DELETE' }), '/api/memos')
}

// === 성장 기록 API ===

export function getGrowthRecords(user) {
  return cachedGet(`/api/growth?user=${encodeURIComponent(user)}`, 5 * MIN)
}
export function upsertGrowthRecord(record) {
  return mutate(request('/api/growth', { method: 'POST', body: JSON.stringify(record) }), '/api/growth')
}
export function deleteGrowthRecord(id) {
  return mutate(request(`/api/growth/${id}`, { method: 'DELETE' }), '/api/growth')
}

// === 공부 타이머 API ===

export function getTimerRecords(date, from, to) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return cachedGet(`/api/timer/records?${params}`, 1 * MIN)
}
export function addTimerRecord(record) {
  return mutate(request('/api/timer/records', { method: 'POST', body: JSON.stringify(record) }), '/api/timer/')
}
export function deleteTimerRecord(id) {
  return mutate(request(`/api/timer/records/${id}`, { method: 'DELETE' }), '/api/timer/')
}

// === 프로필 사진 API ===
// 사진은 base64라 페이로드가 가장 큼 → TTL 24시간

export function getProfilePhotos() { return cachedGet('/api/profile/photos', 24 * 60 * MIN) }
export function saveProfilePhoto(userName, photoData) {
  return mutate(request('/api/profile/photo', { method: 'PUT', body: JSON.stringify({ userName, photoData }) }),
    '/api/profile/')
}

// === 저축 목표 API ===

export function getSavingsGoals(user) {
  return cachedGet(`/api/savings-goals?user=${encodeURIComponent(user)}`, 3 * MIN)
}
export function createSavingsGoal(goal) {
  return mutate(request('/api/savings-goals', { method: 'POST', body: JSON.stringify(goal) }), '/api/savings-goals')
}
export function updateSavingsGoal(id, goal) {
  return mutate(request(`/api/savings-goals/${id}`, { method: 'PUT', body: JSON.stringify(goal) }), '/api/savings-goals')
}
export function addSavingsAmount(id, delta) {
  return mutate(request(`/api/savings-goals/${id}/add`, { method: 'POST', body: JSON.stringify({ delta }) }), '/api/savings-goals')
}
export function deleteSavingsGoal(id) {
  return mutate(request(`/api/savings-goals/${id}`, { method: 'DELETE' }), '/api/savings-goals')
}

// === 공부 연속일 API ===

export function getStudyStreak(user) {
  return cachedGet(`/api/study/streak?user=${encodeURIComponent(user)}`, 5 * MIN)
}

// === 월별 퀴즈 리더보드 API ===

export function submitQuizScore(data) {
  return mutate(request('/api/quiz-scores', { method: 'POST', body: JSON.stringify(data) }), '/api/quiz-scores')
}

export function getQuizLeaderboard(month) {
  return cachedGet(`/api/quiz-scores/leaderboard?month=${encodeURIComponent(month)}`, 10 * MIN)
}

// === 여행 API ===

export function getTripsApi() { return cachedGet('/api/trips', 5 * MIN) }
export function getTripApi(id) { return cachedGet(`/api/trips/${id}`, 3 * MIN) }
export function createTripApi(trip) {
  return mutate(request('/api/trips', { method: 'POST', body: JSON.stringify(trip) }), '/api/trips')
}
export function updateTripApi(id, trip) {
  return mutate(request(`/api/trips/${id}`, { method: 'PUT', body: JSON.stringify(trip) }), '/api/trips')
}
export function deleteTripApi(id) {
  return mutate(request(`/api/trips/${id}`, { method: 'DELETE' }), '/api/trips')
}

// === 도장 API (킥복싱·주짓수) ===

// 출석
export function getDojoAttendance(user) {
  return cachedGet(`/api/dojo/attendance?user=${encodeURIComponent(user)}`, 3 * MIN)
}
export function addDojoAttendance(user, date) {
  return mutate(request('/api/dojo/attendance', { method: 'POST', body: JSON.stringify({ user, date }) }),
    '/api/dojo/attendance')
}
export function removeDojoAttendance(user, date) {
  return mutate(request(`/api/dojo/attendance?user=${encodeURIComponent(user)}&date=${date}`, { method: 'DELETE' }),
    '/api/dojo/attendance')
}

// 기술 체크
export function getDojoSkills(user) {
  return cachedGet(`/api/dojo/skills?user=${encodeURIComponent(user)}`, 5 * MIN)
}
export function addDojoSkill(user, skillId) {
  return mutate(request('/api/dojo/skills', { method: 'POST', body: JSON.stringify({ user, skillId }) }),
    '/api/dojo/skills')
}
export function removeDojoSkill(user, skillId) {
  return mutate(request(`/api/dojo/skills?user=${encodeURIComponent(user)}&skillId=${encodeURIComponent(skillId)}`, { method: 'DELETE' }),
    '/api/dojo/skills')
}

// 일지
export function getDojoJournal(user) {
  const q = user ? `?user=${encodeURIComponent(user)}` : ''
  return cachedGet(`/api/dojo/journal${q}`, 3 * MIN)
}
export function addDojoJournal(user, date, text) {
  return mutate(request('/api/dojo/journal', { method: 'POST', body: JSON.stringify({ user, date, text }) }),
    '/api/dojo/journal')
}
export function deleteDojoJournal(id) {
  return mutate(request(`/api/dojo/journal/${id}`, { method: 'DELETE' }), '/api/dojo/journal')
}
