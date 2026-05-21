// 마술 단계별 SVG 일러스트
// svgKey 접두사로 카테고리를 매핑, 세부 키로 동작 표시
//
// 베이스: card, coin, rope/rubber, knot, ropes, paper, bill, cup, hand/fist/thumb,
//         envelope, memo, book, balloon, pen, brain (think/math/answer), letter,
//         country
//
// 사용:
//   <MagicSvg svgKey="card-fan" size={120} />

export default function MagicSvg({ svgKey, size = 110 }) {
  const k = svgKey || ''
  const sz = size
  // 카테고리 매칭
  if (k.startsWith('card')) return <CardSvg svgKey={k} size={sz} />
  if (k.startsWith('coin')) return <CoinSvg svgKey={k} size={sz} />
  if (k.startsWith('cup')) return <CupSvg svgKey={k} size={sz} />
  if (k.startsWith('rope') || k.startsWith('ropes')) return <RopeSvg svgKey={k} size={sz} />
  if (k.startsWith('rubber')) return <RubberSvg svgKey={k} size={sz} />
  if (k.startsWith('knot')) return <KnotSvg svgKey={k} size={sz} />
  if (k.startsWith('paper')) return <PaperSvg svgKey={k} size={sz} />
  if (k.startsWith('bill')) return <BillSvg svgKey={k} size={sz} />
  if (k.startsWith('envelope')) return <EnvelopeSvg svgKey={k} size={sz} />
  if (k.startsWith('memo')) return <MemoSvg svgKey={k} size={sz} />
  if (k.startsWith('book')) return <BookSvg svgKey={k} size={sz} />
  if (k.startsWith('balloon')) return <BalloonSvg svgKey={k} size={sz} />
  if (k.startsWith('pen')) return <PenSvg svgKey={k} size={sz} />
  if (k.startsWith('thumb') || k.startsWith('fist') || k.startsWith('hand')) return <HandSvg svgKey={k} size={sz} />
  if (k.startsWith('think') || k.startsWith('math') || k.startsWith('answer') || k.startsWith('subtract') || k.startsWith('add') || k.startsWith('write')) return <BrainSvg svgKey={k} size={sz} />
  if (k.startsWith('letter')) return <LetterSvg svgKey={k} size={sz} />
  if (k.startsWith('country') || k.startsWith('denmark') || k.startsWith('color')) return <FlagSvg svgKey={k} size={sz} />
  if (k.startsWith('tap') || k.startsWith('count') || k.startsWith('point') || k.startsWith('red')) return <PointSvg svgKey={k} size={sz} />
  // 기본
  return <DefaultSvg svgKey={k} size={sz} />
}

// 라벨 표시용 (svgKey에서 액션 추출)
function actionLabel(key) {
  const map = {
    'fan': '펼치기',
    'rows3': '3줄',
    'point-row': '줄 지목',
    'stack-middle': '가운데',
    'repeat3': '3번 반복',
    'pull-11': '11번째',
    'peek-bottom': '맨 아래',
    'take-top': '맨 위',
    'stack-on': '얹기',
    'cut': '자르기',
    'reveal': '공개',
    'double-lift': '더블 리프트',
    'snap': '톡!',
    'show-top': '맨 위',
    'split-color': '색 분리',
    'cut-color': '자르기',
    'pick-top': '위쪽 픽',
    'aces-top': 'A 4장',
    'four-piles': '4묶음',
    'pile-cover': '덮기',
    'flip-all': '뒤집기',
    'aces-reveal': '에이스!',
    'clock': '시계',
    'point-final': '정답!',
  }
  // key가 'card-XXX'면 XXX 부분
  const parts = key.split('-')
  const action = parts.slice(1).join('-')
  return map[action] || ''
}

