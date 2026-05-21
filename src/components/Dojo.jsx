import { useState, useEffect, useMemo, useCallback } from 'react'
import { CHILD1, CHILD2 } from '../config/names'
import {
  getDojoAttendance, addDojoAttendance, removeDojoAttendance,
  getDojoSkills, addDojoSkill, removeDojoSkill,
  getDojoJournal, addDojoJournal, deleteDojoJournal,
} from '../api/api'

// 킥복싱+주짓수 도장 3개월 트래커
// 5/26 ~ 8/25 (92일)

const START_DATE = '2026-05-26'
const END_DATE = '2026-08-25'

const KICKBOXING_SKILLS = [
  { id: 'jab', label: '잽 (Jab)' },
  { id: 'one-two', label: '원투 (잽-스트레이트)' },
  { id: 'hook', label: '훅 (Hook)' },
  { id: 'uppercut', label: '어퍼컷 (Uppercut)' },
  { id: 'middle-kick', label: '미들킥' },
  { id: 'low-kick', label: '로우킥' },
  { id: 'high-kick', label: '하이킥' },
  { id: 'front-kick', label: '앞차기' },
  { id: 'round-kick', label: '돌려차기' },
  { id: 'knee', label: '니킥 (무릎차기)' },
  { id: 'ducking', label: '더킹/위빙 (피하기)' },
  { id: 'shadow', label: '셰도우 복싱' },
]

const JIUJITSU_SKILLS = [
  { id: 'closed-guard', label: '클로즈드 가드' },
  { id: 'mount', label: '마운트' },
  { id: 'side-control', label: '사이드 컨트롤' },
  { id: 'back-control', label: '백 컨트롤' },
  { id: 'guard-pass', label: '가드 패스' },
  { id: 'sweep', label: '스윕' },
  { id: 'escape', label: '이스케이프 (탈출)' },
  { id: 'choke', label: '초크 (목조르기)' },
]

