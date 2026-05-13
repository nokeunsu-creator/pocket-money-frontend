const STORAGE_KEY = 'game-achievements'

export const ACHIEVEMENTS = [
  // Board games
  { id: 'omok_ai_win', icon: '⚫', title: '오목 AI 격파', desc: '오목 AI에게 승리', category: 'board' },
  { id: 'chess_ai_win', icon: '♟️', title: '체크메이트!', desc: '체스 AI에게 승리', category: 'board' },
  { id: 'janggi_lv1', icon: '將', title: '장기 입문', desc: '장기 Lv.1 클리어', category: 'board' },
  { id: 'janggi_lv5', icon: '將', title: '장기 중급', desc: '장기 Lv.5 클리어', category: 'board' },
  { id: 'janggi_lv10', icon: '🏆', title: '장기 달인', desc: '장기 Lv.10 클리어', category: 'board' },
  { id: 'baduk_ai_win', icon: '⚪', title: '바둑 첫 승', desc: '바둑 AI에게 승리', category: 'board' },
  { id: 'baduk_dan9', icon: '🏆', title: '바둑 9단', desc: '바둑 AI 9단 격파', category: 'board' },

  // Card games
  { id: 'onecard_win', icon: '🃏', title: '원카드 승리', desc: '원카드에서 승리', category: 'card' },
  { id: 'hula_win', icon: '♠️', title: '훌라!', desc: '훌라에서 승리', category: 'card' },

  // Brain games
  { id: 'baseball_solve', icon: '⚾', title: '숫자 탐정', desc: '숫자야구 정답 맞추기', category: 'brain' },
  { id: 'multiply_30', icon: '✖️', title: '구구단 마스터', desc: '구구단 30개 이상 정답', category: 'brain' },
  { id: 'math_30', icon: '🧮', title: '연산 달인', desc: '사칙연산 30개 이상 정답', category: 'brain' },
  { id: 'whack_mole_20', icon: '🐹', title: '두더지 사냥꾼', desc: '두더지 게임 20점 달성', category: 'brain' },
  { id: 'whack_mole_40', icon: '🏆', title: '두더지 왕', desc: '두더지 게임 40점 달성', category: 'brain' },

  // Learning
  { id: 'baduk_class_10', icon: '🎓', title: '바둑 학생', desc: '바둑 교실 10레슨 완료', category: 'learn' },
  { id: 'baduk_class_50', icon: '🎓', title: '바둑 졸업', desc: '바둑 교실 50레슨 완료', category: 'learn' },
  { id: 'eng_lv5', icon: '🔤', title: '영어 꼬마', desc: '영어나라 Lv.5 달성', category: 'learn' },
  { id: 'eng_lv15', icon: '👑', title: '영어 마스터', desc: '영어나라 Lv.15 달성', category: 'learn' },
  { id: 'eng_gold', icon: '🥇', title: '영어 왕', desc: '영어왕 선발전 Gold 달성', category: 'learn' },

  // General
  { id: 'online_first', icon: '🌐', title: '첫 온라인', desc: '온라인 대전 첫 승리', category: 'general' },
  { id: 'online_10', icon: '🌐', title: '온라인 달인', desc: '온라인 대전 10승', category: 'general' },
  { id: 'all_games', icon: '🎮', title: '만능 게이머', desc: '모든 게임 1회 이상 플레이', category: 'general' },
]

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/** Returns { achievementId: timestamp } for all unlocked achievements */
export function getUnlocked() {
  return load()
}

// 업적 해금 시 호출될 리스너 (App.jsx가 등록해 토스트 표시)
let listeners = []
export function onAchievementUnlock(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

/** Unlock an achievement by id.
 * 새로 해금되면 해당 achievement 객체 반환(리스너도 호출), 이미 해금돼 있으면 null.
 */
export function unlock(id) {
  const ach = ACHIEVEMENTS.find(a => a.id === id)
  if (!ach) return null

  const data = load()
  if (data[id]) return null

  data[id] = Date.now()
  save(data)
  // 비동기로 호출해 React setState 중 실행되지 않도록
  setTimeout(() => listeners.forEach(fn => {
    try { fn(ach) } catch (_) { /* skip */ }
  }), 0)
  return ach
}

/** Check if a specific achievement is unlocked */
export function isUnlocked(id) {
  const data = load()
  return !!data[id]
}

/** Returns { total, unlocked } counts */
export function getProgress() {
  const data = load()
  return {
    total: ACHIEVEMENTS.length,
    unlocked: Object.keys(data).length,
  }
}

/** Reset all achievements */
export function resetAchievements() {
  localStorage.removeItem(STORAGE_KEY)
}