// ─── 카드 ───
function CardSvg({ svgKey, size }) {
  const label = actionLabel(svgKey)
  // 부채꼴(fan), 3줄(rows3), 시계(clock) 같은 특수 케이스
  if (svgKey === 'card-fan') {
    return (
      <Frame size={size} label={label || '카드 펼치기'} color="#1565C0">
        <g transform="translate(60,60)">
          {[-30, -15, 0, 15, 30].map((deg, i) => (
            <g key={i} transform={`rotate(${deg})`}>
              <rect x="-12" y="-30" width="24" height="40" rx="3" fill="#FFF" stroke="#333" strokeWidth="1.5" />
            </g>
          ))}
        </g>
      </Frame>
    )
  }
  if (svgKey === 'card-rows3') {
    return (
      <Frame size={size} label="3줄로 펼치기" color="#1565C0">
        {[0, 1, 2].map(r => (
          <g key={r} transform={`translate(15,${15 + r * 25})`}>
            {[0, 1, 2, 3, 4, 5, 6].map(c => (
              <rect key={c} x={c * 12} y="0" width="10" height="18" rx="1.5" fill="#FFF" stroke="#333" strokeWidth="1" />
            ))}
          </g>
        ))}
      </Frame>
    )
  }
  if (svgKey === 'card-clock') {
    return (
      <Frame size={size} label="시계 모양" color="#1565C0">
        {Array.from({ length: 12 }).map((_, i) => {
          const ang = (i / 12) * Math.PI * 2 - Math.PI / 2
          const x = 60 + Math.cos(ang) * 35
          const y = 60 + Math.sin(ang) * 35
          return <rect key={i} x={x - 6} y={y - 9} width="12" height="18" rx="2" fill="#FFF" stroke="#333" strokeWidth="1" transform={`rotate(${(i / 12) * 360 + 90} ${x} ${y})`} />
        })}
      </Frame>
    )
  }
  if (svgKey === 'card-four-piles' || svgKey === 'card-pile-cover' || svgKey === 'card-flip-all') {
    return (
      <Frame size={size} label={label} color="#1565C0">
        {[0, 1, 2, 3].map(i => (
          <g key={i} transform={`translate(${10 + i * 22},35)`}>
            <rect x="0" y="0" width="18" height="28" rx="2" fill="#FFF" stroke="#333" strokeWidth="1.5" />
            <rect x="2" y="-3" width="18" height="28" rx="2" fill="#FFF" stroke="#333" strokeWidth="1" />
          </g>
        ))}
      </Frame>
    )
  }
  if (svgKey === 'card-split-color' || svgKey === 'card-cut-color') {
    return (
      <Frame size={size} label="색 분리" color="#1565C0">
        <g transform="translate(30,30)">
          <rect x="0" y="0" width="25" height="35" rx="3" fill="#FFCDD2" stroke="#C62828" strokeWidth="1.5" />
          <text x="12" y="22" textAnchor="middle" fontSize="14" fill="#C62828">♥</text>
        </g>
        <g transform="translate(65,45)">
          <rect x="0" y="0" width="25" height="35" rx="3" fill="#E0E0E0" stroke="#333" strokeWidth="1.5" />
          <text x="12" y="22" textAnchor="middle" fontSize="14" fill="#000">♠</text>
        </g>
      </Frame>
    )
  }
  // 기본 카드 한 장
  return (
    <Frame size={size} label={label || '카드'} color="#1565C0">
      <g transform="translate(45,30)">
        <rect x="0" y="0" width="30" height="45" rx="3" fill="#FFF" stroke="#333" strokeWidth="2" />
        <text x="15" y="28" textAnchor="middle" fontSize="22" fill="#C62828">♥</text>
        <text x="6" y="13" fontSize="10" fill="#C62828">A</text>
      </g>
    </Frame>
  )
}

// ─── 동전 ───
function CoinSvg({ svgKey, size }) {
  if (svgKey === 'coin-two-reveal') {
    return (
      <Frame size={size} label="2개로!" color="#FB8C00">
        <Coin cx={40} cy={60} />
        <Coin cx={75} cy={60} />
        <text x="60" y="100" textAnchor="middle" fontSize="14" fill="#FB8C00" fontWeight="700">+1</text>
      </Frame>
    )
  }
  if (svgKey === 'coin-bent-show' || svgKey === 'coin-bent-hidden') {
    return (
      <Frame size={size} label="휘어진 동전" color="#FB8C00">
        <ellipse cx="60" cy="60" rx="25" ry="10" fill="#FFD54F" stroke="#F57C00" strokeWidth="2" />
        <text x="60" y="64" textAnchor="middle" fontSize="14" fill="#5D4037">₩</text>
      </Frame>
    )
  }
  return (
    <Frame size={size} label="동전" color="#FB8C00">
      <Coin cx={60} cy={60} />
    </Frame>
  )
}

