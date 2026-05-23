// 🏃 셔틀런 (PAPS 왕복오래달리기 15m) 데이터 + 저장소
// 학교에서 받은 정확한 등급표가 있으면 GRADE_TABLE의 해당 항목을 그대로 교체하세요.

// === 측정 단계별 신호음 간격 ===
// 초등 15m 기준. PAPS 공식 음원의 정확한 초/회 표는 외부 공개 자료가 부족해서,
// 1단계=9.0초, 단계당 약 1분 유지, 0.5초씩 단축되는 표준 다단계 셔틀런(MSFT) 패턴으로 근사.
// 학교 공식 음원을 받으면 LEVELS 배열만 교체하면 됨.
export const LEVELS = [
  { level: 1,  sec: 9.0 },
  { level: 2,  sec: 8.0 },
  { level: 3,  sec: 7.5 },
  { level: 4,  sec: 7.2 },
  { level: 5,  sec: 6.9 },
  { level: 6,  sec: 6.6 },
  { level: 7,  sec: 6.3 },
  { level: 8,  sec: 6.0 },
  { level: 9,  sec: 5.8 },
  { level: 10, sec: 5.6 },
  { level: 11, sec: 5.4 },
  { level: 12, sec: 5.2 },
  { level: 13, sec: 5.0 },
  { level: 14, sec: 4.8 },
  { level: 15, sec: 4.6 },
  { level: 16, sec: 4.4 },
  { level: 17, sec: 4.2 },
  { level: 18, sec: 4.0 },
]

const LEVEL_DURATION_SEC = 60 // 각 단계 약 1분 유지

/** 누적 회수가 N일 때 현재 단계 번호 (1부터) 반환 */
export function levelForLap(lap) {
  if (lap <= 0) return 1
  let cum = 0
  for (const { level, sec } of LEVELS) {
    const lapsInLevel = Math.max(1, Math.floor(LEVEL_DURATION_SEC / sec))
    cum += lapsInLevel
    if (lap <= cum) return level
  }
  return LEVELS[LEVELS.length - 1].level
}

/**
 * 전체 비프 타임라인을 미리 계산. 각 원소:
 *   { lap, level, timeMs, isLevelStart }
 * lap=1이 첫 비프 (출발 후 첫 도착 신호).
 */
export function buildBeepTimeline(maxLevels = LEVELS.length) {
  const beeps = []
  let cumMs = 0
  let lap = 0
  for (let i = 0; i < Math.min(maxLevels, LEVELS.length); i++) {
    const { level, sec } = LEVELS[i]
    const lapsInLevel = Math.max(1, Math.floor(LEVEL_DURATION_SEC / sec))
    for (let j = 0; j < lapsInLevel; j++) {
      lap += 1
      cumMs += sec * 1000
      beeps.push({ lap, level, timeMs: cumMs, isLevelStart: j === 0 })
    }
  }
  return beeps
}

// === PAPS 등급표 (초등 15m) ===
// 형식: { min: 최소회수 } 또는 { max: 최대회수 } — 범위가 한쪽이면 그 한쪽만 명시.
//
// 초5 남/여: 공개된 표 기반 (확인됨)
// 초6 남: "104회 이상 1등급" 정보 기반 (1등급 경계만 확인, 나머지는 초5 패턴 + 8% 적용 추정)
// 초3·4 + 초6 여: 공개 표 부족 → 초5 기준에서 학년별로 비례 축소·확대한 추정값 (사용자가 학교 통지표로 교정 가능)
//
// estimated: true 면 UI에서 "참고용" 배지 표시
export const GRADE_TABLE = {
  E3: {
    estimated: true,
    male: [
      { grade: 1, min: 60, label: '아주 높음' },
      { grade: 2, min: 44, max: 59, label: '높음' },
      { grade: 3, min: 30, max: 43, label: '보통' },
      { grade: 4, min: 17, max: 29, label: '낮음' },
      { grade: 5, max: 16, label: '아주 낮음' },
    ],
    female: [
      { grade: 1, min: 51, label: '아주 높음' },
      { grade: 2, min: 38, max: 50, label: '높음' },
      { grade: 3, min: 27, max: 37, label: '보통' },
      { grade: 4, min: 14, max: 26, label: '낮음' },
      { grade: 5, max: 13, label: '아주 낮음' },
    ],
  },
  E4: {
    estimated: true,
    male: [
      { grade: 1, min: 80, label: '아주 높음' },
      { grade: 2, min: 58, max: 79, label: '높음' },
      { grade: 3, min: 40, max: 57, label: '보통' },
      { grade: 4, min: 23, max: 39, label: '낮음' },
      { grade: 5, max: 22, label: '아주 낮음' },
    ],
    female: [
      { grade: 1, min: 68, label: '아주 높음' },
      { grade: 2, min: 50, max: 67, label: '높음' },
      { grade: 3, min: 36, max: 49, label: '보통' },
      { grade: 4, min: 18, max: 35, label: '낮음' },
      { grade: 5, max: 17, label: '아주 낮음' },
    ],
  },
  E5: {
    estimated: false,
    male: [
      { grade: 1, min: 100, label: '아주 높음' },
      { grade: 2, min: 73,  max: 99, label: '높음' },
      { grade: 3, min: 50,  max: 72, label: '보통' },
      { grade: 4, min: 29,  max: 49, label: '낮음' },
      { grade: 5, max: 28, label: '아주 낮음' },
    ],
    female: [
      { grade: 1, min: 85, label: '아주 높음' },
      { grade: 2, min: 63, max: 84, label: '높음' },
      { grade: 3, min: 45, max: 62, label: '보통' },
      { grade: 4, min: 23, max: 44, label: '낮음' },
      { grade: 5, max: 22, label: '아주 낮음' },
    ],
  },
  E6: {
    estimated: true, // 1등급 경계만 확인됨 (104회)
    male: [
      { grade: 1, min: 104, label: '아주 높음' },
      { grade: 2, min: 76,  max: 103, label: '높음' },
      { grade: 3, min: 52,  max: 75, label: '보통' },
      { grade: 4, min: 30,  max: 51, label: '낮음' },
      { grade: 5, max: 29, label: '아주 낮음' },
    ],
    female: [
      { grade: 1, min: 88, label: '아주 높음' },
      { grade: 2, min: 66, max: 87, label: '높음' },
      { grade: 3, min: 47, max: 65, label: '보통' },
      { grade: 4, min: 24, max: 46, label: '낮음' },
      { grade: 5, max: 23, label: '아주 낮음' },
    ],
  },
}

export const GRADE_OPTIONS = [
  { key: 'E3', label: '초등 3학년' },
  { key: 'E4', label: '초등 4학년' },
  { key: 'E5', label: '초등 5학년' },
  { key: 'E6', label: '초등 6학년' },
]

/** 회수 → 등급 객체 반환 (없으면 null) */
export function lookupGrade(gradeKey, gender, laps) {
  const set = GRADE_TABLE[gradeKey]?.[gender]
  if (!set) return null
  for (const row of set) {
    const okMin = row.min == null || laps >= row.min
    const okMax = row.max == null || laps <= row.max
    if (okMin && okMax) return row
  }
  return null
}

// === localStorage ===
const STORAGE_KEY = 'pm_shuttle_runs'

export function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveRecords(records) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)) } catch { /* quota */ }
}

export function addRecord(record) {
  const all = loadRecords()
  const next = [...all, { ...record, id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }]
  saveRecords(next)
  return next
}

export function deleteRecord(id) {
  const next = loadRecords().filter(r => r.id !== id)
  saveRecords(next)
  return next
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