// ─── 기술 도감 데이터 ───
// 각 기술의 단계·핵심 포인트·주의사항·이모지 시각화
const DEX = {
  // 킥복싱
  'stance': {
    cat: 'kickboxing', label: '기본 스탠스 (Stance)', emoji: '🧍', en: 'Fighting Stance',
    short: '모든 공격·방어의 시작. 무게 중심과 안정성이 핵심.',
    steps: [
      '두 발 어깨너비, 한 발 앞·한 발 뒤로 (오른손잡이는 왼발 앞)',
      '발끝은 45도 정도 살짝 안쪽',
      '무릎 살짝 굽혀 탄력 있게',
      '두 주먹은 광대뼈 옆, 팔꿈치는 갈비뼈 가림',
      '턱은 안으로, 시선은 정면',
    ],
    tips: ['몸이 정면을 향하지 않게 — 옆으로 약 45도', '발뒤꿈치 살짝 들기 (앞발)', '체중은 50:50'],
    warn: '발이 평행하면 균형 잃기 쉬워요',
  },
  'jab': {
    cat: 'kickboxing', label: '잽 (Jab)', emoji: '👊', en: 'Jab',
    short: '앞손으로 직선으로 지르는 가장 기본 펀치. 거리·견제·셋업의 시작.',
    steps: [
      '기본 스탠스에서 앞손(왼손) 어깨 회전과 함께 직선으로',
      '주먹은 마지막 순간에 꽉 쥐기',
      '뒷손은 턱 옆에 그대로 — 가드 유지!',
      '닿는 순간 손목 살짝 회전 (엄지가 아래로)',
      '치고 나서 같은 길로 빠르게 회수',
    ],
    tips: ['어깨로 밀어내듯', '발을 살짝 같이 미는 게 강함', '회수가 발사보다 빠르게'],
    warn: '잽 때 뒷손 내리면 카운터 맞아요',
  },
  'cross': {
    cat: 'kickboxing', label: '스트레이트 / 원투 (Cross)', emoji: '💥', en: 'Cross',
    short: '뒷손 직선. 잽 다음 따라가는 강타. 허리·골반 회전이 힘의 80%.',
    steps: [
      '뒷발 뒤꿈치를 안쪽으로 회전 (피벗)',
      '골반과 허리를 같이 돌림',
      '뒷손을 가슴 앞 → 직선 발사',
      '앞손은 그대로 턱 가드',
      '치고 빠르게 회수, 기본 자세 복귀',
    ],
    tips: ['"문 손잡이 돌리듯" 발 회전', '잽-스트레이트는 한 박자에 연결', '몸이 너무 앞으로 쏠리지 않게'],
    warn: '발 회전 없이 팔만 뻗으면 약하고 다칠 수 있어요',
  },
  'hook': {
    cat: 'kickboxing', label: '훅 (Hook)', emoji: '🔄', en: 'Hook',
    short: '옆에서 옆으로 휘두르는 펀치. 가드 옆을 노림.',
    steps: [
      '팔꿈치를 어깨 높이까지 들기',
      '팔꿈치 각도는 90도 고정',
      '발과 골반을 회전시키며 휘두름',
      '반대손은 턱 가드 유지',
      '닿는 순간 주먹을 꽉',
    ],
    tips: ['팔만 휘두르지 말고 몸으로 돌리기', '가까운 거리에서 위력 ↑'],
    warn: '팔꿈치 너무 펴면 부상 위험. 90도 유지',
  },
  'uppercut': {
    cat: 'kickboxing', label: '어퍼컷 (Uppercut)', emoji: '⬆️', en: 'Uppercut',
    short: '아래에서 위로 올려치는 펀치. 턱 아래 노림.',
    steps: [
      '살짝 무릎 굽혀 몸을 낮춤',
      '주먹을 위로 솟아오르듯 발사',
      '다리를 펴는 힘이 위로 전달',
      '반대손은 가드 유지',
      '치고 다시 가드 자세로',
    ],
    tips: ['다리 힘으로 친다는 느낌', '근접 거리에서 효과적'],
    warn: '몸이 너무 숙여지면 헤드킥 맞을 수 있어요',
  },
  'middle-kick': {
    cat: 'kickboxing', label: '미들킥 (Middle Kick)', emoji: '🦵', en: 'Roundhouse Kick',
    short: '정강이로 옆구리·갈비를 때리는 회전 발차기. 킥복싱의 꽃.',
    steps: [
      '뒷발 → 미는 발로 사용. 앞발 피벗(축발 회전)',
      '무릎부터 들어 올리며 골반 회전',
      '정강이로 휘두름 (발등 X)',
      '허리·골반·다리가 한 라인',
      '회수 시 무릎부터 접어 빠르게',
    ],
    tips: ['축발(앞발)을 완전히 돌려야 골반이 열림', '정강이로 맞히기 — 발등으로 차면 다침'],
    warn: '발등으로 차면 골절 위험. 꼭 정강이!',
  },
  'low-kick': {
    cat: 'kickboxing', label: '로우킥 (Low Kick)', emoji: '🦶', en: 'Low Kick',
    short: '상대 허벅지를 정강이로 차는 발차기. 묵직한 데미지.',
    steps: [
      '미들킥과 같은 메커니즘 — 더 낮게',
      '축발 회전 완전히',
      '정강이로 허벅지 옆쪽 강타',
      '몸을 약간 옆으로 기울이며 체중 실어',
      '회수 빠르게',
    ],
    tips: ['상대 다리를 베듯이 — 깊게 박지 말고 스치듯', '체중 실어야 효과'],
    warn: '주짓수·MMA에서는 자주 쓰지만 어린이 도장에선 조심',
  },
  'front-kick': {
    cat: 'kickboxing', label: '앞차기 (Front Kick / Teep)', emoji: '🦵', en: 'Front Kick',
    short: '발바닥/발끝으로 정면으로 미는 발차기. 거리 유지·견제용.',
    steps: [
      '무릎을 가슴 쪽으로 끌어올림',
      '발끝/발바닥을 정면으로 쭉 뻗기',
      '엉덩이도 같이 밀어내기',
      '회수는 무릎을 다시 접으며',
      '기본 자세 복귀',
    ],
    tips: ['상대 가슴·복부 미는 느낌', '거리 만들 때 잽처럼 활용'],
    warn: '발끝으로 칠 때 발가락 안 펴고 — 굽히기',
  },
  'knee': {
    cat: 'kickboxing', label: '니킥 (Knee Strike)', emoji: '🦵', en: 'Knee',
    short: '무릎을 위로 올려 치는 근접 공격. 클린치 상태에서 강력.',
    steps: [
      '상대 머리·목을 양손으로 잡기 (클린치)',
      '상대를 살짝 아래로 당기며',
      '무릎을 가슴/복부로 올려 침',
      '뒷발 끝에 체중 실어 들어올리기',
      '한 번 차고 다시 클린치 유지',
    ],
    tips: ['엉덩이 들어올리듯 → 위로 솟구치는 힘', '가까운 거리 전용'],
    warn: '연습 상대와는 살살 — 무릎은 매우 위험',
  },
  'ducking': {
    cat: 'kickboxing', label: '더킹·위빙 (Ducking/Weaving)', emoji: '🤸', en: 'Slip/Duck/Weave',
    short: '머리를 숙이거나 옆으로 빼서 펀치 피하기. 방어의 핵심.',
    steps: [
      '슬립(Slip): 머리를 좌·우로 살짝 기울여 직선 펀치 피하기',
      '더킹(Duck): 무릎 굽혀 몸 전체를 내려 펀치 위로 흘리기',
      '위빙(Weave): 더킹 후 U자로 움직여 다시 올라옴',
      '항상 시선은 상대',
      '피한 직후 카운터 펀치로 연결',
    ],
    tips: ['눈 감지 않기', '엉덩이까지 같이 굽혀야 위빙'],
    warn: '너무 숙이면 어퍼컷 맞아요',
  },
  'shadow': {
    cat: 'kickboxing', label: '셰도우 복싱', emoji: '🥊', en: 'Shadow Boxing',
    short: '거울 보고 혼자 연습. 동작·콤보·풋워크 익히는 시간.',
    steps: [
      '거울 앞에서 기본 스탠스',
      '잽-원투-훅-미들킥 등 콤보 천천히',
      '점점 빠르게',
      '풋워크(앞·뒤·옆 스텝) 섞기',
      '항상 가드 유지 — 손 내리지 않기',
    ],
    tips: ['상대가 있다고 상상', '거울 보고 자세 점검'],
    warn: '없음 — 다칠 일 거의 없는 안전한 연습',
  },
  // 주짓수
  'closed-guard': {
    cat: 'jiujitsu', label: '클로즈드 가드 (Closed Guard)', emoji: '🤼', en: 'Closed Guard',
    short: '내가 등을 대고 누워서 두 다리로 상대 허리를 감싸 잠그는 자세. 주짓수의 시작.',
    steps: [
      '바닥에 등을 대고 누움',
      '상대를 내 위에 끌어당기기',
      '두 다리를 상대 허리 뒤로 둘러 발목 교차',
      '발목을 잠가서 상대가 못 일어나게',
      '손은 상대 옷깃·소매·목을 잡고 통제',
    ],
    tips: ['엉덩이를 상대 가까이 — 멀면 약함', '다리만 잠그지 말고 손도 같이'],
    warn: '발목 교차 너무 세게 — 발목 부상',
  },
  'mount': {
    cat: 'jiujitsu', label: '마운트 (Mount)', emoji: '⬆️', en: 'Full Mount',
    short: '상대 배 위에 올라타 무릎으로 누르는 가장 우세한 포지션.',
    steps: [
      '상대 위에 올라타 무릎을 양옆 바닥에 단단히',
      '두 발을 상대 옆에 접어 고정',
      '엉덩이는 낮게 — 너무 높으면 뒤집힘',
      '체중을 상대 가슴에 실어 누르기',
      '손은 균형 유지·다음 동작 준비',
    ],
    tips: ['상대 팔꿈치를 바닥에 붙이면 못 일어남', '무릎을 겨드랑이 가까이 → 더 안정'],
    warn: '엉덩이 너무 들면 뒤집기 당해요 (Upa)',
  },
  'side-control': {
    cat: 'jiujitsu', label: '사이드 컨트롤 (Side Control)', emoji: '↔️', en: 'Side Control',
    short: '상대 옆구리에 90도로 누르며 제압.',
    steps: [
      '상대 옆구리에 90도 직각으로 위치',
      '한 팔은 상대 머리 밑, 다른 팔은 엉덩이 쪽',
      '가슴으로 상대 가슴을 강하게 누름',
      '두 다리는 넓게 벌려 안정',
      '엉덩이는 낮게',
    ],
    tips: ['상대 멀리 도망 못 가게 가슴으로 압박', '엉덩이를 빼지 말 것'],
    warn: '팔 위치가 멀면 쉽게 빠져나가요',
  },
  'back-control': {
    cat: 'jiujitsu', label: '백 컨트롤 (Back Control)', emoji: '🔙', en: 'Back Mount',
    short: '상대 등 뒤에서 다리로 허리를 감싼 최고의 포지션. 초크 연결 좋음.',
    steps: [
      '상대 등 뒤에 위치',
      '두 다리를 상대 허리 안쪽으로 → 훅 걸기',
      '한 팔은 상대 겨드랑이 아래 (under hook)',
      '다른 팔은 어깨 위로 (over hook)',
      '두 손으로 시트벨트(Seatbelt) 그립',
    ],
    tips: ['발은 절대 교차 X (발목 묶이면 풋록 위험)', '머리 옆을 상대 머리에 붙이기'],
    warn: '발 교차 = 발목 잡힘. 항상 갈고리(훅)만',
  },
  'guard-pass': {
    cat: 'jiujitsu', label: '가드 패스 (Guard Pass)', emoji: '🚶', en: 'Guard Pass',
    short: '상대 가드(다리 사이)를 빠져나와 사이드 컨트롤로 올라가는 기술.',
    steps: [
      '상대 다리 잠금 해제 (벌리거나 풀기)',
      '엉덩이를 낮추고 자세 안정',
      '한쪽 다리 위로 점프/걸어가기',
      '상대 옆구리로 이동',
      '사이드 컨트롤로 안착',
    ],
    tips: ['상대가 다시 가드로 못 돌아오게 즉시 압박', '자세 낮게 유지'],
    warn: '몸이 위로 뜨면 다시 가드 당해요',
  },
  'sweep': {
    cat: 'jiujitsu', label: '스윕 (Sweep)', emoji: '🔄', en: 'Sweep',
    short: '아래 자세(가드)에서 상대를 뒤집어서 내가 위로 올라가는 기술.',
    steps: [
      '가드 자세에서 상대 무게 중심 파악',
      '한쪽 손과 다리로 상대 한쪽 지지점 제거',
      '엉덩이를 들어 올리며 회전',
      '상대 위로 빠르게 올라타기',
      '마운트/사이드로 안착',
    ],
    tips: ['엉덩이 회전(힙 에스케이프) 연습 필수', '타이밍이 중요'],
    warn: '실패하면 다시 가드 당함 — 빠르게 결정',
  },
  'escape': {
    cat: 'jiujitsu', label: '이스케이프 (Escape)', emoji: '🏃', en: 'Escape',
    short: '불리한 자세에서 빠져나오는 기술. 가장 먼저 배워야 할 생존 기술.',
    steps: [
      '깊은 호흡 — 당황하지 않기',
      '엉덩이 빼기 (Shrimping / Hip Escape)',
      '한쪽 팔로 상대 밀어내며 공간 만들기',
      '다리를 빼서 가드 자세로 복귀',
      '안정 후 카운터 준비',
    ],
    tips: ['엉덩이 빼기가 모든 이스케이프의 기본', '버둥거리지 말고 한 동작씩'],
    warn: '힘으로만 빠지려 하면 체력만 소모',
  },
  'choke': {
    cat: 'jiujitsu', label: '초크 (Choke)', emoji: '🤜', en: 'Choke',
    short: '목 옆 동맥을 압박해 항복 받아내는 기술. 정면 기도가 아니라 옆!',
    steps: [
      '백 컨트롤 또는 마운트에서 시작',
      '한 팔을 상대 목 아래로 깊이 (Under arm)',
      '손은 상대 어깨/등에',
      '다른 손으로 첫 손을 잡거나 머리 뒤로',
      '팔을 조여 목 옆 동맥(경동맥) 압박',
    ],
    tips: ['기도(앞) 누르지 말고 옆 — 안 아프고 더 빠름', '상대 탭(두 번 두드림)하면 즉시 풀기!'],
    warn: '⚠️ 친구·형제 연습 시 매우 조심. 탭 = 무조건 멈추기',
  },
}

