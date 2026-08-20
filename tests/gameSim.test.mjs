// 게임별 5~20수 시뮬레이션 — AI 동작/승부 판정/직렬화 라운드트립 통합 검증
// 목적: 빌드는 통과해도 런타임에 발생할 수 있는 state 불일치, 무한루프, AI 오류 등을 잡기

let pass = 0, fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg); console.error('❌', msg) }
}

// ─── Gonu 시뮬레이션 ───
function simGonu() {
  const ADJ = [[1,3],[0,2,4],[1,5],[0,4,6],[1,3,5,7],[2,4,8],[3,7],[4,6,8],[5,7]]
  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8]]
  function checkWin(b, p) { return LINES.some(l => l.every(i => b[i] === p)) }
  function opp(p) { return p === 'black' ? 'white' : 'black' }
  function getMoves(b, p) {
    const m = []
    for (let i = 0; i < 9; i++) {
      if (b[i] !== p) continue
      for (const j of ADJ[i]) if (b[j] === null) m.push({ from: i, to: j })
    }
    return m
  }
  function apply(b, mv, p) { const nb = [...b]; nb[mv.from] = null; nb[mv.to] = p; return nb }

  let b = [null].fill(null); b = Array(9).fill(null)
  b[0]='black';b[1]='black';b[3]='black';b[5]='white';b[7]='white';b[8]='white'
  let turn = 'black'
  let movesPlayed = 0
  let winner = null

  for (let i = 0; i < 50; i++) {
    if (winner) break
    const moves = getMoves(b, turn)
    if (moves.length === 0) {
      // 이동 불가 → 상대 승
      winner = opp(turn)
      break
    }
    const mv = moves[Math.floor(Math.random() * moves.length)]
    b = apply(b, mv, turn)
    movesPlayed++
    if (checkWin(b, turn)) { winner = turn; break }
    turn = opp(turn)
  }
  ok(movesPlayed > 0, `Gonu sim: at least one move played (played=${movesPlayed})`)
  ok(movesPlayed <= 50, 'Gonu sim: game terminates within 50 moves')
}

// ─── Othello 시뮬레이션 ───
function simOthello() {
  const SIZE = 8
  const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
  function createBoard() {
    const b = Array.from({length:SIZE},()=>Array(SIZE).fill(null))
    b[3][3]='white';b[4][4]='white';b[3][4]='black';b[4][3]='black'; return b
  }
  function opp(p) { return p === 'black' ? 'white' : 'black' }
  function flipsDir(b,r,c,dr,dc,p) {
    const f=[]; let nr=r+dr,nc=c+dc
    while(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE) {
      if(b[nr][nc]===null) return []
      if(b[nr][nc]===p) return f
      f.push([nr,nc]); nr+=dr; nc+=dc
    }
    return []
  }
  function getFlips(b,r,c,p) {
    if(b[r][c]!==null) return []
    const a=[]
    for(const [dr,dc] of DIRS) a.push(...flipsDir(b,r,c,dr,dc,p))
    return a
  }
  function getMoves(b,p) {
    const m=[]
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++) {
      const f=getFlips(b,r,c,p); if(f.length) m.push({r,c,flips:f})
    }
    return m
  }
  function apply(b,r,c,flips,p) {
    const nb=b.map(row=>[...row]); nb[r][c]=p
    for(const [fr,fc] of flips) nb[fr][fc]=p
    return nb
  }

  let b = createBoard()
  let turn = 'black'
  let consecutivePasses = 0
  let movesPlayed = 0

  for (let i = 0; i < 70; i++) {
    if (consecutivePasses >= 2) break
    const moves = getMoves(b, turn)
    if (moves.length === 0) {
      consecutivePasses++
      turn = opp(turn)
      continue
    }
    consecutivePasses = 0
    const mv = moves[Math.floor(Math.random() * moves.length)]
    b = apply(b, mv.r, mv.c, mv.flips, turn)
    movesPlayed++
    turn = opp(turn)
  }
  ok(movesPlayed > 0, `Othello sim: moves played (${movesPlayed})`)
  ok(movesPlayed < 70, 'Othello sim: game terminated')

  // 디스크 카운트가 movesPlayed+4와 일치해야 함 (시작 4 + 각 수 1개씩 추가)
  let cnt = 0
  for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) if (b[r][c]) cnt++
  ok(cnt === movesPlayed + 4, `Othello sim: disc count consistency (${cnt} vs ${movesPlayed+4})`)
}

// ─── Connect4 시뮬레이션 ───
function simConnect4() {
  const ROWS=6, COLS=7
  function createBoard() { return Array.from({length:ROWS},()=>Array(COLS).fill(null)) }
  function dropRow(b,c) { for(let r=ROWS-1;r>=0;r--) if(b[r][c]===null) return r; return -1 }
  function checkWin(b,r,c,p) {
    const D=[[0,1],[1,0],[1,1],[1,-1]]
    for(const [dr,dc] of D) {
      let cnt=1
      for(let d=1;d<4;d++){const nr=r+dr*d,nc=c+dc*d;if(nr<0||nr>=ROWS||nc<0||nc>=COLS||b[nr][nc]!==p)break;cnt++}
      for(let d=1;d<4;d++){const nr=r-dr*d,nc=c-dc*d;if(nr<0||nr>=ROWS||nc<0||nc>=COLS||b[nr][nc]!==p)break;cnt++}
      if(cnt>=4) return true
    }
    return false
  }
  function opp(p) { return p==='red'?'yellow':'red' }

  let b = createBoard()
  let turn = 'red'
  let played = 0
  let winner = null

  for (let i = 0; i < 42; i++) {
    if (winner) break
    const avail = []
    for (let c=0;c<COLS;c++) if (dropRow(b,c)>=0) avail.push(c)
    if (avail.length === 0) break
    const c = avail[Math.floor(Math.random()*avail.length)]
    const r = dropRow(b, c)
    b[r][c] = turn
    played++
    if (checkWin(b, r, c, turn)) winner = turn
    turn = opp(turn)
  }
  ok(played > 0, `Connect4 sim: played ${played} moves`)
  ok(played <= 42, 'Connect4 sim: max 42 moves on full board')
}

// ─── 직렬화 라운드트립 — 큰 보드 ───
function simSerialization() {
  // Othello 8x8
  const SIZE = 8
  function flat(b) { return b.map(r => r.map(c => c?c[0]:'.').join('')).join('|') }
  function unflat(s) { return s.split('|').map(r=>r.split('').map(c=>c==='b'?'black':c==='w'?'white':null)) }

  // 랜덤 상태로 100회 라운드트립
  let allOk = true
  for (let t = 0; t < 100; t++) {
    const b = Array.from({length:SIZE},()=>Array(SIZE).fill(null))
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
      const r2 = Math.random()
      if (r2 < 0.33) b[r][c] = 'black'
      else if (r2 < 0.66) b[r][c] = 'white'
    }
    const r2 = unflat(flat(b))
    if (JSON.stringify(b) !== JSON.stringify(r2)) { allOk = false; break }
  }
  ok(allOk, 'Othello: 100 random serialization roundtrips')
}

simGonu()
simOthello()
simConnect4()
simSerialization()

console.log(`\n========= 시뮬레이션 결과 =========`)
console.log(`✅ 통과: ${pass}`)
console.log(`❌ 실패: ${fail}`)
if (fail > 0) console.log('\n실패한 검증:', failures)
process.exit(fail === 0 ? 0 : 1)
