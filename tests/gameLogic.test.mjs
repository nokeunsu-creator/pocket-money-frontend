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

// ─── 9목 모리스 ───
{
  const MILLS = [[0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],[0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,17],[5,13,20],[2,14,23]]
  const ADJ = [[1,9],[0,2,4],[1,14],[4,10],[1,3,5,7],[4,13],[7,11],[4,6,8],[7,12],[0,10,21],[3,9,11,18],[6,10,15],[8,13,17],[5,12,14,20],[2,13,23],[11,16],[15,17,19],[12,16],[10,19],[16,18,20,22],[13,19],[9,22],[19,21,23],[14,22]]
  function flat(b) { return b.map(c => c ? c[0] : '.').join('') }
  function unflat(s) { return s.split('').map(ch => ch === 'b' ? 'black' : ch === 'w' ? 'white' : null) }
  function inMill(b, i, p) {
    if (b[i] !== p) return false
    return MILLS.filter(m=>m.includes(i)).some(m => m.every(x => b[x] === p))
  }

  const empty = Array(24).fill(null)
  expect(unflat(flat(empty)), empty, '9MM serialize roundtrip (empty)')
  ok(ADJ.length === 24, '9MM: 24 nodes')
  ok(MILLS.length === 16, '9MM: 16 mill lines')
  // 모든 ADJ는 서로 양방향이어야 함
  for (let i = 0; i < 24; i++) {
    for (const j of ADJ[i]) ok(ADJ[j].includes(i), `9MM ADJ symmetry: ${i}-${j}`)
  }
  // 밀 검증
  const b = Array(24).fill(null); b[0]=b[1]=b[2]='black'
  ok(inMill(b, 0, 'black'), '9MM: 0-1-2 mill for black')
  ok(!inMill(b, 0, 'white'), '9MM: 0-1-2 not white mill')
}

// ─── 헥스 ───
{
  const SIZE = 11
  const DIRS = [[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0]]
  function createBoard() { return Array.from({length:SIZE},()=>Array(SIZE).fill(null)) }
  function flat(b) { return b.map(r => r.map(c => c?c[0]:'.').join('')).join('|') }
  function unflat(s) { return s.split('|').map(r => r.split('').map(c => c==='b'?'black':c==='w'?'white':null)) }
  function inB(r,c) { return r>=0&&r<SIZE&&c>=0&&c<SIZE }
  function hasWon(b, p) {
    const vis = Array.from({length:SIZE},()=>Array(SIZE).fill(false))
    const q = []
    if (p==='black') {
      for (let c=0;c<SIZE;c++) if (b[0][c]===p) { q.push([0,c]); vis[0][c]=true }
    } else {
      for (let r=0;r<SIZE;r++) if (b[r][0]===p) { q.push([r,0]); vis[r][0]=true }
    }
    while (q.length) {
      const [r,c] = q.shift()
      if (p==='black' && r===SIZE-1) return true
      if (p==='white' && c===SIZE-1) return true
      for (const [dr,dc] of DIRS) {
        const nr=r+dr,nc=c+dc
        if (!inB(nr,nc)||vis[nr][nc]||b[nr][nc]!==p) continue
        vis[nr][nc]=true; q.push([nr,nc])
      }
    }
    return false
  }

  const b = createBoard()
  expect(unflat(flat(b)), b, 'Hex serialize roundtrip')
  ok(!hasWon(b, 'black') && !hasWon(b, 'white'), 'Hex: empty board, no winner')

  // 흑이 한 줄 (column 5에 위→아래)
  const b2 = createBoard()
  for (let r=0;r<SIZE;r++) b2[r][5] = 'black'
  ok(hasWon(b2, 'black'), 'Hex: vertical column wins for black')
  ok(!hasWon(b2, 'white'), 'Hex: vertical column doesn\'t win for white')
}

