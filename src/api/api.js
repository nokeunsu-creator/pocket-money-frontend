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

/** 기록 목록 조회 */
export function getEntries(user, year, month) {
  const params = new URLSearchParams({ user });
  if (year && month) {
    params.set('year', year);
    params.set('month', month);
  }
  return request(`/api/entries?${params}`);
}

/** 기록 추가 */
export function createEntry(entry) {
  return request('/api/entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

/** 기록 수정 */
export function updateEntry(id, entry) {
  return request(`/api/entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entry),
  });
}

/** 기록 삭제 */
export function deleteEntry(id) {
  return request(`/api/entries/${id}`, { method: 'DELETE' });
}

/** 월별 통계 */
export function getStats(user, year, month) {
  const params = new URLSearchParams({ user, year, month });
  return request(`/api/stats?${params}`);
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
  return request(`/api/bank/entries?${params}`);
}

/** 통장 기록 추가 */
export function createBankEntry(entry) {
  return request('/api/bank/entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

/** 통장 기록 수정 */
export function updateBankEntry(id, entry) {
  return request(`/api/bank/entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entry),
  });
}

/** 통장 기록 삭제 */
export function deleteBankEntry(id) {
  return request(`/api/bank/entries/${id}`, { method: 'DELETE' });
}

/** 통장 월별 통계 */
export function getBankStats(user, year, month) {
  const params = new URLSearchParams({ user, year, month });
  return request(`/api/bank/stats?${params}`);
}

// === 삭제 내역 API ===

/** 삭제된 내돈 기록 조회 */
export function getDeletedEntries(user) {
  return request(`/api/entries/deleted?user=${encodeURIComponent(user)}`);
}

/** 삭제된 통장 기록 조회 */
export function getDeletedBankEntries(user) {
  return request(`/api/bank/entries/deleted?user=${encodeURIComponent(user)}`);
}

// === 공부 기록 API ===

/** 요일별 스케줄 조회 (7개) */
export function getStudySchedule(user) {
  return request(`/api/study/schedule?user=${encodeURIComponent(user)}`);
}

/** 특정 요일 스케줄 저장 */
export function updateStudySchedule(user, day, subjects) {
  const params = new URLSearchParams({ user, day });
  return request(`/api/study/schedule?${params}`, {
    method: 'PUT',
    body: JSON.stringify({ subjects }),
  });
}

/** 특정 날짜의 과목 + 체크 상태 */
export function getStudyDay(user, date) {
  const params = new URLSearchParams({ user, date });
  return request(`/api/study/day?${params}`);
}

/** 체크 (또는 시간 업데이트) */
export function checkStudy(user, date, subject, durationMinutes) {
  return request('/api/study/check', {
    method: 'POST',
    body: JSON.stringify({ user, date, subject, durationMinutes }),
  });
}

/** 체크 해제 */
export function uncheckStudy(user, date, subject) {
  const params = new URLSearchParams({ user, date, subject });
  return request(`/api/study/check?${params}`, { method: 'DELETE' });
}

/** 기간 히스토리 */
export function getStudyHistory(user, from, to) {
  const params = new URLSearchParams({ user, from, to });
  return request(`/api/study/history?${params}`);
}

/** 읽은 책 목록 */
export function getReadBooks(user) {
  return request(`/api/study/books?user=${encodeURIComponent(user)}`);
}

/** 책 추가 */
export function addReadBook(book) {
  return request('/api/study/books', {
    method: 'POST',
    body: JSON.stringify(book),
  });
}

/** 책 삭제 */
export function deleteReadBook(id) {
  return request(`/api/study/books/${id}`, { method: 'DELETE' });
}

// === 할 일 API ===

export function getTodos() { return request('/api/todos') }
export function createTodo(todo) { return request('/api/todos', { method: 'POST', body: JSON.stringify(todo) }) }
export function updateTodo(id, data) { return request(`/api/todos/${id}`, { method: 'PUT', body: JSON.stringify(data) }) }
export function deleteTodo(id) { return request(`/api/todos/${id}`, { method: 'DELETE' }) }

// === 메모 API ===

export function getMemos() { return request('/api/memos') }
export function createMemo(memo) { return request('/api/memos', { method: 'POST', body: JSON.stringify(memo) }) }
export function updateMemo(id, data) { return request(`/api/memos/${id}`, { method: 'PUT', body: JSON.stringify(data) }) }
export function deleteMemo(id) { return request(`/api/memos/${id}`, { method: 'DELETE' }) }

// === 성장 기록 API ===

export function getGrowthRecords(user) { return request(`/api/growth?user=${encodeURIComponent(user)}`) }
export function upsertGrowthRecord(record) { return request('/api/growth', { method: 'POST', body: JSON.stringify(record) }) }
export function deleteGrowthRecord(id) { return request(`/api/growth/${id}`, { method: 'DELETE' }) }

// === 공부 타이머 API ===

export function getTimerRecords(date, from, to) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return request(`/api/timer/records?${params}`)
}
export function addTimerRecord(record) { return request('/api/timer/records', { method: 'POST', body: JSON.stringify(record) }) }
export function deleteTimerRecord(id) { return request(`/api/timer/records/${id}`, { method: 'DELETE' }) }

// === 프로필 사진 API ===

export function getProfilePhotos() { return request('/api/profile/photos') }
export function saveProfilePhoto(userName, photoData) {
  return request('/api/profile/photo', { method: 'PUT', body: JSON.stringify({ userName, photoData }) })
}

// === 저축 목표 API ===

export function getSavingsGoals(user) {
  return request(`/api/savings-goals?user=${encodeURIComponent(user)}`)
}
export function createSavingsGoal(goal) {
  return request('/api/savings-goals', { method: 'POST', body: JSON.stringify(goal) })
}
export function updateSavingsGoal(id, goal) {
  return request(`/api/savings-goals/${id}`, { method: 'PUT', body: JSON.stringify(goal) })
}
export function addSavingsAmount(id, delta) {
  return request(`/api/savings-goals/${id}/add`, { method: 'POST', body: JSON.stringify({ delta }) })
}
export function deleteSavingsGoal(id) {
  return request(`/api/savings-goals/${id}`, { method: 'DELETE' })
}

// === 공부 연속일 API ===

export function getStudyStreak(user) {
  return request(`/api/study/streak?user=${encodeURIComponent(user)}`)
}

// === 여행 API ===

export function getTripsApi() { return request('/api/trips') }
export function getTripApi(id) { return request(`/api/trips/${id}`) }
export function createTripApi(trip) {
  return request('/api/trips', { method: 'POST', body: JSON.stringify(trip) })
}
export function updateTripApi(id, trip) {
  return request(`/api/trips/${id}`, { method: 'PUT', body: JSON.stringify(trip) })
}
export function deleteTripApi(id) {
  return request(`/api/trips/${id}`, { method: 'DELETE' })
}
