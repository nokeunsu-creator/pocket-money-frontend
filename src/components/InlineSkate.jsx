// 🛼 인라인 스케이트 초보 강좌
import { useState } from 'react'

const PAGE_BG = '#F0FBFF'
const ACCENT = '#00B4D8'
const SOFT = '#CDEEFD'

const LESSONS = [
  {
    id: 0,
    emoji: '🎒',
    title: '0. 시작하기 전',
    color: '#48CAE4',
    body: [
      '먼저, 인라인은 **연습장·자전거 도로·공원 평지** 같은 안전한 장소에서 시작해야 해요.',
      '도로·언덕·자갈길은 절대 금지! 처음엔 평평하고 사람이 적은 곳에서 천천히.',
      '땀이 잘 식는 옷, 발목을 덮는 양말이 좋아요.',
    ],
  },
  {
    id: 1,
    emoji: '🪖',
    title: '1. 장비 준비 — 안전 4종',
    color: '#0096C7',
    body: [
      '**헬멧 ✅** — 가장 중요. 머리는 절대 다치면 안 돼요.',
      '**손목 보호대 ✅** — 넘어질 때 손바닥을 가장 먼저 짚어요. 손목 보호 필수.',
      '**무릎 보호대 ✅** — 초보는 100% 무릎으로 넘어집니다.',
      '**팔꿈치 보호대 ✅** — 옆으로 넘어졌을 때 가장 먼저 닿아요.',
      '💡 인라인보다 보호대를 먼저 신어요. 보호대 안 차고 타지 말기!',
    ],
  },
  {
    id: 2,
    emoji: '👟',
    title: '2. 신발 신기 + 첫 자세',
    color: '#00B4D8',
    body: [
      '발이 안에서 흔들리지 않게 끈을 **꽉** 매요. 발목 부분이 특히 단단해야 해요.',
      '신발이 헐거우면 발목이 휘청거려서 더 잘 넘어져요.',
      '서면 자연스럽게 **두 발이 V자(앞이 좁고 뒤가 넓은 모양)** 가 돼야 안정적.',
      '💡 무릎을 살짝 굽히고, 엉덩이를 살짝 뒤로 빼요. "스키 자세"와 비슷.',
    ],
  },
  {
    id: 3,
    emoji: '🧍',
    title: '3. 안 넘어지는 자세 (A자 자세)',
    color: '#0077B6',
    body: [
      '두 발을 어깨너비로 벌리고 **앞쪽이 가까워지는 A자**로 서요.',
      '무릎을 굽혀서 무게중심을 낮추기 — **앉는 것처럼**.',
      '시선은 발끝이 아니라 **앞 5미터**를 봐요. 발만 보면 균형 잃어요.',
      '팔은 양옆으로 살짝 벌려서 균형 잡아요 (비행기 자세).',
      '💡 이 자세만 익혀도 안 넘어집니다. 처음 30분은 그냥 서있기 연습!',
    ],
  },
  {
    id: 4,
    emoji: '🛟',
    title: '4. 안전하게 넘어지는 법',
    color: '#0096C7',
    body: [
      '넘어질 거 같으면 **앞으로** 넘어져요. 뒤로 넘어지면 머리·꼬리뼈 위험!',
      '앞으로 넘어질 땐: **무릎부터 → 손바닥** 순서로 닿게.',
      '손목 보호대가 미끄러져서 충격을 분산시켜줘요.',
      '뒤로 균형 잃을 거 같으면, **재빨리 무릎을 굽혀 앉아버려요**.',
      '💡 일부러 5번만 안전하게 넘어져보면 두려움이 확 줄어요!',
    ],
  },
  {
    id: 5,
    emoji: '🚶',
    title: '5. 한 걸음씩 걷기',
    color: '#48CAE4',
    body: [
      '잔디 위나 매트 위에서 **걷기**부터 연습해요. 바퀴가 안 굴러서 안전.',
      '걸을 때도 발을 **V자**로 디뎌요. 일자로 디디면 발이 미끄러져요.',
      '익숙해지면 평지로 옮겨서 천천히 걸어요.',
      '💡 처음엔 손잡고 같이 걸어주면 좋아요. 의자나 벽을 짚어도 OK.',
    ],
  },
  {
    id: 6,
    emoji: '➡️',
    title: '6. 직진 (스트라이드)',
    color: '#00B4D8',
    body: [
      '인라인은 **앞으로 미는 게 아니라 옆으로 밀어요!**',
      '오른발을 비스듬히 옆으로 밀고 → 왼발로 미끄러져요.',
      '그 다음 왼발을 비스듬히 옆으로 밀고 → 오른발로 미끄러져요.',
      '한 번 밀고 → 두 발 모으고 미끄러지기 → 또 밀기, 이렇게 반복.',
      '💡 처음엔 5미터만 미끄러져도 성공! 점점 늘려요.',
    ],
  },
  {
    id: 7,
    emoji: '🛑',
    title: '7. 멈추는 법 (가장 중요!)',
    color: '#023E8A',
    body: [
      '**T자 브레이크** (가장 쉬워요)',
      '오른발을 앞으로 쭉 → 왼발을 뒤에 **T자**로 놓고 바퀴를 바닥에 끌어요.',
      '체중을 앞발에 두고, 뒷발 바퀴가 마찰로 속도를 줄여요.',
      '',
      '**힐 브레이크** (인라인 뒤축에 고무가 있을 때)',
      '한쪽 발을 앞으로 내밀고 발끝을 들면 뒤축 고무가 바닥에 닿아 멈춰요.',
      '💡 멈추는 법을 못 익히면 위험해요. 천천히 굴러가는 상태에서 100번 연습!',
    ],
  },
  {
    id: 8,
    emoji: '↩️',
    title: '8. 방향 전환',
    color: '#0077B6',
    body: [
      '몸의 무게중심을 **돌고 싶은 방향**으로 살짝 기울이면 자연스럽게 돌아요.',
      '오른쪽으로 돌고 싶으면 오른쪽 어깨를 살짝 내리고, 시선도 오른쪽으로.',
      '급하게 돌면 바퀴가 미끄러져요. 큰 원을 그리듯 천천히.',
      '💡 처음엔 큰 8자를 그려본다는 느낌으로 연습!',
    ],
  },
  {
    id: 9,
    emoji: '💡',
    title: '9. 자주 묻는 질문',
    color: '#0096C7',
    body: [
      '**Q. 얼마나 연습하면 잘 타요?**',
      'A. 매일 30분씩 1~2주면 안 넘어지고 직진 가능, 1달이면 자유롭게.',
      '',
      '**Q. 처음에 어디서 사요?**',
      'A. 다이소·중고는 비추(바퀴 헐거움). 데카트론·롤러블레이드 같은 중급 브랜드를 추천. 어린이는 사이즈 조절형으로!',
      '',
      '**Q. 인라인 vs 롤러스케이트?**',
      'A. 인라인이 속도·방향 전환에 유리. 처음엔 인라인 추천.',
      '',
      '**Q. 추천 연습 장소?**',
      'A. 한강공원 자전거 도로, 동네 큰 공원, 학교 운동장 (사람 없는 시간).',
    ],
  },
]