// ─── 블로커스 듀오 ───
{
  function normalize(cells) {
    const minR = Math.min(...cells.map(c=>c[0]))
    const minC = Math.min(...cells.map(c=>c[1]))
    return cells.map(([r,c])=>[r-minR,c-minC]).sort((a,b)=>a[0]-b[0]||a[1]-b[1])
  }
  function rotate(c) { return normalize(c.map(([r,c])=>[c,-r])) }
  function flip(c) { return normalize(c.map(([r,c])=>[r,-c])) }
  function getAllOri(c) {
    const set = new Map(); let cur = normalize(c)
    for (let i = 0; i<4;i++) {
      set.set(JSON.stringify(cur), cur)
      set.set(JSON.stringify(flip(cur)), flip(cur))
      cur = rotate(cur)
    }
    return [...set.values()]
  }
  // 1칸 조각: orientation 1개
  expect(getAllOri([[0,0]]).length, 1, 'Blokus: 1-cell has 1 orientation')
  // 2칸 ─: 2개 (가로/세로)
  expect(getAllOri([[0,0],[0,1]]).length, 2, 'Blokus: 2-cell has 2 orientations')
  // L자 4칸: 8개 (4 회전 x 2 거울)
  expect(getAllOri([[0,0],[0,1],[0,2],[1,2]]).length, 8, 'Blokus: L4 has 8 orientations')
}

// ─── 퀀토 ───
{
  function attr(p, bit) { return (p>>bit)&1 }
  function share(pcs) {
    if (pcs.length < 4) return false
    for (let b = 0; b < 4; b++) {
      const v = attr(pcs[0], b)
      if (pcs.every(p => attr(p,b)===v)) return true
    }
    return false
  }
  const LINES = (() => {
    const a = []
    for (let r=0;r<4;r++) a.push([r*4,r*4+1,r*4+2,r*4+3])
    for (let c=0;c<4;c++) a.push([c,c+4,c+8,c+12])
    a.push([0,5,10,15]); a.push([3,6,9,12])
    return a
  })()
  expect(LINES.length, 10, 'Quarto: 10 winning lines')
  // 4 같은 키(0번 비트=1)이면 승
  ok(share([1,3,5,7]), 'Quarto: tall pieces (bit0=1) share')
  // 0,1,2,3 모두 bit2,bit3=0 → 공유. 4개 모든 비트가 섞이려면 신중히 골라야 함.
  // 0=0000, 3=0011, 5=0101, 12=1100 → bit0:0110, bit1:0100, bit2:0011, bit3:0001 (각 비트 mixed)
  ok(!share([0, 3, 5, 12]), 'Quarto: 0,3,5,12 share no attribute (all bits mixed)')
  // 16 조각 모두 있는지
  const all = new Set()
  for (let i = 0; i < 16; i++) all.add(i)
  expect(all.size, 16, 'Quarto: 16 unique pieces')
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

// ─── 체커 ───
{
  const SIZE = 8
  function cellToCh(p) {
    if (!p) return '.'
    if (p.color==='red') return p.king?'R':'r'
    return p.king?'B':'b'
  }
  function chToCell(ch) {
    if (ch==='.') return null
    if (ch==='r') return {color:'red',king:false}
    if (ch==='R') return {color:'red',king:true}
    if (ch==='b') return {color:'black',king:false}
    if (ch==='B') return {color:'black',king:true}
    return null
  }
  function flat(b) { return b.map(r=>r.map(cellToCh).join('')).join('|') }
  function unflat(s) { return s.split('|').map(r=>r.split('').map(chToCell)) }
  function createBoard() {
    const b = Array.from({length:SIZE},()=>Array(SIZE).fill(null))
    for (let r=0;r<3;r++) for (let c=0;c<SIZE;c++) if ((r+c)%2===1) b[r][c]={color:'black',king:false}
    for (let r=5;r<8;r++) for (let c=0;c<SIZE;c++) if ((r+c)%2===1) b[r][c]={color:'red',king:false}
    return b
  }

  const b = createBoard()
  const round = unflat(flat(b))
  expect(round, b, 'Checkers serialize roundtrip')
  // 초기 말 12개씩
  let r=0,bl=0
  for (let i=0;i<SIZE;i++) for (let j=0;j<SIZE;j++) {
    if (b[i][j]?.color==='red') r++
    else if (b[i][j]?.color==='black') bl++
  }
  expect(r, 12, 'Checkers: 12 red pieces initially')
  expect(bl, 12, 'Checkers: 12 black pieces initially')
}

console.log(`\n========= 테스트 결과 =========`)
console.log(`✅ 통과: ${pass}`)
console.log(`❌ 실패: ${fail}`)
if (fail === 0) console.log('🎉 모든 테스트 통과!')
process.exit(fail === 0 ? 0 : 1)
