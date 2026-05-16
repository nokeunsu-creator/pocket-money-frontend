// 국지 모양 패턴 라이브러리
// move ordering / 평가에 가산되는 핵심 응수 패턴.
//
// 패턴 셀 값:
//   'O' = 자기 색
//   'X' = 상대 색
//   '.' = 빈칸 (반드시)
//   '?' = 무관 (보드 밖 포함)
//   '*' = 후보 위치 (이 자리에 두는 것에 대한 보너스)
//
// 매칭: 패턴 중앙(r,c)을 기준으로 4회전 × 2반사 = 8가지 시도.
// quickMoveScore에 가산되어 move ordering에 영향.

const DIRS8 = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
]

// 3x3 패턴: 자기 색이 (1,1)에 두려는 후보일 때 주변 모양
// (r,c)는 패턴의 (1,1) 위치 (실제 보드 좌표)
// 각 패턴 객체는 변환 적용 후 8개 셀(상하좌우+대각)을 검사.
// rotations: 회전/반사 적용 여부 (대부분 true)

const PATTERNS = [
  // ─── 호구(虎口) 안 두지 말기: 자기색 ㄱ자 + 대각 자기색 → 가운데 자살에 가까움
  // X X .     이미 호구 안. 두면 안 됨 = 강한 페널티
  // X * .
  // . . .
  {
    cells: ['X', 'X', '.', 'X', '.', '.', '.', '.'],
    bonus: -25,
    desc: '상대 호구 안 두기 (위험)',
  },

  // ─── 마늘모 응수: 상대 마늘모 옆에 마늘모로 받음
  // . X .     상대(X) 마늘모 → 자기 마늘모(*) 응수
  // . * .
  // X . .
  // 즉, 인접에 같은 색 마늘모 있을 때 마늘모 받음
  {
    cells: ['.', 'X', '.', '.', '.', 'X', '.', '.'],
    bonus: 8,
    desc: '상대 마늘모 응수 마늘모',
  },

  // ─── 호구 막기: 상대가 호구 모양 만들 수 있는 자리 → 자기색 두면 좋음
  // O . .
  // . * .
  // O . X     자기 ㄱ자 + 상대 대각 → 호구 만들기 가점
  {
    cells: ['O', '.', '.', '.', '.', 'O', '.', 'X'],
    bonus: 6,
    desc: '호구 만들기',
  },

  // ─── 들여다보기(peep): 상대 두 돌 사이 약점
  // X . X     상대 두 돌 사이 빈 칸에 두면 끊기
  // . * .
  // . . .
  {
    cells: ['X', '.', 'X', '.', '.', '.', '.', '.'],
    bonus: 5,
    desc: '들여다보기/끊기 후보',
  },

  // ─── 단수 모면 (자기색 활로 좁아질 때 뻗기)
  // X O .
  // X * .     자기 그룹이 단수 위협 받을 때 뻗기
  // X . .
  // 자기색이 한쪽에 줄지어 + 상대 둘러쌈 → 반대로 뻗으면 가점
  {
    cells: ['X', 'O', '.', 'X', '.', 'X', '.', '.'],
    bonus: 12,
    desc: '단수 모면 뻗기',
  },

  // ─── 이단젖힘 모양: 상대 한 줄 + 자기 옆 → 한 번 더 젖히면 강함
  // O X .
  // . * .
  // . . .
  {
    cells: ['O', 'X', '.', '.', '.', '.', '.', '.'],
    bonus: 3,
    desc: '젖힘 잇기',
  },

  // ─── 환격(double atari): 두면 두 그룹 동시 단수
  // X . X     양쪽 상대 그룹을 동시에 위협
  // X * X
  // . . .
  {
    cells: ['X', '.', 'X', 'X', 'X', '.', '.', '.'],
    bonus: 18,
    desc: '환격 후보',
  },

  // ─── 자기 호구 안 빈칸 두지 않기 (자기집 메우기 비슷)
  // O O O
  // O * O
  // O O O     자기집 안에 두면 헛수 - 큰 페널티
  {
    cells: ['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],
    bonus: -40,
    desc: '자기집 안 (헛수)',
  },

  // ─── 1선/2선 회피 (모서리/변 약자) - 이미 quickMoveScore에 있지만 패턴 단순 강화
  // 이건 패턴이 아니라 위치 기반이라 생략

  // ─── 끊는 수(切り): 상대 두 그룹 분리
  // X . O
  // . * .
  // O . X     상대(X) 두 돌 + 자기(O) 두 돌 교차 → 끊으면 큰 가점
  {
    cells: ['X', '.', 'O', '.', '.', 'O', '.', 'X'],
    bonus: 10,
    desc: '끊는 수',
  },

  // ─── 빈삼각 회피 (자기 빈삼각 만드는 자리)
  // O O .
  // O * .
  // . . .     자기색 ㄱ자에 들어가 빈삼각 만듦 → 페널티
  {
    cells: ['O', 'O', '.', 'O', '.', '.', '.', '.'],
    bonus: -8,
    desc: '빈삼각 회피',
  },
]

// 패턴의 (1,1) 중앙 좌표 기준으로 8주변 인덱스 매핑:
// cells[0..7] 순서 = [상좌, 상, 상우, 좌, 우, 하좌, 하, 하우]
const NEIGHBOR_ORDER = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
]

