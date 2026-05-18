// 망각의 지뢰 — 입구 (모드 선택)
//   1) 단일 기기 패스앤플레이 → MineMemoryLocal
//   2) 3대 온라인 (딜러 + 플레이어 2명) → MineMemoryOnline

import { useState } from 'react'
import MineMemoryLocal from './MineMemoryLocal'
import MineMemoryOnline from './MineMemoryOnline'

export default function MineMemory({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'local' | 'online'

  if (mode === 'local') return <MineMemoryLocal onBack={() => setMode(null)} />
  if (mode === 'online') return <MineMemoryOnline onBack={() => setMode(null)} />

  return (
    <div className="fade-in" style={{ maxWidth: 460, margin: '0 auto', padding: '1rem' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
        ← 돌아가기
      </button>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 60, marginBottom: 4 }}>💣</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #7E57C2, #E63946)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          망각의 지뢰
        </h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>11×11 기억력 보드 · 모드 선택</p>
      </div>

      <ModeCard
        icon="📱"
        title="단일 기기 패스앤플레이"
        desc="폰 1대로 두 사람이 번갈아 진행. 지뢰 입력 시 상대방에게 화면 가리기 안내가 나옵니다."
        color="#7E57C2"
        onClick={() => setMode('local')}
      />
      <ModeCard
        icon="🌐"
        title="3대 온라인 (딜러 + 플레이어 2명)"
        desc="딜러 폰이 방을 만들고 플레이어 2명이 코드로 입장. 지뢰는 본인 폰과 딜러에게만 보입니다."
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
      transition: 'transform 0.06s',
    }}>
      <div style={{ fontSize: 36, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </button>
  )
}
