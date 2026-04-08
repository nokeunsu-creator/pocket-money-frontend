const STORAGE_KEY = 'english-adventure'

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800, 4700, 5700, 6800, 8000, 9500]

const LEVEL_TITLES = [
  '🌱 새싹',
  '🐣 병아리',
  '🐥 아기새',
  '🦋 나비',
  '⭐ 별',
  '🌟 빛나는 별',
  '🔥 불꽃',
  '💎 다이아몬드',
  '🏅 챔피언',
  '👑 왕관',
  '🦅 독수리',
  '🐉 드래곤',
  '🌈 무지개',
  '🚀 로켓',
  '🏆 마스터',
]

const DEFAULT_DATA = {
  level: 1,
  totalScore: 0,
  diamonds: 0,
  streak: 0,
  lastPlayDate: null,
  dailyChallenge: { word: false, spell: false, sentence: false },
  records: {
    wordSprint: {},
    spellingTower: 0,
    sentenceRush: 0,
    wordBattle: { wins: 0, losses: 0 },
    championship: { easy: 0, normal: 0, hard: 0 },
  },
  wrongWords: [],
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
    // merge with defaults to handle new fields
    return {
      ...DEFAULT_DATA,
      ...parsed,
      dailyChallenge: { ...DEFAULT_DATA.dailyChallenge, ...parsed.dailyChallenge },
      records: {
        ...DEFAULT_DATA.records,
        ...parsed.records,
        wordBattle: { ...DEFAULT_DATA.records.wordBattle, ...parsed.records?.wordBattle },
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
  data.dailyChallenge = { word: false, spell: false, sentence: false }
  saveData(data)
  return data
}

export function updateDailyChallenge(type) {
  const data = getData()
  if (type === 'word' || type === 'spell' || type === 'sentence') {
    data.dailyChallenge[type] = true
  }
  saveData(data)
  return data
}

export function isDailyChallengeComplete() {
  const data = getData()
  const { word, spell, sentence } = data.dailyChallenge
  return word && spell && sentence
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

  if (game === 'wordSprint') {
    const current = data.records.wordSprint[key] || 0
    if (value > current) {
      data.records.wordSprint[key] = value
    }
  } else if (game === 'spellingTower') {
    if (value > data.records.spellingTower) {
      data.records.spellingTower = value
    }
  } else if (game === 'sentenceRush') {
    if (value > data.records.sentenceRush) {
      data.records.sentenceRush = value
    }
  } else if (game === 'wordBattle') {
    if (key === 'wins') {
      data.records.wordBattle.wins += value
    } else if (key === 'losses') {
      data.records.wordBattle.losses += value
    }
  } else if (game === 'championship') {
    const current = data.records.championship[key] || 0
    if (value > current) {
      data.records.championship[key] = value
    }
  }

  saveData(data)
  return data
}

export function addWrongWord(kr, en) {
  const data = getData()
  const existing = data.wrongWords.find((w) => w.en === en)

  if (existing) {
    existing.count += 1
  } else {
    data.wrongWords.push({ kr, en, count: 1 })
  }

  saveData(data)
  return data
}

export function getWrongWords() {
  const data = getData()
  return [...data.wrongWords].sort((a, b) => b.count - a.count)
}

export function resetData() {
  const data = { ...DEFAULT_DATA, records: { ...DEFAULT_DATA.records, wordSprint: {}, wordBattle: { ...DEFAULT_DATA.records.wordBattle }, championship: { ...DEFAULT_DATA.records.championship } }, wrongWords: [] }
  saveData(data)
  return data
}
