import { useState, useEffect } from 'react'
import { getQuizLeaderboard } from '../api/api'

const QUIZ_LABELS = {
  proverb: { icon: '📜', title: '사자성어/속담' },
  spelling: { icon: '✏️', title: '맞춤법' },
  flag: { icon: '🌍', title: '세계 국기/수도' },
  hanja: { icon: '漢', title: '한자' },
  logic: { icon: '🧩', title: '코딩/논리' },
  safety: { icon: '🛡️', title: '안전/생활상식' },
  baduk: { icon: '❓', title: '바둑 퀴즈' },
  'whack-mole': { icon: '🐹', title: '두더지 게임' },
}

const RANK_COLORS = ['#F1C40F', '#95A5A6', '#D35400']
const RANK_ICONS = ['🥇', '🥈', '🥉']

function currentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function QuizLeaderboard({ onBack }) {
  const [month, setMonth] = useState(currentYearMonth())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getQuizLeaderboard(month)
      .then(d => setData(d))
      .catch(() => setData({ totalRanking: [], byQuiz: {} }))
      .finally(() => setLoading(false))
  }, [month])

  const isThisMonth = month === currentYearMonth()
  const totalRanking = data?.totalRanking || []
  const byQuiz = data?.byQuiz || {}
  const quizIds = Object.keys(byQuiz)

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem 3rem' }}>
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
        ← 돌아가기
      </button>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏅</div>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>월별 퀴즈 리더보드</h2>
      </div>

      {/* 월 선택 */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14,
        marginBottom: 20,
      }}>
        <button onClick={() => setMonth(prevMonth(month))}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: '#F5F5F5', fontSize: 16, cursor: 'pointer',
          }}>
          ◀
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#2C3E50' }}>
          {month}
        </span>
        <button onClick={() => setMonth(nextMonth(month))}
          disabled={isThisMonth}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: isThisMonth ? '#EEE' : '#F5F5F5', fontSize: 16,
            cursor: isThisMonth ? 'default' : 'pointer',
            opacity: isThisMonth ? 0.4 : 1,
          }}>
          ▶
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>불러오는 중...</div>
      ) : totalRanking.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          <div>이 달에는 기록이 없어요.</div>
          <div style={{ fontSize: 13, color: '#BBB', marginTop: 6 }}>
            퀴즈를 풀면 순위에 표시됩니다!
          </div>
        </div>
      ) : (
        <>
          {/* 종합 순위 */}
          <div style={{
            background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
            border: '2px solid #F1C40F', borderRadius: 16,
            padding: '16px 18px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#8B6914', marginBottom: 12 }}>
              🏆 종합 순위 (모든 퀴즈 최고점 합계)
            </div>
            {totalRanking.map((r, i) => (
              <div key={r.userName} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0',
                borderBottom: i < totalRanking.length - 1 ? '1px solid rgba(241,196,15,0.3)' : 'none',
              }}>
                <div style={{
                  width: 32, fontSize: 18, textAlign: 'center',
                }}>
                  {RANK_ICONS[i] || `${i + 1}.`}
                </div>
                <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>
                  {r.userName}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: RANK_COLORS[i] || '#555' }}>
                  {r.totalScore}점
                </div>
              </div>
            ))}
          </div>

          {/* 퀴즈별 순위 */}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 10, paddingLeft: 4 }}>
            📚 퀴즈별 순위
          </div>
          {quizIds.map(qid => {
            const meta = QUIZ_LABELS[qid] || { icon: '❓', title: qid }
            const entries = byQuiz[qid] || []
            // 점수 내림차순
            const sorted = [...entries].sort((a, b) => b.score - a.score)
            return (
              <div key={qid} style={{
                background: '#FFF', borderRadius: 14,
                padding: '14px 16px', marginBottom: 10,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                  {meta.icon} {meta.title}
                </div>
                {sorted.map((e, i) => (
                  <div key={e.userName + e.grade} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 0',
                    fontSize: 13,
                  }}>
                    <div style={{ width: 24, textAlign: 'center', fontSize: 14 }}>
                      {RANK_ICONS[i] || `${i + 1}`}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700 }}>{e.userName}</span>
                      {e.grade && (
                        <span style={{ fontSize: 11, color: '#999', marginLeft: 6 }}>
                          ({e.grade}{e.grade.length < 2 ? '학년' : ''})
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, color: RANK_COLORS[i] || '#555' }}>
                      {e.score}/{e.maxScore}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
