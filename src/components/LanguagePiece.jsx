// 언어의 조각 — 입구 (모드 선택)
//   1) 단일 기기 패스앤플레이 → LanguagePieceLocal
//   2) 온라인 2인 (host=P1, guest=P2) → LanguagePieceOnline

import { useState } from 'react'
import LanguagePieceLocal from './LanguagePieceLocal'
import LanguagePieceOnline from './LanguagePieceOnline'

export default function LanguagePiece({ onBack }) {
  const [mode, setMode] = useState(null)

  if (mode === 'local') return <LanguagePieceLocal onBack={() => setMode(null)} />
  if (mode === 'online') return <LanguagePieceOnline onBack={() => setMode(null)} />

  return (
    <div className="fade-in" style={{ maxWidth: 460, margin: '0 auto', padding: '1rem' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
        ← 돌아가기
      </button>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 60, marginBottom: 4 }}>🔤</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #7E57C2, #E63946)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          언어의 조각
        </h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>한글 자모 워들 · 모드 선택</p>
      </div>

      <ModeCard
        icon="📱"
        title="단일 기기 패스앤플레이"
        desc="폰 1대로 두 사람이 번갈아. 라운드마다 폰을 넘기며 진행. 결과 보지 말기 안내 자동."
        color="#7E57C2"
        onClick={() => setMode('local')}
      />
      <ModeCard
        icon="🌐"
        title="온라인 2인"
        desc="방장이 코드 만들고 친구가 코드 입력해 입장. 본인 결과는 위치별 색상으로, 상대는 색상별 개수만 보임."
        color="#3A7BD5"
        onClick={() => setMode('online')}
      />
    </div>
  )
}

function ModeCard({ icon, title, desc, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', gap: 14, padding: 16,
      background: '#fff', border: `2px solid ${color}33`, borderRadius: 14,
      marginBottom: 12, alignItems: 'flex-start',
      width: '100%', textAlign: 'left', cursor: 'pointer',
      boxShadow: `0 2px 6px ${color}22`,
    }}>
      <div style={{ fontSize: 36, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </button>
  )
}
