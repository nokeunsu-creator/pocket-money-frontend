import { useState } from 'react'
import { isSoundEnabled, toggleSound, playClick } from '../utils/sounds'

export default function GameHub({ onBack, onSelectGame }) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled())
  const handleSoundToggle = () => {
    const v = toggleSound()
    setSoundOn(v)
    if (v) playClick() // 켰으면 한 번 들려주기
  }
  const handleGameSelect = (key) => {
    playClick()
    onSelectGame(key)
  }
  const categories = [
    {
      label: '🧩 보드게임', games: [
        { key: 'omok', icon: '⚫', title: '오목', desc: 'AI · 2인 · 온라인', color: '#333' },
        { key: 'minemem', icon: '💣', title: '망각의 지뢰', desc: '11×11 · 2인 패스앤플레이 · 기억력', color: '#7E57C2' },
        { key: 'langpiece', icon: '🔤', title: '언어의 조각', desc: '한글 자모 워들 · 2인 · 5라운드', color: '#7E57C2' },
        { key: 'baduk', icon: '⚪', title: '바둑', desc: 'AI 1~10단계 · 2인 · 온라인', color: '#1a1a1a' },
        { key: 'baduk-katago', icon: '⚡', title: 'KataGo AI 바둑', desc: '실제 학습된 KataGo · 19×19 · 약 1~2단', color: '#6A1B9A' },
        { key: 'chess', icon: '♟️', title: '체스', desc: 'AI · 2인 · 온라인', color: '#5D4037' },
        { key: 'janggi', icon: '將', title: '장기', desc: 'AI 10단계 · 2인 · 온라인', color: '#8B0000' },
        { key: 'othello', icon: '⚫', title: '오델로', desc: '8×8 · AI · 2인 · 온라인', color: '#1B5E20' },
        { key: 'connect4', icon: '🔴', title: '커넥트 포 (사목)', desc: '7×6 · AI · 2인 · 온라인', color: '#1565C0' },
        { key: 'gonu', icon: '🟫', title: '줄고누', desc: '한국 전통 3×3 · AI · 온라인', color: '#8B6F2A' },
      ],
    },
    {
      label: '🃏 카드게임', games: [
        { key: 'onecard', icon: '🃏', title: '원카드', desc: 'AI · 온라인 대전', color: '#4A3F8A' },
        { key: 'hula', icon: '♠️', title: '훌라', desc: 'AI · 온라인 대전', color: '#2D6A4F' },
        { key: 'memory', icon: '🂠', title: '카드 뒤집기', desc: '기억력 게임', color: '#06D6A0' },
      ],
    },
    {
      label: '🧠 두뇌게임', games: [
        { key: 'baseball', icon: '⚾', title: '숫자 야구', desc: '1인 · 온라인 대결', color: '#4895EF' },
        { key: 'multiply', icon: '✖️', title: '구구단 챌린지', desc: '1인 · 온라인 대결', color: '#F39C12' },
        { key: 'mathquiz', icon: '🧮', title: '사칙연산 퀴즈', desc: '1인 · 온라인 대결', color: '#EF476F' },
        { key: 'whackmole', icon: '🐹', title: '두더지 게임', desc: '30초 반사·리더보드', color: '#D35400' },
        { key: 'nummem', icon: '🧠', title: '숫자 기억', desc: '본 숫자 순서대로 입력', color: '#8E44AD' },
        { key: '24', icon: '🔢', title: '24점 퍼즐', desc: '숫자 4개로 24 만들기', color: '#4895EF' },
        { key: 'sudoku', icon: '🧩', title: '스도쿠', desc: '4×4 · 6×6 · 9×9', color: '#9B59B6' },
        { key: 'wordchain', icon: '🔤', title: '끝말잇기', desc: '2인 · 20초 턴', color: '#16A085' },
        { key: 'draw', icon: '🎨', title: '이어그리기', desc: '2인 번갈아 그림 완성', color: '#E67E22' },
      ],
    },
    {
      label: '📚 학습', games: [
        { key: 'baduk-classroom', icon: '🎓', title: '바둑 교실', desc: '58레슨 · 초보→실전', color: '#2D6A4F' },
        { key: 'baduk-quiz', icon: '❓', title: '바둑 퀴즈', desc: '입문·기초·중급·고급 · 100문제', color: '#1a1a1a' },
        { key: 'english', icon: '🔤', title: '영어나라', desc: '단어·스펠링·문장·대전', color: '#4895EF' },
        { key: 'math', icon: '📐', title: '수학나라', desc: '연산·도형·분수·시계', color: '#E74C3C' },
        { key: 'science', icon: '🧪', title: '과학 퀴즈', desc: '10주제 200문제', color: '#9B59B6' },
        { key: 'history', icon: '🇰🇷', title: '한국사 퀴즈', desc: '10주제 200문제', color: '#8B4513' },
        { key: 'nonsense', icon: '🤪', title: '넌센스 퀴즈', desc: '125문제 · 센스 테스트', color: '#F39C12' },
        { key: 'proverb', icon: '📜', title: '사자성어/속담', desc: '3~6학년 · 학년별 퀴즈', color: '#8B4513' },
        { key: 'spelling', icon: '✏️', title: '맞춤법', desc: '3~6학년 · 헷갈리는 맞춤법', color: '#2C3E50' },
        { key: 'flag', icon: '🌍', title: '세계 국기/수도', desc: '3~6학년 · 나라 맞추기', color: '#27AE60' },
        { key: 'continent', icon: '🗺️', title: '지도 나라 찾기', desc: '국기 → 대륙 맞추기', color: '#16A085' },
        { key: 'dinosaur', icon: '🦖', title: '공룡 퀴즈', desc: '티라노·스테고·트리케라톱스', color: '#8B5A2B' },
        { key: 'space', icon: '🌌', title: '우주 퀴즈', desc: '태양계·별자리·우주탐사', color: '#6A1B9A' },
        { key: 'wordmatch', icon: '🔤', title: '영어 단어 매칭', desc: '영↔한 짝 맞추기', color: '#3A7BD5' },
        { key: 'hanja', icon: '漢', title: '한자', desc: '3~6학년 · 8급~5급', color: '#C0392B' },
        { key: 'logic', icon: '🧩', title: '코딩/논리', desc: '3~6학년 · 사고력 퀴즈', color: '#8E44AD' },
        { key: 'safety', icon: '🛡️', title: '안전/생활상식', desc: '3~6학년 · 생활 안전', color: '#E67E22' },
      ],
    },
    {
      label: '🦑 서바이벌 게임', games: [
        { key: 'rlgl', icon: '🌸', title: '무궁화 꽃이 피었습니다', desc: '영희가 돌아볼 때 멈춰!', color: '#E63946' },
        { key: 'glassbridge', icon: '🟦', title: '징검다리', desc: '강화유리 vs 일반유리', color: '#118AB2' },
        { key: 'sixrow', icon: '⚫', title: '6목 (육목)', desc: '한 턴에 2수 · AI · 온라인', color: '#34495E' },
      ],
    },
    {
      label: '🏅 기타', games: [
        { key: 'achievements', icon: '🏅', title: '업적', desc: '도전 과제 달성하기', color: '#F1C40F' },
        { key: 'leaderboard', icon: '🏆', title: '퀴즈 리더보드', desc: '월별 순위·형제 대결', color: '#E67E22' },
      ],
    },
  ]

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer' }}>
          ← 돌아가기
        </button>
        <button onClick={handleSoundToggle}
          aria-label={soundOn ? '소리 끄기' : '소리 켜기'}
          style={{ background: soundOn ? '#E8F5E9' : '#F0F0F0', border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 18, cursor: 'pointer' }}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎮</div>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>게임</h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>재미있는 게임을 골라보세요!</p>
      </div>

      {categories.map(cat => (
        <div key={cat.label} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, paddingLeft: 4 }}>{cat.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cat.games.map(g => (
              <button key={g.key}
                onClick={() => handleGameSelect(g.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: '#FFF', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  textAlign: 'left', transition: 'transform 0.1s',
                }}
                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onPointerUp={e => e.currentTarget.style.transform = ''}
                onPointerLeave={e => e.currentTarget.style.transform = ''}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0, color: '#FFF',
                }}>
                  {g.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{g.title}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{g.desc}</div>
                </div>
                <div style={{ fontSize: 16, color: '#CCC' }}>›</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
