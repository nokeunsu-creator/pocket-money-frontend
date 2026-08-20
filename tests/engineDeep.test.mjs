// 더 많은 게임 엔진의 핵심 로직 검증
// 각 게임 .jsx에서 추출한 내부 함수를 재구현하여 다양한 케이스로 테스트
// 목적: 실제 게임 플레이 중 발생하는 엣지 케이스 (off-by-one, 무한루프 등) 검출

let pass = 0, fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg); console.error('❌', msg) }
}
function expect(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) pass++; else { fail++; failures.push(`${msg}: ${a} !== ${e}`); console.error(`❌ ${msg}: ${a} !== ${e}`) }
}

// ─── 숫자야구 (NumberBaseball) ───
{
  // 3자리, 모든 자릿수 다름, 0 가능
  function judge(secret, guess) {
    let strikes = 0, balls = 0
    for (let i = 0; i < 3; i++) {
      if (secret[i] === guess[i]) strikes++
      else if (secret.includes(guess[i])) balls++
    }
    return { strikes, balls }
  }
  expect(judge('123', '123'), { strikes: 3, balls: 0 }, 'Baseball: 3 strikes')
  expect(judge('123', '321'), { strikes: 1, balls: 2 }, 'Baseball: 1S 2B')
  expect(judge('123', '456'), { strikes: 0, balls: 0 }, 'Baseball: out')
  expect(judge('012', '210'), { strikes: 1, balls: 2 }, 'Baseball: with 0')
  expect(judge('012', '012'), { strikes: 3, balls: 0 }, 'Baseball: leading zero')
}

// ─── 구구단 (MultiplyChallenge) ───
{
  // 곱셈 정답 검증
  function check(a, b, ans) { return a * b === ans }
  ok(check(7, 8, 56), 'Mult: 7x8=56')
  ok(check(9, 9, 81), 'Mult: 9x9=81')
  ok(!check(7, 8, 57), 'Mult: wrong')
}

// ─── 24점 퍼즐 (TwentyFour) ───
{
  // 표현식 평가 (안전 파서 — eval 안 씀)
  // 셔팅 야드 단순화로 +,-,*,/ 와 괄호 지원, 정수
  function evaluate(expr) {
    const tokens = []
    let i = 0
    while (i < expr.length) {
      const ch = expr[i]
      if (ch === ' ') { i++; continue }
      if ('+-*/()'.includes(ch)) { tokens.push(ch); i++; continue }
      if ('0123456789'.includes(ch) || ch === '.') {
        let j = i
        while (j < expr.length && ('0123456789.'.includes(expr[j]))) j++
        tokens.push(parseFloat(expr.slice(i, j))); i = j
      } else throw new Error('bad char: ' + ch)
    }
    let pos = 0
    function parseExpr() {
      let v = parseTerm()
      while (tokens[pos] === '+' || tokens[pos] === '-') {
        const op = tokens[pos++]
        const r = parseTerm()
        v = op === '+' ? v + r : v - r
      }
      return v
    }
    function parseTerm() {
      let v = parseFactor()
      while (tokens[pos] === '*' || tokens[pos] === '/') {
        const op = tokens[pos++]
        const r = parseFactor()
        v = op === '*' ? v * r : v / r
      }
      return v
    }
    function parseFactor() {
      if (tokens[pos] === '(') { pos++; const v = parseExpr(); pos++; return v }
      return tokens[pos++]
    }
    return parseExpr()
  }

  ok(Math.abs(evaluate('1+2*3') - 7) < 1e-6, '24: 1+2*3=7')
  ok(Math.abs(evaluate('(1+2)*8') - 24) < 1e-6, '24: (1+2)*8=24')
  ok(Math.abs(evaluate('6*4') - 24) < 1e-6, '24: 6*4=24')
  ok(Math.abs(evaluate('8/(3-7/3)') - 12) < 1e-6, '24: 8/(3-7/3)=12 (well-known)')
}

