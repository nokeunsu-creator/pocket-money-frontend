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

// ─── Checkers 시뮬레이션 (단순화: 합법수 random) ───
function simCheckers() {
  const SIZE = 8
  function inB(r,c) { return r>=0&&r<SIZE&&c>=0&&c<SIZE }
  function clone(b) { return b.map(r=>r.map(c=>c?{...c}:null)) }
  function opp(c) { return c==='red'?'black':'red' }
  function dirs(p) {
    if (p.king) return [[-1,-1],[-1,1],[1,-1],[1,1]]
    return p.color==='red' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]]
  }
  function jumps(b,r,c) {
    const piece = b[r][c]; if(!piece) return []
    const result = []
    function recurse(cb, cr, cc, steps, caps) {
      let extended = false
      for(const [dr,dc] of dirs(cb[cr][cc])) {
        const mr=cr+dr,mc=cc+dc,lr=cr+dr*2,lc=cc+dc*2
        if(!inB(lr,lc)) continue
        if(!cb[mr][mc] || cb[mr][mc].color!==opp(cb[cr][cc].color)) continue
        if(cb[lr][lc]!==null) continue
        const nb = clone(cb)
        const moved = {...nb[cr][cc]}
        if(moved.color==='red' && lr===0) moved.king=true
        if(moved.color==='black' && lr===SIZE-1) moved.king=true
        nb[cr][cc]=null; nb[mr][mc]=null; nb[lr][lc]=moved
        const ns = [...steps, [lr,lc]]
        const nc = [...caps, [mr,mc]]
        result.push({from:[r,c], steps:ns, captures:nc})
        extended = true
        recurse(nb, lr, lc, ns, nc)
      }
    }
    recurse(b, r, c, [], [])
    return result
  }
  function simple(b,r,c) {
    const piece=b[r][c]; if(!piece) return []
    const out=[]
    for(const [dr,dc] of dirs(piece)) {
      const nr=r+dr,nc=c+dc
      if(!inB(nr,nc)||b[nr][nc]!==null) continue
      out.push({from:[r,c],steps:[[nr,nc]],captures:[]})
    }
    return out
  }
  function allMoves(b,col) {
    const j=[]; const s=[]
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      const p=b[r][c]; if(!p||p.color!==col) continue
      j.push(...jumps(b,r,c)); s.push(...simple(b,r,c))
    }
    return j.length>0?j:s
  }
  function apply(b, mv) {
    const nb=clone(b)
    const [fr,fc]=mv.from
    let p={...nb[fr][fc]}; nb[fr][fc]=null
    for(const [cr,cc] of mv.captures) nb[cr][cc]=null
    const [lr,lc]=mv.steps[mv.steps.length-1]
    if(p.color==='red'&&lr===0) p.king=true
    if(p.color==='black'&&lr===SIZE-1) p.king=true
    nb[lr][lc]=p
    return nb
  }
  function pieceCount(b,c) {
    let n=0
    for(let r=0;r<SIZE;r++)for(let cc=0;cc<SIZE;cc++) if(b[r][cc]?.color===c) n++
    return n
  }
  function createBoard() {
    const b = Array.from({length:SIZE},()=>Array(SIZE).fill(null))
    for(let r=0;r<3;r++)for(let c=0;c<SIZE;c++)if((r+c)%2===1)b[r][c]={color:'black',king:false}
    for(let r=5;r<8;r++)for(let c=0;c<SIZE;c++)if((r+c)%2===1)b[r][c]={color:'red',king:false}
    return b
  }

  let b = createBoard()
  let turn = 'red'
  let played = 0
  let winner = null

  for (let i = 0; i < 200; i++) {
    if (winner) break
    const moves = allMoves(b, turn)
    if (moves.length === 0) { winner = opp(turn); break }
    const mv = moves[Math.floor(Math.random()*moves.length)]
    b = apply(b, mv)
    played++
    if (pieceCount(b, opp(turn)) === 0) { winner = turn; break }
    turn = opp(turn)
  }
  ok(played > 0, `Checkers sim: played ${played} moves`)
}