function Coin({ cx, cy }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="20" fill="#FFD54F" stroke="#F57C00" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="14" fill="none" stroke="#F57C00" strokeWidth="1" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="14" fill="#5D4037" fontWeight="700">₩</text>
    </g>
  )
}

// ─── 컵 ───
function CupSvg({ svgKey, size }) {
  if (svgKey === 'cup-gone') {
    return (
      <Frame size={size} label="사라짐!" color="#7E57C2">
        <text x="60" y="65" textAnchor="middle" fontSize="36">💨</text>
      </Frame>
    )
  }
  return (
    <Frame size={size} label="컵" color="#7E57C2">
      <path d="M 35 35 L 85 35 L 80 85 Q 60 95 40 85 Z" fill="#FFCC80" stroke="#5D4037" strokeWidth="2" />
      <ellipse cx="60" cy="35" rx="25" ry="6" fill="#FFE0B2" stroke="#5D4037" strokeWidth="2" />
    </Frame>
  )
}

// ─── 끈 ───
function RopeSvg({ svgKey, size }) {
  if (svgKey === 'rope-fake-cut' || svgKey === 'rope-show-cut') {
    return (
      <Frame size={size} label="자르기" color="#8D6E63">
        <path d="M 15 60 Q 40 50 50 60" stroke="#A1887F" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M 70 60 Q 90 70 105 60" stroke="#A1887F" strokeWidth="6" fill="none" strokeLinecap="round" />
        <text x="60" y="66" textAnchor="middle" fontSize="20">✂️</text>
      </Frame>
    )
  }
  if (svgKey === 'rope-restore') {
    return (
      <Frame size={size} label="다시 하나!" color="#8D6E63">
        <path d="M 15 60 Q 60 45 105 60" stroke="#A1887F" strokeWidth="6" fill="none" strokeLinecap="round" />
        <text x="60" y="95" textAnchor="middle" fontSize="18">✨</text>
      </Frame>
    )
  }
  if (svgKey === 'ropes-3-different' || svgKey === 'ropes-equal' || svgKey === 'ropes-grip') {
    return (
      <Frame size={size} label={svgKey === 'ropes-equal' ? '같은 길이!' : '3개 끈'} color="#8D6E63">
        <line x1="15" y1="40" x2={svgKey === 'ropes-equal' ? '105' : '40'} y2="40" stroke="#A1887F" strokeWidth="5" strokeLinecap="round" />
        <line x1="15" y1="60" x2={svgKey === 'ropes-equal' ? '105' : '70'} y2="60" stroke="#A1887F" strokeWidth="5" strokeLinecap="round" />
        <line x1="15" y1="80" x2="105" y2="80" stroke="#A1887F" strokeWidth="5" strokeLinecap="round" />
      </Frame>
    )
  }
  return (
    <Frame size={size} label="끈" color="#8D6E63">
      <path d="M 15 60 Q 60 30 105 60" stroke="#A1887F" strokeWidth="6" fill="none" strokeLinecap="round" />
    </Frame>
  )
}

// ─── 고무줄 ───
function RubberSvg({ svgKey, size }) {
  if (svgKey === 'rubber-jumped' || svgKey === 'rubber-on-fingers' || svgKey === 'rubber-fist-pull') {
    return (
      <Frame size={size} label="고무줄" color="#E91E63">
        <text x="60" y="55" textAnchor="middle" fontSize="32">✋</text>
        <ellipse cx="60" cy="55" rx="22" ry="6" fill="none" stroke="#E91E63" strokeWidth="3" />
      </Frame>
    )
  }
  return (
    <Frame size={size} label="고무줄" color="#E91E63">
      <ellipse cx="60" cy="60" rx="30" ry="10" fill="none" stroke="#E91E63" strokeWidth="3" />
    </Frame>
  )
}

// ─── 매듭 ───
function KnotSvg({ svgKey, size }) {
  if (svgKey === 'knot-untied') {
    return (
      <Frame size={size} label="풀림!" color="#8D6E63">
        <path d="M 15 60 Q 60 50 105 60" stroke="#A1887F" strokeWidth="5" fill="none" strokeLinecap="round" />
        <text x="60" y="95" textAnchor="middle" fontSize="14" fill="#8D6E63">✓</text>
      </Frame>
    )
  }
  return (
    <Frame size={size} label="매듭" color="#8D6E63">
      <path d="M 15 60 L 40 60 Q 50 50 60 60 Q 70 70 80 60 L 105 60" stroke="#A1887F" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="60" r="8" fill="none" stroke="#5D4037" strokeWidth="2" />
    </Frame>
  )
}