const DEX_ORDER_KB = [
  'stance', 'jab', 'cross', 'hook', 'uppercut',
  'middle-kick', 'low-kick', 'front-kick', 'knee',
  'ducking', 'shadow',
]
const DEX_ORDER_JJ = [
  'closed-guard', 'mount', 'side-control', 'back-control',
  'guard-pass', 'sweep', 'escape', 'choke',
]

function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function daysBetween(a, b) {
  const ms = parseDate(b).getTime() - parseDate(a).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

// 기존 localStorage 데이터를 서버로 1회 자동 마이그레이션
const MIGRATION_FLAG = 'dojo-server-migrated-v1'

async function migrateLocalToServer() {
  if (localStorage.getItem(MIGRATION_FLAG)) return
  try {
    // 출석
    for (const name of [CHILD1, CHILD2]) {
      const raw = localStorage.getItem(`dojo-attendance-${name}`)
      if (raw) {
        const map = JSON.parse(raw)
        for (const date of Object.keys(map)) {
          if (map[date]) {
            try { await addDojoAttendance(name, date) } catch (_) {}
          }
        }
      }
      const skillRaw = localStorage.getItem(`dojo-skills-${name}`)
      if (skillRaw) {
        const skMap = JSON.parse(skillRaw)
        for (const skillId of Object.keys(skMap)) {
          if (skMap[skillId]) {
            try { await addDojoSkill(name, skillId) } catch (_) {}
          }
        }
      }
    }
    // 일지
    const jRaw = localStorage.getItem('dojo-journal')
    if (jRaw) {
      const arr = JSON.parse(jRaw)
      for (const e of arr.slice().reverse()) { // 오래된 것부터
        try { await addDojoJournal(e.name, e.date, e.text) } catch (_) {}
      }
    }
    localStorage.setItem(MIGRATION_FLAG, '1')
  } catch (e) {
    console.warn('dojo migration failed', e)
  }
}

export default function Dojo({ onBack }) {
  const [tab, setTab] = useState('attendance') // attendance | skills | journal | dex
  const [whoIdx, setWhoIdx] = useState(0) // 0: CHILD1, 1: CHILD2
  const who = whoIdx === 0 ? CHILD1 : CHILD2

  // 서버 기반 데이터
  // attendance[name] = { 'YYYY-MM-DD': true }
  // skills[name] = { 'skillId': true }
  // journal = [{id, date, name, text}]
  const [attendance, setAttendance] = useState({ [CHILD1]: {}, [CHILD2]: {} })
  const [skills, setSkills] = useState({ [CHILD1]: {}, [CHILD2]: {} })
  const [journal, setJournal] = useState([])
  const [loading, setLoading] = useState(true)

  // 서버에서 전체 데이터 로드
  const reload = useCallback(async () => {
    try {
      const [a1, a2, s1, s2, j] = await Promise.all([
        getDojoAttendance(CHILD1).catch(() => []),
        getDojoAttendance(CHILD2).catch(() => []),
        getDojoSkills(CHILD1).catch(() => []),
        getDojoSkills(CHILD2).catch(() => []),
        getDojoJournal().catch(() => []),
      ])
      const toMap = (arr, key) => arr.reduce((m, x) => { m[x[key]] = true; return m }, {})
      setAttendance({
        [CHILD1]: toMap(a1, 'date'),
        [CHILD2]: toMap(a2, 'date'),
      })
      setSkills({
        [CHILD1]: toMap(s1, 'skillId'),
        [CHILD2]: toMap(s2, 'skillId'),
      })
      // 서버 응답의 userName → name으로 매핑 (프론트 표시 호환)
      setJournal((j || []).map(e => ({ ...e, name: e.userName })))
    } catch (e) {
      console.warn('dojo load failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // 첫 마운트: 마이그레이션 → 로드
  useEffect(() => {
    (async () => {
      await migrateLocalToServer()
      await reload()
    })()
  }, [reload])

  const today = fmtDate(new Date())

  // D-day 계산
  const totalDays = daysBetween(START_DATE, END_DATE) + 1
  const elapsed = Math.max(0, daysBetween(START_DATE, today) + 1)
  const remaining = Math.max(0, daysBetween(today, END_DATE))
  const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)))
  const notStarted = today < START_DATE
  const ended = today > END_DATE

  // 출석 토글 (낙관적 UI + 서버 동기화)
  const toggleAttendance = async (date) => {
    const cur = attendance[who] || {}
    const wasOn = !!cur[date]
    const next = { ...cur }
    if (wasOn) delete next[date]; else next[date] = true
    setAttendance(prev => ({ ...prev, [who]: next }))
    try {
      if (wasOn) await removeDojoAttendance(who, date)
      else await addDojoAttendance(who, date)
    } catch (e) {
      // 실패 시 롤백
      setAttendance(prev => ({ ...prev, [who]: cur }))
      alert('서버 저장 실패. 다시 시도해주세요.')
    }
  }

  // 스킬 토글
  const toggleSkill = async (id) => {
    const cur = skills[who] || {}
    const wasOn = !!cur[id]
    const next = { ...cur }
    if (wasOn) delete next[id]; else next[id] = true
    setSkills(prev => ({ ...prev, [who]: next }))
    try {
      if (wasOn) await removeDojoSkill(who, id)
      else await addDojoSkill(who, id)
    } catch (e) {
      setSkills(prev => ({ ...prev, [who]: cur }))
      alert('서버 저장 실패. 다시 시도해주세요.')
    }
  }

  // 일지 추가/삭제
  const addJournalEntry = async (text) => {
    try {
      const saved = await addDojoJournal(who, today, text)
      setJournal(j => [{ ...saved, name: saved.userName }, ...j])
    } catch (e) {
      alert('서버 저장 실패. 다시 시도해주세요.')
    }
  }
  const deleteJournalEntry = async (id) => {
    const prev = journal
    setJournal(j => j.filter(e => e.id !== id))
    try {
      await deleteDojoJournal(id)
    } catch (e) {
      setJournal(prev)
      alert('서버 삭제 실패. 다시 시도해주세요.')
    }
  }

  // 통계
  const stats = useMemo(() => {
    const map = attendance[who] || {}
    const dates = Object.keys(map).filter(d => map[d]).sort()
    const count = dates.length
    // 연속 출석 (오늘부터 거꾸로)
    let streak = 0
    const d = new Date(); d.setHours(0, 0, 0, 0)
    while (map[fmtDate(d)]) {
      streak++
      d.setDate(d.getDate() - 1)
    }
    // 출석률 = 경과일 대비 (시작 전이면 0)
    const denom = Math.max(1, Math.min(elapsed, totalDays))
    const rate = notStarted ? 0 : Math.round((count / denom) * 100)
    return { count, streak, rate, lastDate: dates[dates.length - 1] }
  }, [attendance, who, elapsed, notStarted, totalDays])

  // 헤더
  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#2C3E50' }}>🥊 도장</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>킥복싱 · 주짓수 · 3개월</div>
      </div>
    </div>
  )

  // 자녀 토글
  const whoToggle = (
    <div style={{
      display: 'flex', gap: 8, marginBottom: 14, background: '#FFF',
      padding: 4, borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {[CHILD1, CHILD2].map((n, i) => (
        <button key={n} onClick={() => setWhoIdx(i)}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: whoIdx === i
              ? (i === 0 ? 'linear-gradient(135deg, #4895EF, #3A7BD5)' : 'linear-gradient(135deg, #EF476F, #D63B5C)')
              : 'transparent',
            color: whoIdx === i ? '#FFF' : '#555',
            fontSize: 15, fontWeight: 800,
            transition: 'background 0.15s',
          }}>
          {n}
        </button>
      ))}
    </div>
  )

  // 탭바
  const tabBar = (
    <div style={{
      display: 'flex', gap: 6, marginBottom: 16, background: '#F5F5F5',
      padding: 4, borderRadius: 12,
    }}>
      {[
        { key: 'attendance', label: '📅 출석' },
        { key: 'skills', label: '✅ 기술' },
        { key: 'journal', label: '📝 일지' },
        { key: 'dex', label: '📖 도감' },
      ].map(t => (
        <button key={t.key} onClick={() => setTab(t.key)}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: tab === t.key ? '#FFF' : 'transparent',
            color: tab === t.key ? '#2C3E50' : '#888',
            fontSize: 12, fontWeight: 700,
            boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>
          {t.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: '#FEFCF6', padding: '1rem' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {header}
        {whoToggle}
        {tabBar}

        {tab === 'attendance' && (
          <AttendanceTab
            who={who}
            attendance={attendance[who] || {}}
            stats={stats}
            today={today}
            totalDays={totalDays}
            elapsed={elapsed}
            remaining={remaining}
            progress={progress}
            notStarted={notStarted}
            ended={ended}
            onToggle={toggleAttendance}
          />
        )}

        {tab === 'skills' && (
          <SkillsTab
            who={who}
            checked={skills[who] || {}}
            onToggle={toggleSkill}
          />
        )}

        {tab === 'journal' && (
          <JournalTab
            who={who}
            journal={journal}
            onAdd={addJournalEntry}
            onDelete={deleteJournalEntry}
          />
        )}

        {tab === 'dex' && <DexTab />}
      </div>
    </div>
  )
}

// ─── 출석 탭 ───

function AttendanceTab({ who, attendance, stats, today, totalDays, elapsed, remaining, progress, notStarted, ended, onToggle }) {
  const isToday = !!attendance[today]

  return (
    <div>
      {/* D-day 카드 */}
      <div style={{
        padding: 18, borderRadius: 16,
        background: ended
          ? 'linear-gradient(135deg, #F5F5F5, #E0E0E0)'
          : 'linear-gradient(135deg, #4895EF, #1F77B4)',
        color: '#FFF', marginBottom: 14,
      }}>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          {notStarted ? '시작 전' : ended ? '🎉 3개월 완주!' : '진행 중'}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>
          {notStarted ? `D-${daysBetween(today, START_DATE)}` :
            ended ? `+${daysBetween(END_DATE, today)}일` :
              `${elapsed}일째 · D-${remaining}`}
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
          {START_DATE} ~ {END_DATE} ({totalDays}일)
        </div>
        <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 10, height: 8, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#FFF' }} />
        </div>
      </div>

      {/* 오늘 출석 버튼 */}
      <button onClick={() => !notStarted && !ended && onToggle(today)}
        disabled={notStarted || ended}
        style={{
          width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
          background: notStarted || ended
            ? '#EEE'
            : isToday
              ? 'linear-gradient(135deg, #06D6A0, #05B384)'
              : 'linear-gradient(135deg, #FF8C42, #E76F51)',
          color: '#FFF', fontSize: 17, fontWeight: 800, cursor: notStarted || ended ? 'default' : 'pointer',
          marginBottom: 14,
        }}>
        {notStarted ? '시작 전입니다' : ended ? '종료됨' : isToday ? `✅ ${who} 오늘 도장 갔어요 (취소하려면 탭)` : `🥊 ${who} 오늘 도장 가요!`}
      </button>

      {/* 통계 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <StatBox label="총 출석" value={`${stats.count}회`} color="#4895EF" />
        <StatBox label="연속" value={`${stats.streak}일`} color="#FF8C42" />
        <StatBox label="출석률" value={`${stats.rate}%`} color="#06D6A0" />
      </div>

      {/* 캘린더 */}
      <CalendarGrid attendance={attendance} onToggle={onToggle} />
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, padding: 12, borderRadius: 12, background: '#FFF',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function CalendarGrid({ attendance, onToggle }) {
  const [viewDate, setViewDate] = useState(() => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), 1)
  })
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthLabel = `${year}.${String(month + 1).padStart(2, '0')}`
  const firstDay = new Date(year, month, 1).getDay() // 0=일
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = fmtDate(new Date())

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const inRange = (dateStr) => dateStr >= START_DATE && dateStr <= END_DATE

  const prev = () => setViewDate(new Date(year, month - 1, 1))
  const next = () => setViewDate(new Date(year, month + 1, 1))

  return (
    <div style={{ background: '#FFF', borderRadius: 16, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={prev}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#555', padding: '4px 12px' }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{monthLabel}</div>
        <button onClick={next}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#555', padding: '4px 12px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 11, fontWeight: 700,
            color: i === 0 ? '#E63946' : i === 6 ? '#4895EF' : '#888', padding: '4px 0',
          }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const isAttended = !!attendance[dateStr]
          const isToday = dateStr === today
          const enabled = inRange(dateStr)
          return (
            <button key={i} onClick={() => enabled && onToggle(dateStr)}
              disabled={!enabled}
              style={{
                aspectRatio: '1', borderRadius: 10,
                background: isAttended
                  ? 'linear-gradient(135deg, #06D6A0, #05B384)'
                  : isToday ? '#FFF3CD' : enabled ? '#F5F5F5' : '#FAFAFA',
                color: isAttended ? '#FFF' : enabled ? '#2C3E50' : '#CCC',
                fontSize: 13, fontWeight: isAttended ? 800 : 600,
                cursor: enabled ? 'pointer' : 'default',
                border: isToday && !isAttended ? '2px solid #FF8C42' : '2px solid transparent',
                position: 'relative',
              }}>
              {d}
              {isAttended && <div style={{ position: 'absolute', top: 2, right: 4, fontSize: 9 }}>🥊</div>}
            </button>
          )
        })}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#888', textAlign: 'center' }}>
        도장 간 날짜를 탭해서 체크 / 취소
      </div>
    </div>
  )
}

// ─── 기술 탭 ───

function SkillsTab({ who, checked, onToggle }) {
  const kbCount = KICKBOXING_SKILLS.filter(s => checked[s.id]).length
  const jjCount = JIUJITSU_SKILLS.filter(s => checked[s.id]).length

  return (
    <div>
      <Section title={`🥊 킥복싱 (${kbCount}/${KICKBOXING_SKILLS.length})`} color="#E63946">
        {KICKBOXING_SKILLS.map(s => (
          <SkillRow key={s.id} skill={s} on={!!checked[s.id]} onToggle={() => onToggle(s.id)} />
        ))}
      </Section>
      <Section title={`🥋 주짓수 (${jjCount}/${JIUJITSU_SKILLS.length})`} color="#1F77B4">
        {JIUJITSU_SKILLS.map(s => (
          <SkillRow key={s.id} skill={s} on={!!checked[s.id]} onToggle={() => onToggle(s.id)} />
        ))}
      </Section>
      <p style={{ fontSize: 11, color: '#888', textAlign: 'center', marginTop: 12 }}>
        도장에서 배우거나 한 기술을 체크해요
      </p>
    </div>
  )
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color, marginBottom: 8, paddingLeft: 4 }}>
        {title}
      </div>
      <div style={{ background: '#FFF', borderRadius: 14, padding: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {children}
      </div>
    </div>
  )
}

function SkillRow({ skill, on, onToggle }) {
  return (
    <button onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: on ? '#E8F8F0' : 'transparent', textAlign: 'left',
      }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        background: on ? '#06D6A0' : '#F0F0F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#FFF', fontSize: 14, fontWeight: 800, flexShrink: 0,
      }}>
        {on ? '✓' : ''}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: on ? '#1B5E20' : '#2C3E50', flex: 1 }}>
        {skill.label}
      </div>
    </button>
  )
}

