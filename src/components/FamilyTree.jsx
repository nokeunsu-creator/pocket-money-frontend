import { useState } from 'react'
import {
  familyMembers,
  spouseLinks,
  parentChildLinks,
  relationshipLabels,
  nodePositions,
} from '../data/familyData'

const NODE_R = 32
const VIEWBOX_W = 1000
const VIEWBOX_H = 650

const COLORS = {
  generation1: '#6C88C4',
  generation2: '#E07A5F',
  generation3: '#81B29A',
  spouse: '#E8A0BF',
  selected: '#F2CC8F',
  selectedBorder: '#E6A817',
  line: '#CBD5E1',
  spouseLine: '#F9A8D4',
}

function getLabel(viewerId, targetId) {
  if (viewerId === targetId) return '나(기준)'
  return relationshipLabels[viewerId]?.[targetId] || ''
}

function genColor(generation) {
  if (generation === 1) return COLORS.generation1
  if (generation === 2) return COLORS.generation2
  return COLORS.generation3
}

export default function FamilyTree({ onBack }) {
  const selectedId = 'me'

  return (
    <div className="page fade-in" style={{ padding: '12px 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 4px 16px',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'var(--light-gray, #f0f0f0)', border: 'none',
            borderRadius: 20, padding: '8px 16px', fontSize: 14,
            cursor: 'pointer', color: 'var(--gray, #666)',
          }}
        >
          ← 뒤로
        </button>
        <h1 style={{ fontSize: 20, color: 'var(--brown, #5D4037)', margin: 0 }}>
          우리 가족 가계도
        </h1>
      </div>

      {/* SVG 가계도 */}
      <div style={{
        background: '#FAFAF8', borderRadius: 20,
        border: '1px solid #E8E4DF', overflow: 'hidden',
      }}>
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          {/* 배우자 연결선 (점선) */}
          {spouseLinks.map(([a, b], i) => {
            const posA = nodePositions[a]
            const posB = nodePositions[b]
            return (
              <line
                key={`spouse-${i}`}
                x1={posA.x} y1={posA.y}
                x2={posB.x} y2={posB.y}
                stroke={COLORS.spouseLine}
                strokeWidth={2.5}
                strokeDasharray="8,5"
              />
            )
          })}

          {/* 부모-자녀 연결선 */}
          {parentChildLinks.map((link, li) => {
            const p1 = nodePositions[link.parents[0]]
            const p2 = nodePositions[link.parents[1]]
            const parentMidX = (p1.x + p2.x) / 2
            const parentY = p1.y + NODE_R + 8

            return link.children.map((childId, ci) => {
              const child = nodePositions[childId]
              const childY = child.y - NODE_R - 22

              // 자녀가 1명이면 직선, 여러 명이면 중간 수평선 사용
              if (link.children.length === 1) {
                return (
                  <path
                    key={`pc-${li}-${ci}`}
                    d={`M ${parentMidX} ${parentY} L ${parentMidX} ${(parentY + childY) / 2} L ${child.x} ${(parentY + childY) / 2} L ${child.x} ${childY}`}
                    fill="none"
                    stroke={COLORS.line}
                    strokeWidth={2}
                  />
                )
              }

              const midY = (parentY + childY) / 2
              const allChildX = link.children.map(cid => nodePositions[cid].x)
              const minX = Math.min(...allChildX)
              const maxX = Math.max(...allChildX)

              return (
                <g key={`pc-${li}-${ci}`}>
                  {ci === 0 && (
                    <>
                      {/* 부모 중간 → 수평선 레벨 */}
                      <line
                        x1={parentMidX} y1={parentY}
                        x2={parentMidX} y2={midY}
                        stroke={COLORS.line} strokeWidth={2}
                      />
                      {/* 수평 연결 */}
                      <line
                        x1={minX} y1={midY}
                        x2={maxX} y2={midY}
                        stroke={COLORS.line} strokeWidth={2}
                      />
                    </>
                  )}
                  {/* 수평선 → 자녀 */}
                  <line
                    x1={child.x} y1={midY}
                    x2={child.x} y2={childY}
                    stroke={COLORS.line} strokeWidth={2}
                  />
                </g>
              )
            })
          })}

          {/* 가족 구성원 노드 */}
          {familyMembers.map(member => {
            const pos = nodePositions[member.id]
            const isSelected = member.id === selectedId
            const label = getLabel(selectedId, member.id)
            const baseColor = genColor(member.generation)

            return (
              <g
                key={member.id}
                style={{ cursor: 'default' }}
              >
                {/* 선택 시 외곽 글로우 */}
                {isSelected && (
                  <circle
                    cx={pos.x} cy={pos.y} r={NODE_R + 8}
                    fill="none"
                    stroke={COLORS.selectedBorder}
                    strokeWidth={3}
                    strokeDasharray="6,3"
                    opacity={0.7}
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0" to="18" dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* 노드 원 */}
                <circle
                  cx={pos.x} cy={pos.y} r={NODE_R}
                  fill={isSelected ? COLORS.selected : '#FFF'}
                  stroke={isSelected ? COLORS.selectedBorder : baseColor}
                  strokeWidth={isSelected ? 3.5 : 2.5}
                />

                {/* 이모지 */}
                <text
                  x={pos.x} y={pos.y + 2}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={28} style={{ pointerEvents: 'none' }}
                >
                  {member.emoji}
                </text>

                {/* 호칭 라벨 (위) */}
                <rect
                  x={pos.x - 38} y={pos.y - NODE_R - 24}
                  width={76} height={20}
                  rx={10}
                  fill={isSelected ? COLORS.selectedBorder : baseColor}
                  opacity={0.9}
                />
                <text
                  x={pos.x} y={pos.y - NODE_R - 12}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={12} fontWeight="bold" fill="#FFF"
                  style={{ pointerEvents: 'none' }}
                >
                  {label}
                </text>

                {/* 이름 (아래) */}
                <text
                  x={pos.x} y={pos.y + NODE_R + 16}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={13} fill="#5D4037" fontWeight="500"
                  style={{ pointerEvents: 'none' }}
                >
                  {member.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

    </div>
  )
}
