// 가족 구성원 실명은 서버(/api/family/names)에서 가져와 localStorage 캐시에 저장됩니다.
// 캐시는 main.jsx의 hydrateNames()가 App 렌더 전에 채워줍니다.
// 소스 코드에는 절대 실명을 하드코딩하지 말 것.

const NAMES_CACHE_KEY = 'family-names-cache'

let cached = {}
try {
  const raw = localStorage.getItem(NAMES_CACHE_KEY)
  if (raw) cached = JSON.parse(raw) || {}
} catch (_) { /* ignore */ }

export const CHILD1 = cached.child1 || '첫째'
export const CHILD2 = cached.child2 || '둘째'
export const MOM = cached.mom || '엄마'
export const DAD = cached.dad || '아빠'
export const ME = cached.me || '나'
export const WIFE = cached.wife || '아내'

// 배열 형태로도 제공 (HUB 등에서 사용)
export const HUB_USERS = [CHILD1, CHILD2]
