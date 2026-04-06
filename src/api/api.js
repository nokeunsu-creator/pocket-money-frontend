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
