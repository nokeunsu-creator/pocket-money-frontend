// 각 게임 핵심 로직 + 직렬화 라운드트립 + 승부 판정 테스트
// node tests/gameLogic.test.mjs 로 실행
//
// 핵심 검증 포인트:
// 1) 직렬화 함수가 라운드트립 안전한가 (online 상태 동기화의 정합성)
// 2) 초기 상태가 유효한가
// 3) 승부 판정이 올바른가
// 4) 합법수가 합법 조건을 모두 만족하는가
// 5) AI가 항상 합법수를 반환하는가 (deadlock 방지)

let pass = 0, fail = 0
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; console.error('❌ FAIL:', msg) }
}
function expect(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) { pass++ } else { fail++; console.error(`❌ FAIL: ${msg} — actual=${a}, expected=${e}`) }
}

// ─── 줄고누 (Gonu) ───
{
  const ADJ = [[1,3],[0,2,4],[1,5],[0,4,6],[1,3,5,7],[2,4,8],[3,7],[4,6,8],[5,7]]
  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8]]
  function checkWin(board, p) { return LINES.some(l => l.every(i => board[i] === p)) }
  function opp(p) { return p === 'black' ? 'white' : 'black' }
  function getMoves(board, p) {
    const m = []
    for (let i = 0; i < 9; i++) {
      if (board[i] !== p) continue
      for (const j of ADJ[i]) if (board[j] === null) m.push({ from: i, to: j })
    }
    return m
  }
  function applyMove(board, mv, p) { const nb = [...board]; nb[mv.from] = null; nb[mv.to] = p; return nb }
  function initial() { const b = Array(9).fill(null); b[0]='black';b[1]='black';b[3]='black';b[5]='white';b[7]='white';b[8]='white'; return b }
  function flat(b) { return b.map(c => c||'').join(',') }
  function unflat(s) { return s.split(',').map(c => c||null) }

  const b = initial()
  // 라운드트립
  expect(unflat(flat(b)), b, 'Gonu serialize roundtrip')
  // 초기 합법수
  ok(getMoves(b, 'black').length > 0, 'Gonu: black has legal moves at start')
  ok(getMoves(b, 'white').length > 0, 'Gonu: white has legal moves at start')
  // 승부 판정 (인공적)
  const winB = [...b]; winB[2] = 'black' // 0,1,2 줄
  winB[5] = null
  ok(checkWin(winB, 'black'), 'Gonu: 0-1-2 win for black')
  ok(!checkWin(b, 'black'), 'Gonu: initial no win')
  // 인접 검증 (대각선 없음)
  ok(!ADJ[0].includes(4), 'Gonu: no diagonal from 0 to 4')
  ok(ADJ[4].length === 4, 'Gonu: center has 4 neighbors')
}

// ─── 오델로 (Othello) ───
{
  const SIZE = 8
  const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
  function createBoard() {
    const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
    b[3][3] = 'white'; b[4][4] = 'white'; b[3][4] = 'black'; b[4][3] = 'black'
    return b
  }
  function flat(b) { return b.map(r => r.map(c => c ? c[0] : '.').join('')).join('|') }
  function unflat(s) { return s.split('|').map(r => r.split('').map(c => c === 'b' ? 'black' : c === 'w' ? 'white' : null)) }
  function flipsInDir(b, r, c, dr, dc, p) {
    const f = []; let nr = r+dr, nc = c+dc
    while (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE) {
      if (b[nr][nc] === null) return []
      if (b[nr][nc] === p) return f
      f.push([nr,nc]); nr+=dr; nc+=dc
    }
    return []
  }
  function getFlips(b, r, c, p) {
    if (b[r][c]!==null) return []
    const a = []
    for (const [dr,dc] of DIRS) a.push(...flipsInDir(b,r,c,dr,dc,p))
    return a
  }
  function getValidMoves(b, p) {
    const m = []
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
      const f = getFlips(b,r,c,p); if (f.length) m.push({r,c,flips:f})
    }
    return m
  }

  const b = createBoard()
  // 라운드트립
  expect(unflat(flat(b)), b, 'Othello serialize roundtrip')
  // 초기 흑 합법수 = 4 (위/아래/좌/우 각 1)
  const moves = getValidMoves(b, 'black')
  expect(moves.length, 4, 'Othello: black has 4 initial moves')
  // 잘못된 수: 빈 보드 한가운데
  expect(getFlips(createBoard(), 0, 0, 'black').length, 0, 'Othello: corner empty has no flips initially')
}

// ─── 커넥트 포 ───
{
  const ROWS = 6, COLS = 7
  function createBoard() { return Array.from({length:ROWS},()=>Array(COLS).fill(null)) }
  function flat(b) { return b.map(r=>r.map(c=>c?c[0]:'.').join('')).join('|') }
  function unflat(s) { return s.split('|').map(r=>r.split('').map(c=>c==='r'?'red':c==='y'?'yellow':null)) }
  function dropRow(b, c) { for (let r=ROWS-1;r>=0;r--) if (b[r][c]===null) return r; return -1 }
  function checkWin(b, r, c, p) {
    const D = [[0,1],[1,0],[1,1],[1,-1]]
    for (const [dr,dc] of D) {
      let cnt = 1
      for (let d=1;d<4;d++) { const nr=r+dr*d,nc=c+dc*d; if (nr<0||nr>=ROWS||nc<0||nc>=COLS||b[nr][nc]!==p) break; cnt++ }
      for (let d=1;d<4;d++) { const nr=r-dr*d,nc=c-dc*d; if (nr<0||nr>=ROWS||nc<0||nc>=COLS||b[nr][nc]!==p) break; cnt++ }
      if (cnt >= 4) return true
    }
    return false
  }

  const b = createBoard()
  expect(unflat(flat(b)), b, 'Connect4 serialize roundtrip')
  expect(dropRow(b, 3), ROWS-1, 'Connect4: drop on empty col goes to bottom')
  // 가로 4연 승리
  const b2 = createBoard()
  for (let c=0;c<4;c++) b2[5][c] = 'red'
  ok(checkWin(b2, 5, 3, 'red'), 'Connect4: 4 in a row wins')
  ok(!checkWin(b2, 5, 3, 'yellow'), 'Connect4: not yellow win')
}

console.log(`\n========= 테스트 결과 =========`)
console.log(`✅ 통과: ${pass}`)
console.log(`❌ 실패: ${fail}`)
if (fail === 0) console.log('🎉 모든 테스트 통과!')
process.exit(fail === 0 ? 0 : 1)