// ─── 메모리 카드 (MemoryCard) ───
{
  // 카드 짝 매칭 검증
  function makeCards(pairs) {
    const arr = []
    for (let i = 0; i < pairs; i++) { arr.push(i); arr.push(i) }
    return arr
  }
  function shuffle(arr, seed) {
    // 결정적 셔플
    const a = [...arr]
    let s = seed
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280
      const j = s % (i + 1)
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const cards = shuffle(makeCards(8), 42)
  expect(cards.length, 16, 'Memory: 8 pairs = 16 cards')
  // 각 카드 값 정확히 2개씩
  const counts = {}
  cards.forEach(c => { counts[c] = (counts[c] || 0) + 1 })
  ok(Object.values(counts).every(v => v === 2), 'Memory: each pair exactly 2 cards')
}

// ─── 스도쿠 (Sudoku) 검증 ───
{
  // 풀린 스도쿠 검증
  function isValidSudoku(grid) {
    const N = 9
    for (let r = 0; r < N; r++) {
      const seen = new Set()
      for (let c = 0; c < N; c++) {
        const v = grid[r][c]
        if (v < 1 || v > 9 || seen.has(v)) return false
        seen.add(v)
      }
    }
    for (let c = 0; c < N; c++) {
      const seen = new Set()
      for (let r = 0; r < N; r++) {
        const v = grid[r][c]
        if (seen.has(v)) return false
        seen.add(v)
      }
    }
    for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
      const seen = new Set()
      for (let r = br*3; r < br*3+3; r++) for (let c = bc*3; c < bc*3+3; c++) {
        const v = grid[r][c]
        if (seen.has(v)) return false
        seen.add(v)
      }
    }
    return true
  }
  const valid = [
    [5,3,4,6,7,8,9,1,2],
    [6,7,2,1,9,5,3,4,8],
    [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],
    [4,2,6,8,5,3,7,9,1],
    [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],
    [2,8,7,4,1,9,6,3,5],
    [3,4,5,2,8,6,1,7,9],
  ]
  ok(isValidSudoku(valid), 'Sudoku: known valid solution accepted')
  // 행 중복
  const dup = JSON.parse(JSON.stringify(valid))
  dup[0][0] = dup[0][1]
  ok(!isValidSudoku(dup), 'Sudoku: row duplicate rejected')
}

// ─── 오목 (Omok) 5목 검증 ───
{
  const SIZE = 15
  function checkWin(b, r, c, p) {
    const D = [[0,1],[1,0],[1,1],[1,-1]]
    for (const [dr,dc] of D) {
      let n = 1
      for (let d=1;d<5;d++) { const nr=r+dr*d,nc=c+dc*d; if (nr<0||nr>=SIZE||nc<0||nc>=SIZE||b[nr][nc]!==p) break; n++ }
      for (let d=1;d<5;d++) { const nr=r-dr*d,nc=c-dc*d; if (nr<0||nr>=SIZE||nc<0||nc>=SIZE||b[nr][nc]!==p) break; n++ }
      if (n>=5) return true
    }
    return false
  }
  const b = Array.from({length:SIZE},()=>Array(SIZE).fill(null))
  for (let i=0;i<5;i++) b[7][7+i] = 'black'
  ok(checkWin(b, 7, 9, 'black'), 'Omok: 5 horizontal wins')
  // 6목은 5목보다 강함 → 마찬가지로 인정
  b[7][12] = 'black' // 6연속
  ok(checkWin(b, 7, 9, 'black'), 'Omok: 6+ in row also wins')
}

// ─── 6목 (SixInRow) ───
{
  const SIZE = 13
  const WIN = 6
  function checkWin(b, r, c, p) {
    const D = [[0,1],[1,0],[1,1],[1,-1]]
    for (const [dr,dc] of D) {
      let n = 1
      for (let d=1;d<WIN;d++) { const nr=r+dr*d,nc=c+dc*d; if (nr<0||nr>=SIZE||nc<0||nc>=SIZE||b[nr][nc]!==p) break; n++ }
      for (let d=1;d<WIN;d++) { const nr=r-dr*d,nc=c-dc*d; if (nr<0||nr>=SIZE||nc<0||nc>=SIZE||b[nr][nc]!==p) break; n++ }
      if (n>=WIN) return true
    }
    return false
  }
  const b = Array.from({length:SIZE},()=>Array(SIZE).fill(null))
  // 5목은 6목에서 미달
  for (let i=0;i<5;i++) b[5][i] = 'black'
  ok(!checkWin(b, 5, 2, 'black'), '6목: 5연속은 미승리')
  b[5][5] = 'black' // 6연속
  ok(checkWin(b, 5, 2, 'black'), '6목: 6연속 승리')
}

