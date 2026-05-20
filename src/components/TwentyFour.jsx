import { useState, useEffect, useMemo } from 'react'
import { playSuccess, playFail } from '../utils/sounds'

/**
 * 24점 퍼즐: 4개 숫자를 사칙연산으로 조합해 24 만들기.
 * - 풀이 가능한 숫자 세트만 출제 (재귀 solver로 사전 검증)
 * - 입력은 간단한 텍스트 수식 ( ), +, -, *, /, × , ÷  허용
 */

const OPS = ['+', '-', '*', '/']
const EPS = 1e-6

function compute(a, b, op) {
  if (op === '+') return a + b
  if (op === '-') return a - b
  if (op === '*') return a * b
  if (op === '/') return b === 0 ? NaN : a / b
  return NaN
}

function canMake24(nums) {
  if (nums.length === 1) return Math.abs(nums[0] - 24) < EPS
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i === j) continue
      const rest = nums.filter((_, k) => k !== i && k !== j)
      for (const op of OPS) {
        const v = compute(nums[i], nums[j], op)
        if (isFinite(v) && canMake24([...rest, v])) return true
      }
    }
  }
  return false
}

/** 풀이 가능한 4개 숫자 세트 생성 (1~13 중). */
function generateSolvable() {
  for (let i = 0; i < 200; i++) {
    const nums = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1)
    if (canMake24(nums)) return nums
  }
  // fallback (항상 풀이 가능)
  return [3, 8, 3, 8]
}

/** 사용자 입력 수식에서 사용한 숫자가 주어진 숫자 세트와 정확히 일치하는지 + 값이 24인지 */
function evaluate(input, nums) {
  if (!input) return { ok: false, reason: 'empty' }
  // × ÷ 정규화
  let s = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s/g, '')
  if (!/^[0-9+\-*/().]+$/.test(s)) return { ok: false, reason: 'invalid' }

  // 사용된 숫자 추출 (연속 숫자)
  const used = (s.match(/\d+/g) || []).map(Number)
  if (used.length !== 4) return { ok: false, reason: 'count' }
  const sortA = [...used].sort((a, b) => a - b).join(',')
  const sortB = [...nums].sort((a, b) => a - b).join(',')
  if (sortA !== sortB) return { ok: false, reason: 'mismatch' }

  try {
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict"; return (${s})`)()
    if (typeof val !== 'number' || !isFinite(val)) return { ok: false, reason: 'eval' }
    if (Math.abs(val - 24) < EPS) return { ok: true, value: val }
    return { ok: false, reason: 'not24', value: val }
  } catch (_) {
    return { ok: false, reason: 'syntax' }
  }
}

export default function TwentyFour({ onBack }) {
  const [nums, setNums] = useState(() => generateSolvable())
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // { ok, msg }
  const [solved, setSolved] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const solvable = useMemo(() => canMake24([...nums]), [nums])

  useEffect(() => {
    setInput('')
    setFeedback(null)
  }, [nums])

  const appendChar = (ch) => {
    if (feedback?.ok) return
    setInput(s => s + ch)
  }
  const backspace = () => setInput(s => s.slice(0, -1))

  const check = () => {
    const res = evaluate(input, nums)
    if (res.ok) {
      playSuccess()
      setFeedback({ ok: true, msg: `🎉 정답! ${input} = 24` })
      setSolved(s => s + 1)
    } else {
      playFail()
      const reasons = {
        empty: '수식을 입력해주세요',
        invalid: '숫자와 +, −, ×, ÷, (, ) 만 쓸 수 있어요',
        count: '주어진 4개 숫자를 모두 한 번씩 써야 해요',
        mismatch: '주어진 숫자와 다르게 사용했어요',
        eval: '계산에 오류가 있어요',
        syntax: '수식 형식이 올바르지 않아요',
        not24: `${res.value?.toFixed(2)} (24가 아니에요)`,
      }
      setFeedback({ ok: false, msg: `❌ ${reasons[res.reason] || '틀렸어요'}` })
    }
  }

  const next = () => {
    setNums(generateSolvable())
  }

  const skip = () => {
    setSkipped(k => k + 1)
    next()
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem 2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
          ←
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>🔢 24점 퍼즐</h2>
        <div style={{ fontSize: 12, color: '#888' }}>
          푼 문제 <b style={{ color: '#06D6A0' }}>{solved}</b> · 넘김 <b>{skipped}</b>
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #4895EF, #3A7BD5)',
        color: '#FFF', borderRadius: 16, padding: '18px 20px', marginBottom: 16, textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, opacity: 0.85, letterSpacing: 1 }}>이 4개 숫자로 24 만들기</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 10 }}>
          {nums.map((n, i) => (
            <button key={i} onClick={() => appendChar(String(n))}
              style={{
                width: 56, height: 56, borderRadius: 14, border: 'none',
                background: 'rgba(255,255,255,0.22)', color: '#FFF',
                fontSize: 24, fontWeight: 800, cursor: 'pointer',
              }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: '#FFF', borderRadius: 14, padding: '14px 16px', marginBottom: 12,
        border: '2px solid #EEE',
        minHeight: 52, display: 'flex', alignItems: 'center',
        fontSize: 22, fontWeight: 700, color: '#2C3E50',
        letterSpacing: 1,
      }}>
        {input || <span style={{ color: '#CCC', fontSize: 14, fontWeight: 400 }}>숫자·연산자 눌러 수식 만들기</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
        {['+', '−', '×', '÷'].map((op, i) => (
          <button key={op}
            onClick={() => appendChar(['+','-','*','/'][i])}
            style={{
              padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#F5F5F5', fontSize: 20, fontWeight: 700, color: '#2C3E50', cursor: 'pointer',
            }}>
            {op}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        <button onClick={() => appendChar('(')}
          style={{ padding: '14px 0', borderRadius: 12, border: 'none', background: '#F5F5F5', fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
          (
        </button>
        <button onClick={() => appendChar(')')}
          style={{ padding: '14px 0', borderRadius: 12, border: 'none', background: '#F5F5F5', fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
          )
        </button>
        <button onClick={backspace}
          style={{ padding: '14px 0', borderRadius: 12, border: 'none', background: '#FDECEA', color: '#C0392B', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          ⌫ 지우기
        </button>
        <button onClick={() => setInput('')}
          style={{ padding: '14px 0', borderRadius: 12, border: 'none', background: '#FDECEA', color: '#C0392B', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          초기화
        </button>
      </div>

      {feedback && (
        <div style={{
          padding: '14px 16px', borderRadius: 12, marginBottom: 12,
          background: feedback.ok ? '#F0FFF4' : '#FFF5F5',
          border: `2px solid ${feedback.ok ? '#06D6A0' : '#EF476F'}`,
          fontSize: 15, fontWeight: 700,
          color: feedback.ok ? '#2D6A4F' : '#C0392B',
          textAlign: 'center',
        }}>
          {feedback.msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={check}
          disabled={feedback?.ok}
          style={{
            flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #4895EF, #3A7BD5)',
            color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            opacity: feedback?.ok ? 0.4 : 1,
          }}>
          확인
        </button>
        {feedback?.ok ? (
          <button onClick={next}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#06D6A0', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            다음 문제 →
          </button>
        ) : (
          <button onClick={skip}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            넘기기
          </button>
        )}
      </div>

      {!solvable && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#AAA', textAlign: 'center' }}>
          (풀 수 없는 숫자면 넘기기 눌러 다른 문제로)
        </div>
      )}
    </div>
  )
}
