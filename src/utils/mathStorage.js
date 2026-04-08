const STORAGE_KEY = 'math-adventure'

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800]

const LEVEL_TITLES = [
  '🐣 수학새싹',
  '🐥 수학꼬마',
  '🐤 수학친구',
  '🦋 수학탐험가',
  '⭐ 수학별',
  '🦅 수학도전자',
  '🦁 수학용사',
  '🔥 수학달인',
  '💎 수학천재',
  '👑 수학마스터',
]

const DEFAULT_DATA = {
  level: 1,
  totalScore: 0,
  diamonds: 0,
  streak: 0,
  lastPlayDate: null,
  dailyChallenge: { arithmetic: false, fraction: false, shape: false },
  records: {
    arithmeticSprint: 0,
    fractionMaster: 0,
    shapeQuiz: 0,
    unitConvert: 0,
    clockReading: 0,
    championship: { easy: 0, normal: 0, hard: 0 },
  },
}

export function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const data = { ...DEFAULT_DATA }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      return data
    }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_DATA,
      ...parsed,
      dailyChallenge: { ...DEFAULT_DATA.dailyChallenge, ...parsed.dailyChallenge },
      records: {
        ...DEFAULT_DATA.records,
        ...parsed.records,
        championship: { ...DEFAULT_DATA.records.championship, ...parsed.records?.championship },
      },
    }
  } catch {
    return { ...DEFAULT_DATA }
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage full or unavailable
  }
}

export function addScore(points) {
  const data = getData()
  data.totalScore += points
  data.level = getLevel(data.totalScore)
  saveData(data)
  return data
}

export function addDiamonds(count) {
  const data = getData()
  data.diamonds += count
  saveData(data)
  return data
}

export function updateStreak() {
  const data = getData()
  const today = new Date().toISOString().slice(0, 10)

  if (data.lastPlayDate === today) {
    return data
  }

  if (data.lastPlayDate) {
    const last = new Date(data.lastPlayDate)
    const now = new Date(today)
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      data.streak += 1
    } else if (diffDays > 1) {
      data.streak = 1
    }
  } else {
    data.streak = 1
  }

  data.lastPlayDate = today
  // reset daily challenges for a new day
  data.dailyChallenge = { arithmetic: false, fraction: false, shape: false }
  saveData(data)
  return data
}

export function updateDailyChallenge(type) {
  const data = getData()
  if (type === 'arithmetic' || type === 'fraction' || type === 'shape') {
    data.dailyChallenge[type] = true
  }
  saveData(data)
  return data
}

export function isDailyChallengeComplete() {
  const data = getData()
  const { arithmetic, fraction, shape } = data.dailyChallenge
  return arithmetic && fraction && shape
}

export function getLevel(totalScore) {
  let level = 1
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalScore >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
      break
    }
  }
  return level
}

export function getLevelTitle(level) {
  const index = Math.max(0, Math.min(level - 1, LEVEL_TITLES.length - 1))
  return LEVEL_TITLES[index]
}

export function updateRecord(game, key, value) {
  const data = getData()

  if (game === 'championship') {
    const current = data.records.championship[key] || 0
    if (value > current) {
      data.records.championship[key] = value
    }
  } else {
    // For simple numeric records (arithmeticSprint, fractionMaster, shapeQuiz, unitConvert, clockReading)
    if (key != null) {
      // key provided as sub-field (unused for now but future-proof)
      const current = data.records[game] || 0
      if (value > current) {
        data.records[game] = value
      }
    } else {
      const current = data.records[game] || 0
      if (value > current) {
        data.records[game] = value
      }
    }
  }

  saveData(data)
  return data
}

export function resetData() {
  const data = {
    ...DEFAULT_DATA,
    records: {
      ...DEFAULT_DATA.records,
      championship: { ...DEFAULT_DATA.records.championship },
    },
  }
  saveData(data)
  return data
}