// ─── 일지 탭 ───

function JournalTab({ who, journal, onAdd, onDelete }) {
  const [text, setText] = useState('')
  const myEntries = journal.filter(e => e.name === who)

  const submit = () => {
    const t = text.trim()
    if (!t) return
    onAdd(t)
    setText('')
  }

  return (
    <div>
      <div style={{ background: '#FFF', borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 8, fontWeight: 700 }}>
          {who} 오늘 한 줄
        </div>
        <textarea value={text} onChange={e => setText(e.target.value.slice(0, 100))}
          placeholder="예: 미들킥 처음 배웠어요. 발등이 아팠지만 재밌었어요!"
          rows={3}
          style={{
            width: '100%', padding: 12, fontSize: 14, borderRadius: 10,
            border: '1.5px solid #DDD', resize: 'none',
            boxSizing: 'border-box', minWidth: 0, fontFamily: 'inherit',
          }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#888' }}>{text.length} / 100</span>
          <button onClick={submit} disabled={!text.trim()}
            style={{
              padding: '8px 20px', borderRadius: 10, border: 'none',
              background: text.trim() ? 'linear-gradient(135deg, #4895EF, #1F77B4)' : '#DDD',
              color: '#FFF', fontSize: 14, fontWeight: 700,
              cursor: text.trim() ? 'pointer' : 'default',
            }}>
            저장
          </button>
        </div>
      </div>

      {myEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#AAA', fontSize: 13 }}>
          {who}의 일지가 아직 없어요. 첫 일지를 남겨보세요!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myEntries.map(e => (
            <div key={e.id} style={{
              background: '#FFF', padding: 14, borderRadius: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{e.date}</div>
                <div style={{ fontSize: 14, color: '#2C3E50', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e.text}</div>
              </div>
              <button onClick={() => onDelete(e.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#CCC', padding: 4 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 도감 탭 ───

function DexTab() {
  const [selected, setSelected] = useState(null) // 선택된 기술 id
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | kickboxing | jiujitsu

  if (selected) {
    return <DexDetail id={selected} onBack={() => setSelected(null)} />
  }

  const matches = (id) => {
    const e = DEX[id]
    if (!e) return false
    if (filter !== 'all' && e.cat !== filter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return e.label.toLowerCase().includes(q) || e.en.toLowerCase().includes(q) || (e.short && e.short.includes(search))
  }

  const kbList = DEX_ORDER_KB.filter(matches)
  const jjList = DEX_ORDER_JJ.filter(matches)

  return (
    <div>
      {/* 검색·필터 */}
      <div style={{ marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 기술 이름 검색"
          style={{
            width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 12,
            border: '1.5px solid #DDD', boxSizing: 'border-box', minWidth: 0, marginBottom: 8,
          }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { k: 'all', l: '전체' },
            { k: 'kickboxing', l: '🥊 킥복싱' },
            { k: 'jiujitsu', l: '🥋 주짓수' },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: filter === f.k ? '#2C3E50' : '#F0F0F0',
                color: filter === f.k ? '#FFF' : '#555',
                fontSize: 12, fontWeight: 700,
              }}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* 킥복싱 */}
      {(filter === 'all' || filter === 'kickboxing') && kbList.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#E63946', marginBottom: 8, paddingLeft: 4 }}>
            🥊 킥복싱 ({kbList.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {kbList.map(id => <DexCard key={id} id={id} onClick={() => setSelected(id)} />)}
          </div>
        </div>
      )}

      {/* 주짓수 */}
      {(filter === 'all' || filter === 'jiujitsu') && jjList.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1F77B4', marginBottom: 8, paddingLeft: 4 }}>
            🥋 주짓수 ({jjList.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {jjList.map(id => <DexCard key={id} id={id} onClick={() => setSelected(id)} />)}
          </div>
        </div>
      )}

      {kbList.length === 0 && jjList.length === 0 && (
        <div style={{ textAlign: 'center', padding: 30, color: '#AAA', fontSize: 13 }}>
          검색 결과가 없어요
        </div>
      )}

      <div style={{
        marginTop: 14, padding: 12, borderRadius: 12, background: '#FFF8E1',
        fontSize: 11, color: '#856404', lineHeight: 1.5,
      }}>
        💡 카드를 누르면 단계별 자세히 볼 수 있어요. "유튜브에서 보기" 버튼으로 동영상도 확인 가능!
      </div>
    </div>
  )
}

function DexCard({ id, onClick }) {
  const e = DEX[id]
  const isKB = e.cat === 'kickboxing'
  return (
    <button onClick={onClick}
      style={{
        padding: 12, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: '#FFF', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 6,
        textAlign: 'left', borderLeft: `4px solid ${isKB ? '#E63946' : '#1F77B4'}`,
      }}>
      <div style={{ fontSize: 32, lineHeight: 1 }}>{e.emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#2C3E50' }}>{e.label}</div>
      <div style={{ fontSize: 10, color: '#888' }}>{e.en}</div>
    </button>
  )
}

function DexDetail({ id, onBack }) {
  const e = DEX[id]
  if (!e) return null
  const isKB = e.cat === 'kickboxing'
  // 유튜브 검색 링크 (한글 이름 + 기초)
  const ytQuery = encodeURIComponent(`${e.label.split(' ')[0]} ${isKB ? '킥복싱' : '주짓수'} 기초`)
  const ytUrl = `https://www.youtube.com/results?search_query=${ytQuery}`

  return (
    <div>
      <button onClick={onBack}
        style={{ background: '#F0F0F0', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#555', cursor: 'pointer', marginBottom: 14 }}>
        ← 도감으로
      </button>

      {/* 헤더 카드 */}
      <div style={{
        padding: 20, borderRadius: 16, marginBottom: 14,
        background: isKB
          ? 'linear-gradient(135deg, #E63946, #B91D47)'
          : 'linear-gradient(135deg, #1F77B4, #0D3D6B)',
        color: '#FFF', textAlign: 'center',
      }}>
        <div style={{ fontSize: 60, lineHeight: 1 }}>{e.emoji}</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{e.label}</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{e.en}</div>
        <div style={{ fontSize: 13, opacity: 0.95, marginTop: 10, lineHeight: 1.5 }}>{e.short}</div>
      </div>

      {/* 단계 */}
      <div style={{ background: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#2C3E50', marginBottom: 10 }}>📋 단계별</div>
        {e.steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: isKB ? '#E63946' : '#1F77B4', color: '#FFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, flexShrink: 0,
            }}>{i + 1}</div>
            <div style={{ fontSize: 13, color: '#2C3E50', lineHeight: 1.5, paddingTop: 3 }}>{s}</div>
          </div>
        ))}
      </div>

      {/* 핵심 팁 */}
      <div style={{ background: '#E8F8F0', borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1B5E20', marginBottom: 8 }}>💡 핵심 팁</div>
        {e.tips.map((t, i) => (
          <div key={i} style={{ fontSize: 13, color: '#2D6A4F', marginBottom: 4, lineHeight: 1.5 }}>
            • {t}
          </div>
        ))}
      </div>

      {/* 주의 */}
      {e.warn && (
        <div style={{ background: '#FFF5F5', borderRadius: 14, padding: 14, marginBottom: 12, borderLeft: '4px solid #E63946' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#B91D47', marginBottom: 6 }}>⚠️ 주의</div>
          <div style={{ fontSize: 13, color: '#7E0B30', lineHeight: 1.5 }}>{e.warn}</div>
        </div>
      )}

      {/* 유튜브 검색 */}
      <a href={ytUrl} target="_blank" rel="noopener noreferrer"
        style={{
          display: 'block', width: '100%', boxSizing: 'border-box',
          padding: '14px 0', borderRadius: 12,
          background: 'linear-gradient(135deg, #FF0000, #C40000)',
          color: '#FFF', fontSize: 15, fontWeight: 800, textAlign: 'center',
          textDecoration: 'none', marginTop: 6,
        }}>
        ▶️ 유튜브에서 동영상 보기
      </a>
      <p style={{ fontSize: 10, color: '#AAA', textAlign: 'center', marginTop: 8 }}>
        새 탭에서 유튜브 검색 결과가 열려요
      </p>
    </div>
  )
}