// ─── 종이 ───
function PaperSvg({ svgKey, size }) {
  if (svgKey === 'paper-tear') {
    return (
      <Frame size={size} label="찢기" color="#43A047">
        <g transform="translate(30,30)">
          <path d="M 0 0 L 25 0 L 28 30 L 22 60 L 0 60 Z" fill="#FFF" stroke="#333" strokeWidth="1.5" />
          <path d="M 30 0 L 60 0 L 60 60 L 32 60 L 35 30 Z" fill="#FFF" stroke="#333" strokeWidth="1.5" />
        </g>
      </Frame>
    )
  }
  if (svgKey === 'paper-restore') {
    return (
      <Frame size={size} label="복구!" color="#43A047">
        <rect x="35" y="30" width="50" height="60" rx="2" fill="#FFF" stroke="#333" strokeWidth="2" />
        <text x="60" y="105" textAnchor="middle" fontSize="14">✨</text>
      </Frame>
    )
  }
  if (svgKey === 'paper-float') {
    return (
      <Frame size={size} label="떠올라요" color="#43A047">
        <rect x="40" y="40" width="40" height="30" rx="2" fill="#FFF" stroke="#333" strokeWidth="1" transform="rotate(-15 60 55)" />
        <text x="60" y="95" textAnchor="middle" fontSize="14" fill="#43A047">⬆</text>
      </Frame>
    )
  }
  return (
    <Frame size={size} label="종이" color="#43A047">
      <rect x="35" y="30" width="50" height="60" rx="2" fill="#FFF" stroke="#333" strokeWidth="2" />
      <line x1="42" y1="45" x2="78" y2="45" stroke="#BBB" strokeWidth="1" />
      <line x1="42" y1="55" x2="78" y2="55" stroke="#BBB" strokeWidth="1" />
      <line x1="42" y1="65" x2="70" y2="65" stroke="#BBB" strokeWidth="1" />
    </Frame>
  )
}

// ─── 지폐 ───
function BillSvg({ svgKey, size }) {
  return (
    <Frame size={size} label={svgKey === 'bill-intact' ? '멀쩡!' : '지폐'} color="#43A047"
    >
      <rect x="20" y="45" width="80" height="35" rx="3" fill="#C8E6C9" stroke="#2E7D32" strokeWidth="2" />
      <circle cx="60" cy="62.5" r="10" fill="none" stroke="#2E7D32" strokeWidth="1" />
      <text x="60" y="67" textAnchor="middle" fontSize="11" fill="#2E7D32" fontWeight="700">₩</text>
    </Frame>
  )
}

// ─── 봉투 ───
function EnvelopeSvg({ svgKey, size }) {
  if (svgKey === 'envelope-reveal') {
    return (
      <Frame size={size} label="열기!" color="#FB8C00">
        <path d="M 25 45 L 95 45 L 95 90 L 25 90 Z" fill="#FFE0B2" stroke="#5D4037" strokeWidth="2" />
        <path d="M 25 45 L 60 25 L 95 45" fill="#FFCC80" stroke="#5D4037" strokeWidth="2" />
        <rect x="40" y="50" width="40" height="30" fill="#FFF" stroke="#333" strokeWidth="1" />
        <text x="60" y="70" textAnchor="middle" fontSize="12" fill="#333" fontWeight="700">!</text>
      </Frame>
    )
  }
  if (svgKey === 'envelope-1089') {
    return (
      <Frame size={size} label="1089" color="#FB8C00">
        <path d="M 25 45 L 95 45 L 95 90 L 25 90 Z" fill="#FFE0B2" stroke="#5D4037" strokeWidth="2" />
        <path d="M 25 45 L 60 30 L 95 45" fill="#FFCC80" stroke="#5D4037" strokeWidth="2" />
        <text x="60" y="73" textAnchor="middle" fontSize="14" fill="#5D4037" fontWeight="700">1089</text>
      </Frame>
    )
  }
  return (
    <Frame size={size} label="봉투" color="#FB8C00">
      <path d="M 25 45 L 95 45 L 95 90 L 25 90 Z" fill="#FFE0B2" stroke="#5D4037" strokeWidth="2" />
      <path d="M 25 45 L 60 70 L 95 45" fill="none" stroke="#5D4037" strokeWidth="2" />
    </Frame>
  )
}