// ─── 원카드 (OneCard) ───
{
  // 카드 매칭: 같은 색 또는 같은 숫자
  function canPlay(card, top, currentColor) {
    if (card.color === 'wild') return true
    if (card.color === currentColor) return true
    if (top && card.value === top.value && top.color !== 'wild') return true
    return false
  }
  expect(canPlay({color:'red',value:3}, {color:'red',value:5}, 'red'), true, 'OneCard: same color')
  expect(canPlay({color:'red',value:3}, {color:'blue',value:3}, 'blue'), true, 'OneCard: same number')
  expect(canPlay({color:'red',value:3}, {color:'blue',value:5}, 'blue'), false, 'OneCard: no match')
  expect(canPlay({color:'wild',value:'wild'}, {color:'red',value:5}, 'red'), true, 'OneCard: wild always plays')
}

// ─── 라이트아웃 (LightsOut) - 5x5 토글 ───
{
  function toggle(grid, r, c) {
    const N = 5
    const nb = grid.map(row => [...row])
    const dirs = [[0,0],[-1,0],[1,0],[0,-1],[0,1]]
    for (const [dr,dc] of dirs) {
      const nr=r+dr,nc=c+dc
      if (nr>=0&&nr<N&&nc>=0&&nc<N) nb[nr][nc] = !nb[nr][nc]
    }
    return nb
  }
  let g = Array.from({length:5},()=>Array(5).fill(false))
  g = toggle(g, 2, 2) // 중앙 + 십자
  expect(g[2][2], true, 'LightsOut: center on')
  expect(g[1][2], true, 'LightsOut: up neighbor on')
  expect(g[2][1], true, 'LightsOut: left neighbor on')
  expect(g[0][0], false, 'LightsOut: corner stays off')
  // 두 번 토글하면 원복
  g = toggle(g, 2, 2)
  ok(g.every(row => row.every(c => !c)), 'LightsOut: double toggle = identity')
}

// ─── 15퍼즐 (Puzzle15) ───
{
  // 슬라이딩 퍼즐: 0=빈칸
  function solved(grid) {
    const flat = grid.flat()
    for (let i = 0; i < 15; i++) if (flat[i] !== i + 1) return false
    return flat[15] === 0
  }
  const target = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,0]]
  ok(solved(target), 'Puzzle15: solved board recognized')
  const bad = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,15,14,0]]
  ok(!solved(bad), 'Puzzle15: unsolved board rejected')
}

// ─── 끝말잇기 (WordChain) ───
{
  function lastChar(word) { return word.trim().slice(-1) }
  // 두음법칙 매핑
  const DUEUM = {'녀':'여','뇨':'요','뉴':'유','니':'이','라':'나','래':'내','로':'노','루':'누','르':'느','리':'이','랴':'야','려':'여','례':'예','료':'요','류':'유'}
  function canConnect(prev, next) {
    if (!prev || !next) return false
    const last = lastChar(prev)
    const first = next.trim()[0]
    if (first === last) return true
    if (DUEUM[last] === first) return true
    return false
  }
  ok(canConnect('사과', '과일'), 'WordChain: 사과 → 과일')
  ok(canConnect('수박', '박물관'), 'WordChain: 수박 → 박물관')
  ok(canConnect('녹리', '이야기'), 'WordChain: 리 → 이 (두음법칙)')
  ok(!canConnect('수박', '사과'), 'WordChain: 박 != 사')
}

// ─── 빙고 (가상) 줄 검출 ───
{
  // 5x5 빙고 — 가로 5, 세로 5, 대각선 2 = 12줄
  function checkLines(marked) {
    let lines = 0
    for (let r = 0; r < 5; r++) if (marked[r].every(x => x)) lines++
    for (let c = 0; c < 5; c++) {
      let all = true
      for (let r = 0; r < 5; r++) if (!marked[r][c]) { all = false; break }
      if (all) lines++
    }
    if ([0,1,2,3,4].every(i => marked[i][i])) lines++
    if ([0,1,2,3,4].every(i => marked[i][4-i])) lines++
    return lines
  }
  const empty = Array.from({length:5},()=>Array(5).fill(false))
  expect(checkLines(empty), 0, 'Bingo: empty = 0 lines')
  const row0 = Array.from({length:5},()=>Array(5).fill(false))
  for (let c = 0; c < 5; c++) row0[0][c] = true
  expect(checkLines(row0), 1, 'Bingo: full row = 1 line')
  const full = Array.from({length:5},()=>Array(5).fill(true))
  expect(checkLines(full), 12, 'Bingo: full board = 12 lines (5+5+2)')
}

console.log(`\n========= 엔진 심층 검증 결과 =========`)
console.log(`✅ 통과: ${pass}`)
console.log(`❌ 실패: ${fail}`)
if (fail > 0) console.log('\n--- 실패 ---\n', failures.join('\n'))
process.exit(fail === 0 ? 0 : 1)
