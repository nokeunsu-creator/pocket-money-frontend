import React, { useState, useEffect, useRef } from 'react'
import {
  getMemos,
  getMemo,
  addMemo,
  updateMemo,
  deleteMemo,
  togglePin,
  searchMemos,
  MEMO_COLORS,
} from '../utils/memoStorage'

function getRelativeDate(dateStr) {
  if (!dateStr) return ''
  const [datePart] = dateStr.split(' ')
  const [y, m, d] = datePart.split('-').map(Number)

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  if (datePart === todayStr) return '오늘'
  if (datePart === yesterdayStr) return '어제'
  if (y === now.getFullYear()) return `${m}월 ${d}일`
  return `${y}년 ${m}월 ${d}일`
}

function getColorObj(key) {
  return MEMO_COLORS.find(c => c.key === key) || MEMO_COLORS[0]
}

export default function QuickMemo({ onBack }) {
  const [screen, setScreen] = useState('list') // 'list' | 'editor'
  const [memos, setMemos] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [color, setColor] = useState('default')
  const [pinned, setPinned] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    refreshMemos()
  }, [])

  function refreshMemos() {
    if (searchQuery.trim()) {
      setMemos(searchMemos(searchQuery))
    } else {
      setMemos(getMemos())
    }
  }

  function handleSearch(q) {
    setSearchQuery(q)
    if (q.trim()) {
      setMemos(searchMemos(q))
    } else {
      setMemos(getMemos())
    }
  }

  function openEditor(id) {
    if (id) {
      const memo = getMemo(id)
      if (memo) {
        setEditingId(id)
        setTitle(memo.title)
        setContent(memo.content)
        setColor(memo.color)
        setPinned(memo.pinned)
      }
    } else {
      setEditingId(null)
      setTitle('')
      setContent('')
      setColor('default')
      setPinned(false)
    }
    setShowDeleteConfirm(false)
    setScreen('editor')
  }

  function closeEditor() {
    setScreen('list')
    setEditingId(null)
    refreshMemos()
  }

  function handleSave() {
    if (!title.trim() && !content.trim()) return
    if (editingId) {
      updateMemo(editingId, { title, content, color, pinned })
    } else {
      addMemo({ title, content, color, pinned })
    }
    closeEditor()
  }

  function handleDelete() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }
    deleteMemo(editingId)
    closeEditor()
  }

  function handleTogglePin(id, e) {
    e.stopPropagation()
    togglePin(id)
    refreshMemos()
  }

  function autoGrow() {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.max(200, ta.scrollHeight) + 'px'
    }
  }

  const pinnedMemos = memos.filter(m => m.pinned)
  const recentMemos = memos.filter(m => !m.pinned)

  // ── Styles ──

  const containerStyle = {
    maxWidth: 480,
    margin: '0 auto',
    minHeight: '100vh',
    background: '#F8F9FA',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    position: 'relative',
  }

  const headerStyle = {
    background: 'linear-gradient(135deg, #F39C12, #E67E22)',
    color: '#FFF',
    padding: '20px 20px 24px',
    borderRadius: '0 0 20px 20px',
  }

  const headerTopStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  }

  const backBtnStyle = {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#FFF',
    fontSize: 18,
    borderRadius: 10,
    width: 36,
    height: 36,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const titleStyle = {
    fontSize: 22,
    fontWeight: 700,
  }

  const searchBarStyle = {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: '8px 12px',
    gap: 8,
  }

  const searchInputStyle = {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#FFF',
    fontSize: 15,
    lineHeight: '20px',
  }

  const countStyle = {
    padding: '12px 20px 4px',
    fontSize: 13,
    color: '#888',
    fontWeight: 600,
  }

  const sectionLabelStyle = {
    padding: '12px 20px 4px',
    fontSize: 13,
    color: '#F39C12',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  }

  const listStyle = {
    padding: '4px 16px 100px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  }

  const cardStyle = (colorKey) => {
    const c = getColorObj(colorKey)
    return {
      background: c.color,
      border: `1.5px solid ${c.border}`,
      borderRadius: 14,
      padding: '14px 16px',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      position: 'relative',
      transition: 'transform 0.15s',
    }
  }

  const cardTitleStyle = {
    fontSize: 15,
    fontWeight: 700,
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: 4,
    paddingRight: 28,
  }

  const cardContentStyle = {
    fontSize: 13,
    color: '#666',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    lineHeight: '18px',
    marginBottom: 6,
  }

  const cardDateStyle = {
    fontSize: 11,
    color: '#999',
  }

  const pinIconStyle = {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 16,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  }

  const fabStyle = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #F39C12, #E67E22)',
    color: '#FFF',
    border: 'none',
    fontSize: 28,
    fontWeight: 300,
    boxShadow: '0 4px 16px rgba(243,156,18,0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  }

  // ── Editor Styles ──

  const editorHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: '#FFF',
    borderBottom: '1px solid #EEE',
  }

  const editorTitleInputStyle = {
    width: '100%',
    fontSize: 20,
    fontWeight: 700,
    border: 'none',
    outline: 'none',
    padding: '16px 20px 8px',
    background: 'transparent',
    color: '#333',
  }

  const editorTextareaStyle = {
    width: '100%',
    fontSize: 15,
    border: 'none',
    outline: 'none',
    padding: '8px 20px',
    background: 'transparent',
    color: '#444',
    resize: 'none',
    minHeight: 200,
    lineHeight: '22px',
    boxSizing: 'border-box',
  }

  const colorPickerStyle = {
    display: 'flex',
    gap: 10,
    padding: '12px 20px',
    alignItems: 'center',
  }

  const colorDotStyle = (c, isActive) => ({
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: c.color,
    border: isActive ? `3px solid ${c.border}` : `2px solid ${c.border}`,
    cursor: 'pointer',
    boxShadow: isActive ? `0 0 0 2px #F39C12` : 'none',
    transition: 'box-shadow 0.15s',
  })

  const saveBtnStyle = {
    margin: '12px 20px',
    padding: '14px',
    borderRadius: 12,
    background: 'linear-gradient(135deg, #F39C12, #E67E22)',
    color: '#FFF',
    border: 'none',
    fontSize: 16,
    fontWeight: 700,
    width: 'calc(100% - 40px)',
    cursor: 'pointer',
  }

  const deleteBtnStyle = {
    margin: '0 20px 20px',
    padding: '14px',
    borderRadius: 12,
    background: showDeleteConfirm ? '#D32F2F' : '#FFF',
    color: showDeleteConfirm ? '#FFF' : '#D32F2F',
    border: showDeleteConfirm ? 'none' : '1.5px solid #EF9A9A',
    fontSize: 15,
    fontWeight: 700,
    width: 'calc(100% - 40px)',
    cursor: 'pointer',
  }

  const pinToggleStyle = {
    padding: '6px 14px',
    borderRadius: 20,
    border: pinned ? '2px solid #F39C12' : '2px solid #DDD',
    background: pinned ? '#FFF8E1' : '#FFF',
    cursor: 'pointer',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  }

  // ── Render ──

  if (screen === 'editor') {
    const editorBg = getColorObj(color)
    return (
      <div style={{ ...containerStyle, background: editorBg.color }}>
        <div style={editorHeaderStyle}>
          <button style={backBtnStyle} onClick={closeEditor}>←</button>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#333' }}>
            {editingId ? '메모 수정' : '새 메모'}
          </span>
          <button
            style={{ ...backBtnStyle, background: '#F39C12', fontSize: 14, fontWeight: 700 }}
            onClick={handleSave}
          >
            ✓
          </button>
        </div>

        <input
          style={editorTitleInputStyle}
          placeholder="제목"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <textarea
          ref={textareaRef}
          style={editorTextareaStyle}
          placeholder="내용을 입력하세요"
          value={content}
          onChange={e => { setContent(e.target.value); autoGrow() }}
          onFocus={autoGrow}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px' }}>
          <div style={colorPickerStyle}>
            {MEMO_COLORS.map(c => (
              <div
                key={c.key}
                style={colorDotStyle(c, color === c.key)}
                onClick={() => setColor(c.key)}
              />
            ))}
          </div>
          <button style={pinToggleStyle} onClick={() => setPinned(!pinned)}>
            📌{pinned && <span style={{ fontSize: 12, fontWeight: 700, color: '#F39C12' }}>ON</span>}
          </button>
        </div>

        <button style={saveBtnStyle} onClick={handleSave}>
          저장
        </button>

        {editingId && (
          <button style={deleteBtnStyle} onClick={handleDelete}>
            {showDeleteConfirm ? '정말 삭제할까요?' : '삭제'}
          </button>
        )}
      </div>
    )
  }

  // ── List Screen ──

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={headerTopStyle}>
          <button style={backBtnStyle} onClick={onBack}>←</button>
          <span style={titleStyle}>📝 메모</span>
          <div style={{ width: 36 }} />
        </div>
        <div style={searchBarStyle}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            style={searchInputStyle}
            placeholder="메모 검색..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
          />
          {searchQuery && (
            <button
              style={{ background: 'none', border: 'none', color: '#FFF', fontSize: 16, cursor: 'pointer', padding: 0 }}
              onClick={() => handleSearch('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div style={countStyle}>
        {memos.length}개의 메모
        {searchQuery && <span> (검색: "{searchQuery}")</span>}
      </div>

      <div style={listStyle}>
        {pinnedMemos.length > 0 && (
          <>
            <div style={sectionLabelStyle}>📌 고정된 메모</div>
            {pinnedMemos.map(memo => (
              <div
                key={memo.id}
                style={cardStyle(memo.color)}
                onClick={() => openEditor(memo.id)}
              >
                {memo.title && <div style={cardTitleStyle}>{memo.title}</div>}
                {memo.content && <div style={cardContentStyle}>{memo.content}</div>}
                <div style={cardDateStyle}>{getRelativeDate(memo.updatedAt)}</div>
                <button
                  style={pinIconStyle}
                  onClick={e => handleTogglePin(memo.id, e)}
                >
                  📌
                </button>
              </div>
            ))}
          </>
        )}

        {recentMemos.length > 0 && (
          <>
            {pinnedMemos.length > 0 && (
              <div style={{ ...sectionLabelStyle, color: '#888' }}>최근 메모</div>
            )}
            {recentMemos.map(memo => (
              <div
                key={memo.id}
                style={cardStyle(memo.color)}
                onClick={() => openEditor(memo.id)}
              >
                {memo.title && <div style={cardTitleStyle}>{memo.title}</div>}
                {memo.content && <div style={cardContentStyle}>{memo.content}</div>}
                <div style={cardDateStyle}>{getRelativeDate(memo.updatedAt)}</div>
              </div>
            ))}
          </>
        )}

        {memos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#AAA' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {searchQuery ? '검색 결과가 없습니다' : '메모가 없습니다'}
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {searchQuery ? '다른 키워드로 검색해보세요' : '+ 버튼을 눌러 새 메모를 작성하세요'}
            </div>
          </div>
        )}
      </div>

      <button style={fabStyle} onClick={() => openEditor(null)}>
        +
      </button>
    </div>
  )
}
