// 체스 기물 — 스탠턴(Staunton) 스타일 SVG
//
// 왜 직접 그렸나: 유니코드 글리프(♔♕♖…)는 기기·폰트마다 두께와 비율이 달라서
// 같은 화면이 안 나오고, 40px 안팎에서는 선이 얇아 킹/퀸이 구분되지 않는다.
// 대회에서 쓰는 스탠턴 기물 실루엣을 직접 정의해 어느 기기에서나 같은 모양으로
// 굵고 선명하게 보이게 한다.
//
// 어떻게 그렸나: 실제 체스 기물은 선반(lathe)으로 깎은 회전체다. 그래서 나이트를
// 뺀 5종은 오른쪽 절반 윤곽선(profile)만 점으로 정의하고, 아래 lathe()가
// Catmull-Rom → 3차 베지어로 매끄럽게 이어 좌우 대칭으로 닫는다. 숫자만 고치면
// 모양이 바뀌므로 유지보수가 쉽고, 좌우 비대칭이 생길 수 없다.
// 나이트만 회전체가 아니라 말머리를 closedCurve()로 따로 그린다.
//
// 좌표계: 45×45 viewBox, 중심 x=22.5, 접지면 y=41 (체스 SVG 관례)

import { useId } from 'react'

const CX = 22.5
const S = 'sharp' // 그 점에서 곡선을 꺾어 모서리로 만든다

const r2 = v => Math.round(v * 100) / 100

// Catmull-Rom 접선. sharp면 그 방향 접선을 세그먼트 위로 눕혀 모서리를 만든다.
function tangent(prev, cur, next, sharp) {
  if (sharp) return [(next[0] - cur[0]) / 3, (next[1] - cur[1]) / 3]
  return [(next[0] - prev[0]) / 6, (next[1] - prev[1]) / 6]
}

