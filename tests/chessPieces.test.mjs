// 체스 기물 SVG 회귀 테스트
//
// 기물 모양은 lathe()가 프로필 점 배열을 베지어로 계산해서 만든다. 숫자 하나만
// 잘못 들어가도 path에 NaN이 섞여 기물이 화면에서 사라지는데, 빌드도 통과하고
// 콘솔 에러도 안 난다. 그래서 실제로 렌더해서 검사한다.
//
// 실행: node --import ./tests/smokeRender.register.mjs tests/chessPieces.test.mjs

import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import ChessPiece from '../src/components/ChessPieces.jsx'

let pass = 0, fail = 0
function assert(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} :: ${detail}`) }
}

const WHITE = ['K', 'Q', 'R', 'B', 'N', 'P']
const ALL = [...WHITE, ...WHITE.map(p => p.toLowerCase())]

const html = {}
for (const p of ALL) html[p] = renderToStaticMarkup(createElement(ChessPiece, { piece: p, size: 44 }))

console.log('\n[Test 1] 12기물 모두 렌더된다')
for (const p of ALL) {
  assert(`${p} 렌더`, html[p].length > 200 && html[p].includes('<path'), `길이=${html[p].length}`)
}

console.log('\n[Test 2] path에 NaN/Infinity/undefined가 없다')
for (const p of ALL) {
  assert(`${p} 좌표 정상`, !/NaN|Infinity|undefined/.test(html[p]),
    (html[p].match(/.{0,30}(NaN|Infinity|undefined).{0,30}/) || [''])[0])
}

console.log('\n[Test 3] 6종 실루엣이 서로 다르다 (복붙 사고 방지)')
{
  const bodies = WHITE.map(p => (html[p].match(/d="M[^"]+"/) || [''])[0])
  const uniq = new Set(bodies)
  assert('본체 path 6종 모두 다름', uniq.size === 6, `서로 다른 개수=${uniq.size}`)
}

console.log('\n[Test 4] 흑/백은 색만 다르고 기하는 같다')
{
  // 색(그라디언트 stop 위치·외곽선)은 흑백이 다르게 설계돼 있으므로
  // 도형 좌표만 뽑아서 비교한다.
  const geom = s => [
    ...(s.match(/ d="[^"]+"/g) || []),
    ...(s.match(/ c[xy]="[-\d.]+"/g) || []),
    ...(s.match(/ r="[-\d.]+"/g) || []),
  ].join('|')
  for (const p of WHITE) {
    const a = geom(html[p]), b = geom(html[p.toLowerCase()])
    assert(`${p} 기하 동일`, a === b && a.length > 50, `백 ${a.length}자 vs 흑 ${b.length}자`)
  }
}

console.log('\n[Test 5] 잘못된 입력은 아무것도 그리지 않는다')
for (const bad of [null, undefined, '', 'X', 'zz']) {
  const out = renderToStaticMarkup(createElement(ChessPiece, { piece: bad, size: 44 }))
  assert(`piece=${JSON.stringify(bad)} → 빈 출력`, out === '', out.slice(0, 60))
}

console.log('\n[Test 6] 한 판(32개)에서 그라디언트 id가 겹치지 않는다')
{
  // 같은 id가 두 번 나오면 브라우저가 첫 번째만 참조한다. 지금은 내용이 같아서
  // 눈에 안 보이지만, 나중에 기물별로 색을 달리하면 조용히 깨진다.
  const board = createElement('div', null,
    ...Array.from({ length: 32 }, (_, i) =>
      createElement(ChessPiece, { key: i, piece: ALL[i % ALL.length], size: 44 })))
  const out = renderToStaticMarkup(board)
  const ids = out.match(/id="cpg-[^"]+"/g) || []
  assert('그라디언트 32개', ids.length === 32, `개수=${ids.length}`)
  assert('id 전부 유일', new Set(ids).size === ids.length,
    `유일=${new Set(ids).size}/${ids.length}`)
  assert('id에 콜론 없음', !ids.some(i => i.includes(':')), ids.find(i => i.includes(':')) || '')
}

console.log('\n[Test 7] 작게 그리면 외곽선을 굵힌다')
{
  const small = renderToStaticMarkup(createElement(ChessPiece, { piece: 'K', size: 18 }))
  const big = renderToStaticMarkup(createElement(ChessPiece, { piece: 'K', size: 44 }))
  const swOf = s => Number((s.match(/stroke-width="([\d.]+)"/) || [])[1])
  assert('18px 외곽선 > 44px 외곽선', swOf(small) > swOf(big), `${swOf(small)} vs ${swOf(big)}`)
}

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`)
process.exit(fail === 0 ? 0 : 1)