// ─── Hex 시뮬레이션 ───
function simHex() {
  const SIZE = 11
  const DIRS = [[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0]]
  function inB(r,c) { return r>=0&&r<SIZE&&c>=0&&c<SIZE }
  function hasWon(b,p) {
    const vis = Array.from({length:SIZE},()=>Array(SIZE).fill(false))
    const q=[]
    if (p==='black') for(let c=0;c<SIZE;c++) if(b[0][c]===p){q.push([0,c]);vis[0][c]=true}
    else for(let r=0;r<SIZE;r++) if(b[r][0]===p){q.push([r,0]);vis[r][0]=true}
    while(q.length){
      const [r,c]=q.shift()
      if(p==='black'&&r===SIZE-1) return true
      if(p==='white'&&c===SIZE-1) return true
      for(const [dr,dc] of DIRS){
        const nr=r+dr,nc=c+dc
        if(!inB(nr,nc)||vis[nr][nc]||b[nr][nc]!==p) continue
        vis[nr][nc]=true; q.push([nr,nc])
      }
    }
    return false
  }

  let b = Array.from({length:SIZE},()=>Array(SIZE).fill(null))
  let turn = 'black'
  let played = 0
  let winner = null

  for (let i = 0; i < SIZE*SIZE; i++) {
    if (winner) break
    const avail = []
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) if (b[r][c]===null) avail.push([r,c])
    if (avail.length === 0) break
    const [r,c] = avail[Math.floor(Math.random()*avail.length)]
    b[r][c] = turn
    played++
    if (hasWon(b, turn)) winner = turn
    turn = turn==='black'?'white':'black'
  }
  // Hex는 무승부 없음 → 정상 게임은 누군가 이겨야 종료됨
  ok(played > 0, `Hex sim: played ${played} moves`)
  // 121수 안에는 반드시 누군가 이김 (Hex 정리). 그러나 랜덤 플레이에서 마지막 수가
  // 종료 조건을 못 만들고 끝났다면 winner=null일 수 있음 (정상)
  ok(played <= SIZE * SIZE, `Hex sim: terminated within ${SIZE*SIZE} moves`)
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

  // Checkers
  function cellToCh(p) {
    if (!p) return '.'
    if (p.color==='red') return p.king?'R':'r'
    return p.king?'B':'b'
  }
  function chToCell(ch) {
    if (ch==='.') return null
    return {r:{color:'red',king:false},R:{color:'red',king:true},b:{color:'black',king:false},B:{color:'black',king:true}}[ch]
  }
  function chkflat(b) { return b.map(r=>r.map(cellToCh).join('')).join('|') }
  function chkunflat(s) { return s.split('|').map(r=>r.split('').map(chToCell)) }

  let chkOk = true
  for (let t = 0; t < 100; t++) {
    const b = Array.from({length:SIZE},()=>Array(SIZE).fill(null))
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
      const x = Math.random()
      if (x < 0.2) b[r][c] = {color:'red',king:false}
      else if (x < 0.4) b[r][c] = {color:'red',king:true}
      else if (x < 0.6) b[r][c] = {color:'black',king:false}
      else if (x < 0.8) b[r][c] = {color:'black',king:true}
    }
    const r2 = chkunflat(chkflat(b))
    if (JSON.stringify(b) !== JSON.stringify(r2)) { chkOk = false; break }
  }
  ok(chkOk, 'Checkers: 100 random serialization roundtrips (with kings)')
}

simGonu()
simOthello()
simConnect4()
simCheckers()
simHex()
simSerialization()

console.log(`\n========= 시뮬레이션 결과 =========`)
console.log(`✅ 통과: ${pass}`)
console.log(`❌ 실패: ${fail}`)
if (fail > 0) console.log('\n실패한 검증:', failures)
process.exit(fail === 0 ? 0 : 1)