// ─── 메모 ───
function MemoSvg({ svgKey, size }) {
  if (svgKey === 'memo-red') {
    return (
      <Frame size={size} label="빨강 예측" color="#C62828">
        <rect x="30" y="30" width="60" height="60" rx="2" fill="#FFF" stroke="#333" strokeWidth="1.5" />
        <text x="60" y="68" textAnchor="middle" fontSize="20" fill="#C62828" fontWeight="700">빨강</text>
      </Frame>
    )
  }
  return (
    <Frame size={size} label="메모" color="#FB8C00">
      <rect x="30" y="30" width="60" height="60" rx="2" fill="#FFFDE7" stroke="#FB8C00" strokeWidth="1.5" />
      <line x1="38" y1="45" x2="82" y2="45" stroke="#FB8C00" strokeWidth="1" />
      <line x1="38" y1="55" x2="82" y2="55" stroke="#FB8C00" strokeWidth="1" />
      <line x1="38" y1="65" x2="75" y2="65" stroke="#FB8C00" strokeWidth="1" />
    </Frame>
  )
}

// ─── 책 ───
function BookSvg({ svgKey, size }) {
  if (svgKey === 'book-open' || svgKey === 'book-reveal') {
    return (
      <Frame size={size} label={svgKey === 'book-reveal' ? '단어 일치!' : '펼친 책'} color="#5E35B2">
        <path d="M 25 35 L 60 30 L 60 90 L 25 95 Z" fill="#EDE7F6" stroke="#5E35B2" strokeWidth="2" />
        <path d="M 60 30 L 95 35 L 95 95 L 60 90 Z" fill="#EDE7F6" stroke="#5E35B2" strokeWidth="2" />
        <line x1="32" y1="45" x2="55" y2="42" stroke="#9575CD" strokeWidth="1" />
        <line x1="32" y1="55" x2="55" y2="52" stroke="#9575CD" strokeWidth="1" />
        <line x1="65" y1="42" x2="88" y2="45" stroke="#9575CD" strokeWidth="1" />
      </Frame>
    )
  }
  return (
    <Frame size={size} label="책" color="#5E35B2">
      <rect x="35" y="30" width="50" height="60" rx="3" fill="#EDE7F6" stroke="#5E35B2" strokeWidth="2" />
      <text x="60" y="65" textAnchor="middle" fontSize="14" fill="#5E35B2" fontWeight="700">📖</text>
    </Frame>
  )
}

// ─── 풍선 ───
function BalloonSvg({ size }) {
  return (
    <Frame size={size} label="풍선 비비기" color="#E91E63">
      <ellipse cx="60" cy="50" rx="20" ry="25" fill="#FCE4EC" stroke="#E91E63" strokeWidth="2" />
      <path d="M 60 75 L 58 90 L 62 90 Z" fill="#E91E63" />
      <path d="M 60 90 Q 65 100 60 105" stroke="#E91E63" strokeWidth="1.5" fill="none" />
    </Frame>
  )
}

// ─── 펜 ───
function PenSvg({ svgKey, size }) {
  return (
    <Frame size={size} label={svgKey === 'pen-balance' ? '균형!' : '펜'} color="#37474F">
      <g transform="translate(60,55) rotate(20)">
        <rect x="-3" y="-30" width="6" height="50" fill="#37474F" />
        <path d="M -3 20 L 3 20 L 0 28 Z" fill="#37474F" />
        <rect x="-3" y="-30" width="6" height="8" fill="#90A4AE" />
      </g>
    </Frame>
  )
}

// ─── 손 ───
function HandSvg({ svgKey, size }) {
  if (svgKey === 'fist-knock') {
    return <Frame size={size} label="똑똑!" color="#FFB74D"><text x="60" y="75" textAnchor="middle" fontSize="48">👊</text></Frame>
  }
  if (svgKey === 'hand-empty') {
    return <Frame size={size} label="비어있음" color="#FFB74D"><text x="60" y="75" textAnchor="middle" fontSize="48">🖐️</text></Frame>
  }
  if (svgKey === 'hand-up') {
    return <Frame size={size} label="위로!" color="#FFB74D"><text x="60" y="75" textAnchor="middle" fontSize="48">🙌</text></Frame>
  }
  if (svgKey.startsWith('thumb')) {
    return <Frame size={size} label="엄지" color="#FFB74D"><text x="60" y="80" textAnchor="middle" fontSize="48">👍</text></Frame>
  }
  return <Frame size={size} label="손" color="#FFB74D"><text x="60" y="75" textAnchor="middle" fontSize="48">✋</text></Frame>
}