function curveThrough(points) {
  const P = points
  const n = P.length
  const at = i => P[(i + n) % n]
  let d = `M${r2(P[0][0])} ${r2(P[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    const t1 = tangent(p0, p1, p2, p1[2])
    const t2 = tangent(p3, p2, p1, p2[2])
    d += `C${r2(p1[0] + t1[0])} ${r2(p1[1] + t1[1])} ${r2(p2[0] + t2[0])} ${r2(p2[1] + t2[1])} ${r2(p2[0])} ${r2(p2[1])}`
  }
  return d + 'Z'
}

// 오른쪽 절반 윤곽(바닥 중심 → 위쪽 중심) → 좌우 대칭 닫힌 곡선
function lathe(half) {
  const pts = half.map(p => [p[0], p[1], p[2] === S])
  const full = [...pts]
  for (let i = pts.length - 2; i >= 1; i--) full.push([-pts[i][0], pts[i][1], pts[i][2]])
  return curveThrough(full.map(p => [CX + p[0], p[1], p[2]]))
}

// 절대좌표 점 배열 → 닫힌 매끄러운 곡선 (나이트 말머리)
function closedCurve(points) {
  return curveThrough(points.map(p => [p[0], p[1], p[2] === S]))
}

// 좌우 대칭 직선 폴리곤 (룩 성벽, 왕관 톱니처럼 각진 형태)
function mirrorPoly(half) {
  const right = half.map(p => [CX + p[0], p[1]])
  const left = []
  for (let i = half.length - 2; i >= 0; i--) left.push([CX - half[i][0], half[i][1]])
  return 'M' + [...right, ...left].map(p => `${r2(p[0])} ${r2(p[1])}`).join('L') + 'Z'
}

// 기물 폭에 맞춘 수평 디테일선 (받침 윗면, 칼라 — 깎아낸 단을 표현)
const hline = (halfW, y) => `M${r2(CX - halfW)} ${y}H${r2(CX + halfW)}`

// 공통 받침: 접지면 → 받침 측면 → 베벨. w = 접지면 반폭
const foot = w => [[0, 41, S], [w, 41, S], [w, 38.3, S], [w - 2.2, 36.5, S]]
const footLine = w => hline(w - 2.2, 36.5)

// ── 폰 — 구슬 머리 + 짧은 목 + 스커트 ────────────────
const PAWN = {
  body: lathe([
    ...foot(10.8),
    [6.0, 34.2], [4.2, 30.8], [3.2, 27.4],
    [2.9, 24.6, S], [4.4, 23.2, S], [3.1, 21.8, S],
    [5.0, 19.6], [5.5, 16.4], [4.3, 13.4],
    [0, 11.6, S],
  ]),
  lines: [footLine(10.8), hline(3.6, 23.2)],
}

// ── 룩 — 거의 곧은 원통 + 각진 성벽(크레넬) ──────────
const ROOK = {
  body: lathe([
    ...foot(12.2),
    [8.0, 34.2], [6.9, 31.0], [6.6, 27.0], [6.8, 23.0],
    [6.4, 21.6, S], [9.6, 20.4, S], [9.6, 18.2, S],
    [0, 18.2, S],
  ]),
  top: mirrorPoly([
    [9.6, 18.4], [9.6, 9.6], [6.2, 9.6], [6.2, 12.9],
    [2.6, 12.9], [2.6, 9.6], [0, 9.6],
  ]),
  lines: [footLine(12.2), hline(9.6, 20.4), hline(9.6, 15.4)],
}

// ── 비숍 — 위로 좁아지는 미터(주교관) + 사선 슬릿 ────
const BISHOP = {
  body: lathe([
    ...foot(12.0),
    [7.2, 34.2], [5.0, 30.4], [3.9, 26.6],
    [3.6, 24.2, S], [5.3, 22.9, S], [3.6, 21.5, S],
    [6.2, 18.6], [7.0, 14.8], [5.2, 10.8], [2.6, 8.6],
    [0, 7.5, S],
  ]),
  ball: { cx: CX, cy: 5.7, r: 2.2 },
  lines: [footLine(12.0), hline(4.4, 22.9)],
  slit: 'M18.4 17.0 L26.4 9.8',
}

// ── 퀸 — 다섯 갈래 코로넷 + 구슬 ─────────────────────
const QUEEN = {
  body: lathe([
    ...foot(13.2),
    [8.2, 34.2], [5.8, 30.2], [4.5, 26.2],
    [4.2, 23.6, S], [5.9, 22.3, S], [4.2, 20.9, S],
    [6.6, 18.6], [8.8, 16.4], [9.6, 14.9, S],
    [0, 14.9, S],
  ]),
  coronet: mirrorPoly([
    [9.6, 15.1], [8.5, 9.4], [6.3, 12.9], [4.2, 8.9], [2.1, 12.9], [0, 8.4],
  ]),
  balls: [
    { cx: CX - 8.5, cy: 7.8, r: 1.85 },
    { cx: CX - 4.2, cy: 7.2, r: 1.85 },
    { cx: CX, cy: 6.6, r: 2.05 },
    { cx: CX + 4.2, cy: 7.2, r: 1.85 },
    { cx: CX + 8.5, cy: 7.8, r: 1.85 },
  ],
  lines: [footLine(13.2), hline(5.0, 22.3), hline(9.6, 14.9)],
}

// ── 킹 — 왕관 띠 + 십자. 가장 높다 ───────────────────
const KING = {
  body: lathe([
    ...foot(13.8),
    [8.8, 34.2], [6.2, 29.8], [4.8, 25.4],
    [4.5, 22.6, S], [6.2, 21.3, S], [4.5, 19.9, S],
    [7.0, 17.6], [9.4, 15.2], [10.2, 13.6, S],
    [0, 13.6, S],
  ]),
  crown: mirrorPoly([
    [10.2, 13.8], [9.2, 9.4], [6.6, 12.4], [4.0, 8.8], [2.0, 12.4], [0, 8.4],
  ]),
  cross: 'M20.9 1.6h3.2v2.8h3.6v3.3h-3.6v3.6h-3.2V7.7h-3.6V4.4h3.6z',
  lines: [footLine(13.8), hline(5.2, 21.3), hline(10.2, 13.6)],
}

// ── 나이트 — 유일한 비대칭 기물. 왼쪽을 보는 말머리 ──
const KNIGHT = {
  body: lathe([
    ...foot(12.4),
    [8.4, 34.2], [7.4, 32.6, S],
    [9.0, 31.4, S], [9.0, 30.2, S],
    [0, 30.2, S],
  ]),
  head: closedCurve([
    [30.2, 30.8, S],                                  // 가슴 뒤쪽
    [30.9, 26.2], [31.3, 21.4],                       // 목덜미
    [31.5, 17.2], [29.9, 15.2], [30.5, 12.0],         // 갈기(두 단)
    [29.9, 10.0, S], [28.8, 6.2, S], [27.3, 10.2, S], // 뒤쪽 귀
    [26.1, 11.2, S],                                  // 귀 사이 골
    [24.9, 7.6, S], [23.0, 12.0, S],                  // 앞쪽 귀
    [20.0, 12.4], [16.8, 13.4], [13.5, 15.4], [11.3, 17.6], // 이마→콧대
    [10.3, 19.4], [11.6, 21.3], [14.2, 21.8],         // 코끝→입
    [17.5, 22.0], [20.5, 23.0], [22.5, 26.0], [23.7, 30.8, S], // 턱→목→가슴
  ]),
  eye: { cx: 17.6, cy: 14.8, r: 1.0 },
  lines: [
    footLine(12.4),
    'M11.7 20.8C12.7 20.4 13.5 20.4 14.1 20.6',  // 입선
    'M30.8 17.4C28.6 16.0 26.4 14.2 24.8 12.0',  // 갈기 안쪽선
  ],
}

const SHAPES = { K: KING, Q: QUEEN, R: ROOK, B: BISHOP, N: KNIGHT, P: PAWN }

// 백 = 아이보리 + 진한 갈색 외곽선 / 흑 = 흑단 + 검정 외곽선
const SKIN = {
  white: { stops: [['0', '#FFFDF6'], ['0.5', '#F2E4C9'], ['1', '#D8BE95']], stroke: '#4B301C', eye: '#4B301C' },
  black: { stops: [['0', '#63636E'], ['0.42', '#2C2C34'], ['1', '#0F0F14']], stroke: '#08080B', eye: '#D8C9A8' },
}

/**
 * 체스 기물 하나.
 * @param piece 'K','Q','R','B','N','P'(백) / 소문자(흑)
 * @param size  픽셀 크기 (한 칸 크기와 비슷하게 주면 된다)
 */
export default function ChessPiece({ piece, size = 40 }) {
  const uid = useId() // 훅은 early return보다 앞에서 호출해야 한다
  if (!piece) return null
  const key = piece.toUpperCase()
  const shape = SHAPES[key]
  if (!shape) return null

  const isWhite = piece === key
  const skin = isWhite ? SKIN.white : SKIN.black
  // 한 판에 기물이 32개 놓이므로 그라디언트 id가 겹치면 안 된다.
  // useId()는 ':'를 포함할 수 있고 그러면 url(#..) 참조가 불안정해서 떼어낸다.
  const gid = `cpg-${key}${isWhite ? 'w' : 'b'}-${uid.replace(/:/g, '')}`
  // 작게 그릴 때(잡은 말 목록 등) 외곽선이 0.5px 밑으로 얇아져 뭉개지므로 굵힌다
  const sw = size < 26 ? 1.9 : 1.15

  const solids = []
  for (const k of ['body', 'top', 'coronet', 'crown', 'cross', 'head']) {
    if (shape[k]) solids.push(<path key={k} d={shape[k]} />)
  }
  if (shape.ball) solids.push(<circle key="ball" cx={shape.ball.cx} cy={shape.ball.cy} r={shape.ball.r} />)
  if (shape.balls) shape.balls.forEach((b, i) => solids.push(<circle key={`b${i}`} cx={b.cx} cy={b.cy} r={b.r} />))

  return (
    <svg viewBox="0 0 45 45" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0.2" y1="0.02" x2="0.85" y2="1">
          {skin.stops.map(([off, col]) => <stop key={off} offset={off} stopColor={col} />)}
        </linearGradient>
      </defs>

      {/* 판에 놓인 무게감 */}
      <ellipse cx="22.5" cy="41.9" rx="14.6" ry="2.2" fill="#000" opacity="0.24" />

      <g fill={`url(#${gid})`} stroke={skin.stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
        {solids}
      </g>

      {/* 깎아낸 단·슬릿 같은 디테일 */}
      {shape.slit && (
        <path d={shape.slit} fill="none" stroke={skin.stroke} strokeWidth={sw * 1.5} strokeLinecap="round" />
      )}
      {shape.lines?.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={skin.stroke} strokeWidth={sw * 0.78} strokeLinecap="round" opacity="0.75" />
      ))}
      {shape.eye && (
        <circle cx={shape.eye.cx} cy={shape.eye.cy} r={shape.eye.r} fill={skin.eye} />
      )}
    </svg>
  )
}
