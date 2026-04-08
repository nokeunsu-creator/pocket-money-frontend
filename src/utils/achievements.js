const STORAGE_KEY = 'game-achievements'

export const ACHIEVEMENTS = [
  // Board games
  { id: 'omok_ai_win', icon: '⚫', title: '오목 AI 격파', desc: '오목 AI에게 승리', category: 'board' },
  { id: 'chess_ai_win', icon: '♟️', title: '체크메이트!', desc: '체스 AI에게 승리', category: 'board' },
  { id: 'janggi_lv1', icon: '將', title: '장기 입문', desc: '장기 Lv.1 클리어', category: 'board' },
  { id: 'janggi_lv5', icon: '將', title: '장기 중급', desc: '장기 Lv.5 클리어', category: 'board' },
  { id: 'janggi_lv10', icon: '🏆', title: '장기 달인', desc: '장기 Lv.10 클리어', category: 'board' },
  { id: 'baduk_ai_win', icon: '⚪', title: '바둑 첫 승', desc: '바둑 AI에게 승리', category: 'board' },
  { id: 'baduk_lv10', icon: '🏆', title: '바둑 고수', desc: '바둑 Lv.10 AI 격파', category: 'board' },

  // Card games
  { id: 'onecard_win', icon: '🃏', title: '원카드 승리', desc: '원카드에서 승리', category: 'card' },
  { id: 'hula_win', icon: '♠️', title: '훌라!', desc: '훌라에서 승리', category: 'card' },

  // Brain games
  { id: 'baseball_solve', icon: '⚾', title: '숫자 탐정', desc: '숫자야구 정답 맞추기', category: 'brain' },
  { id: 'multiply_30', icon: '✖️', title: '구구단 마스터', desc: '구구단 30개 이상 정답', category: 'brain' },
  { id: 'math_30', icon: '🧮', title: '연산 달인', desc: '사칙연산 30개 이상 정답', category: 'brain' },

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

/** Unlock an achievement by id. Returns true if newly unlocked, false if already unlocked. */
export function unlock(id) {
  const valid = ACHIEVEMENTS.some(a => a.id === id)
  if (!valid) return false

  const data = load()
  if (data[id]) return false

  data[id] = Date.now()
  save(data)
  return true
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