export default function InlineSkate({ onBack }) {
  const [openId, setOpenId] = useState(0)

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: PAGE_BG, padding: '1rem' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, maxWidth: 480, margin: '0 auto 20px' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555', padding: '4px 8px' }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#023E8A' }}>🛼 인라인 스케이트</div>
          <div style={{ fontSize: 12, color: '#5B9BB5', marginTop: 2 }}>초보 강좌 · 10단계</div>
        </div>
      </div>

      {/* 인트로 카드 */}
      <div style={{ maxWidth: 480, margin: '0 auto 16px' }}>
        <div style={{
          padding: 16, borderRadius: 16,
          background: `linear-gradient(135deg, ${ACCENT}, #48CAE4)`,
          color: '#FFF',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🛼</div>
          <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.4 }}>
            처음 인라인 타는 사람을 위한<br/>아주 친절한 가이드
          </div>
          <div style={{ fontSize: 12, marginTop: 6, opacity: 0.95, lineHeight: 1.5 }}>
            보호대만 잘 차면 절대 안 다쳐요!<br/>
            천천히, 단계별로 따라하면 누구나 탈 수 있어요 ✨
          </div>
        </div>
      </div>

      {/* 강의 목록 */}
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {LESSONS.map(lesson => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            open={openId === lesson.id}
            onToggle={() => setOpenId(openId === lesson.id ? -1 : lesson.id)}
          />
        ))}
      </div>

      {/* 마무리 */}
      <div style={{ maxWidth: 480, margin: '20px auto 0' }}>
        <div style={{
          padding: 14, borderRadius: 12, background: '#FFF',
          border: `1px solid ${SOFT}`,
          textAlign: 'center', fontSize: 13, color: '#5B9BB5', lineHeight: 1.6,
        }}>
          🌟 <b>가장 중요한 건 안전!</b><br/>
          보호대 4종 꼭 차고, 절대 도로에서 타지 마세요.<br/>
          매일 조금씩, 즐겁게 연습해요 🛼
        </div>
      </div>
    </div>
  )
}

function LessonCard({ lesson, open, onToggle }) {
  return (
    <div style={{
      borderRadius: 14,
      background: '#FFF',
      border: `1px solid ${SOFT}`,
      overflow: 'hidden',
      boxShadow: open ? '0 4px 14px rgba(0,180,216,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.2s',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '14px 16px',
          background: open ? `${lesson.color}15` : '#FFF',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 22, width: 38, height: 38, borderRadius: 10,
          background: `${lesson.color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {lesson.emoji}
        </span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#023E8A', lineHeight: 1.4 }}>
          {lesson.title}
        </span>
        <span style={{ fontSize: 13, color: '#5B9BB5', flexShrink: 0 }}>
          {open ? '▼' : '▶'}
        </span>
      </button>
      {open && (
        <div style={{
          padding: '4px 16px 16px',
          fontSize: 14, lineHeight: 1.7, color: '#2C3E50',
        }}>
          {lesson.body.map((line, i) => (
            <p key={i} style={{ margin: line === '' ? '8px 0 0' : '6px 0' }}>
              {renderMarkdown(line)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// **bold** 간단 렌더링
function renderMarkdown(text) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <b key={i} style={{ color: '#023E8A' }}>{part.slice(2, -2)}</b>
    }
    return <span key={i}>{part}</span>
  })
}