// ─── 뇌/숫자 ───
function BrainSvg({ svgKey, size }) {
  if (svgKey === 'answer-4') {
    return (
      <Frame size={size} label="답: 4" color="#7B1FA2">
        <text x="60" y="80" textAnchor="middle" fontSize="56" fill="#7B1FA2" fontWeight="700">4</text>
      </Frame>
    )
  }
  if (svgKey.startsWith('math')) {
    return (
      <Frame size={size} label="계산" color="#7B1FA2">
        <text x="60" y="75" textAnchor="middle" fontSize="40">🧮</text>
      </Frame>
    )
  }
  if (svgKey.startsWith('write') || svgKey.startsWith('subtract') || svgKey.startsWith('add')) {
    return (
      <Frame size={size} label="적기" color="#7B1FA2">
        <text x="60" y="75" textAnchor="middle" fontSize="40">✏️</text>
      </Frame>
    )
  }
  return (
    <Frame size={size} label="생각" color="#7B1FA2">
      <text x="60" y="75" textAnchor="middle" fontSize="40">🤔</text>
    </Frame>
  )
}

// ─── 알파벳/숫자 ───
function LetterSvg({ size }) {
  return (
    <Frame size={size} label="A B C D..." color="#7B1FA2">
      <text x="60" y="75" textAnchor="middle" fontSize="32" fill="#7B1FA2" fontWeight="700">D</text>
    </Frame>
  )
}

// ─── 국기/색 ───
function FlagSvg({ svgKey, size }) {
  if (svgKey === 'denmark-elephant') {
    return (
      <Frame size={size} label="덴마크 + 코끼리" color="#C62828">
        <rect x="30" y="40" width="60" height="40" fill="#C62828" />
        <rect x="46" y="40" width="6" height="40" fill="#FFF" />
        <rect x="30" y="56" width="60" height="6" fill="#FFF" />
        <text x="60" y="100" textAnchor="middle" fontSize="20">🐘</text>
      </Frame>
    )
  }
  if (svgKey === 'color-options') {
    return (
      <Frame size={size} label="색 4가지" color="#C62828">
        <circle cx="40" cy="50" r="10" fill="#C62828" />
        <circle cx="60" cy="50" r="10" fill="#1976D2" />
        <circle cx="80" cy="50" r="10" fill="#FBC02D" />
        <circle cx="60" cy="75" r="10" fill="#388E3C" />
      </Frame>
    )
  }
  if (svgKey === 'red-hint') {
    return (
      <Frame size={size} label="🍎 빨강 힌트" color="#C62828">
        <text x="60" y="80" textAnchor="middle" fontSize="48">🍎</text>
      </Frame>
    )
  }
  return (
    <Frame size={size} label="국가" color="#C62828">
      <rect x="35" y="40" width="50" height="40" fill="#C62828" stroke="#333" strokeWidth="1" />
    </Frame>
  )
}

// ─── 지목 ───
function PointSvg({ svgKey, size }) {
  if (svgKey === 'tap-clock') {
    return <Frame size={size} label="시계 두드림" color="#FB8C00"><text x="60" y="75" textAnchor="middle" fontSize="44">🕐</text></Frame>
  }
  return <Frame size={size} label="가리키기" color="#FB8C00"><text x="60" y="75" textAnchor="middle" fontSize="40">👉</text></Frame>
}

// ─── 기본 ───
function DefaultSvg({ svgKey, size }) {
  return (
    <Frame size={size} label={svgKey} color="#999">
      <text x="60" y="75" textAnchor="middle" fontSize="40">✨</text>
    </Frame>
  )
}

// ─── 공통 프레임 ───
function Frame({ size, label, color, children }) {
  return (
    <div style={{ display: 'inline-block', textAlign: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 120 120"
        style={{ background: '#FAFAFA', borderRadius: 10, border: `2px solid ${color}` }}>
        {children}
      </svg>
      {label && (
        <div style={{ fontSize: 10, color, marginTop: 2, fontWeight: 700 }}>{label}</div>
      )}
    </div>
  )
}