// 회전 변환 (90도 시계방향)
function rotateCells(cells) {
  // [0,1,2,3,4,5,6,7] → 회전 후:
  // 원본 (1,1)을 중심으로:
  //   0=(-1,-1) 1=(-1,0) 2=(-1,1)
  //   3=(0,-1)           4=(0,1)
  //   5=(1,-1)  6=(1,0)  7=(1,1)
  // 90도 회전: (dr,dc) → (dc, -dr)
  // (-1,-1)=0 → (-1, 1)=2
  // (-1, 0)=1 → ( 0, 1)=4
  // (-1, 1)=2 → ( 1, 1)=7
  // ( 0,-1)=3 → (-1, 0)=1
  // ( 0, 1)=4 → ( 1, 0)=6
  // ( 1,-1)=5 → (-1,-1)=0
  // ( 1, 0)=6 → ( 0,-1)=3
  // ( 1, 1)=7 → ( 1,-1)=5
  const map = [2, 4, 7, 1, 6, 0, 3, 5]
  return map.map(i => cells[i])
}

function flipCells(cells) {
  // 수평 반사 (좌우 뒤집기)
  // 0↔2, 3↔4, 5↔7  (1, 6 그대로)
  const map = [2, 1, 0, 4, 3, 7, 6, 5]
  return map.map(i => cells[i])
}

// 모든 변환 미리 생성 (회전 4 × 반사 2 = 8가지)
const ALL_TRANSFORMS = (() => {
  const result = []
  for (const pat of PATTERNS) {
    const variants = new Set()
    let cur = pat.cells
    for (let r = 0; r < 4; r++) {
      const key1 = cur.join('')
      if (!variants.has(key1)) {
        variants.add(key1)
        result.push({ cells: [...cur], bonus: pat.bonus, desc: pat.desc })
      }
      const flipped = flipCells(cur)
      const key2 = flipped.join('')
      if (!variants.has(key2)) {
        variants.add(key2)
        result.push({ cells: flipped, bonus: pat.bonus, desc: pat.desc })
      }
      cur = rotateCells(cur)
    }
  }
  return result
})()

// 보드의 (r,c) 자리에 색깔(color)이 두려고 할 때 패턴 매칭으로 보너스 합산
// matchCells: 패턴 셀 vs 실제 보드 셀
//   'O' = color, 'X' = opp, '.' = null
//   '?' = wildcard (현재 미사용)
export function getPatternBonus(board, size, r, c, color) {
  const opp = color === 'black' ? 'white' : 'black'

  // 후보 위치는 비어 있어야 함
  if (board[r][c] !== null) return 0

  // 주변 8셀 추출
  const around = new Array(8)
  for (let i = 0; i < 8; i++) {
    const [dr, dc] = NEIGHBOR_ORDER[i]
    const nr = r + dr, nc = c + dc
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
      around[i] = '?' // 보드 밖
    } else if (board[nr][nc] === color) {
      around[i] = 'O'
    } else if (board[nr][nc] === opp) {
      around[i] = 'X'
    } else {
      around[i] = '.'
    }
  }

  let totalBonus = 0
  for (const variant of ALL_TRANSFORMS) {
    let match = true
    for (let i = 0; i < 8; i++) {
      const want = variant.cells[i]
      const got = around[i]
      if (want === '?') continue
      if (want === got) continue
      // 보드 밖('?')은 '.'와 매칭 가능 (보수적으로)
      if (got === '?' && want === '.') continue
      match = false
      break
    }
    if (match) totalBonus += variant.bonus
  }
  return totalBonus
}
