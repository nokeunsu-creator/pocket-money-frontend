// 신경망 가중치 결정론적 생성기
// - 시드된 PRNG로 재현 가능한 가중치 (모든 사용자가 같은 모델)
// - 첫 번째 conv 레이어는 도메인 지식으로 hand-design (단수/패턴 감지)
// - 나머지 레이어는 He initialization (ReLU에 적합한 normal 분포)
//
// 네트워크 아키텍처:
//   Input: [11, S, S]  (S = 9/13/19)
//   Conv1: 11→24, 3x3 (hand-designed)
//   Conv2: 24→24, 3x3
//   Conv3: 24→24, 3x3 (residual)
//   Conv4: 24→24, 3x3
//   PolicyHead: 24→1, 1x1 → flatten → +pass logit → softmax
//   ValueHead: 24→4, 1x1 → GAP → FC4→16 → FC16→1 → tanh

import { getNumPlanes } from './featurePlanes.js'

// xorshift32 결정론적 PRNG
function makeRng(seed) {
  let s = seed >>> 0
  if (s === 0) s = 0x9e3779b9
  return function next() {
    s ^= s << 13; s >>>= 0
    s ^= s >>> 17
    s ^= s << 5; s >>>= 0
    return (s & 0x7fffffff) / 0x7fffffff
  }
}

// Box-Muller로 정규분포 샘플
function gaussSample(rng) {
  const u1 = Math.max(1e-9, rng())
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

// He initialization: stddev = sqrt(2 / fan_in)
function heInit(out, fanIn, rng) {
  const std = Math.sqrt(2 / fanIn)
  for (let i = 0; i < out.length; i++) {
    out[i] = gaussSample(rng) * std
  }
}

// Conv2d 가중치: [outC, inC, 3, 3]
function makeConv(outC, inC, k, rng) {
  const W = new Float32Array(outC * inC * k * k)
  heInit(W, inC * k * k, rng)
  const B = new Float32Array(outC)
  return { W, B, outC, inC, k }
}

// FC: [out, in]
function makeFc(outDim, inDim, rng) {
  const W = new Float32Array(outDim * inDim)
  heInit(W, inDim, rng)
  const B = new Float32Array(outDim)
  return { W, B, outDim, inDim }
}

// 첫 번째 conv는 도메인 지식으로 hand-design.
// 11 입력 채널을 24 필터로 변환:
//  Filter 0~5: 단순 패턴 감지 (내 돌 주변, 상대 돌 주변, 빈 칸 군집)
//  Filter 6~11: 활로/단수 감지 (내 단수, 상대 단수, 활로2)
//  Filter 12~15: 가장자리/귀 (변, 귀, 화점)
//  Filter 16~23: He init (학습 효과 모방)
function buildConv1Handcrafted(inC, rng) {
  const outC = 24
  const k = 3
  const W = new Float32Array(outC * inC * k * k)
  const B = new Float32Array(outC)

  // 채널 인덱스 정의 (featurePlanes.js와 일치)
  const CH = {
    MY: 0, OPP: 1, EMPTY: 2,
    MY_LIB1: 3, MY_LIB2: 4, MY_LIB3P: 5,
    OPP_LIB1: 6, OPP_LIB2: 7,
    LAST: 8, EDGE: 9, COLOR: 10,
  }

  // 헬퍼: filter 의 (inputCh, dr, dc) 위치에 값 설정
  function setW(filterIdx, inCh, dr, dc, val) {
    const r = dr + 1, c = dc + 1
    W[((filterIdx * inC) + inCh) * k * k + r * k + c] = val
  }

  // Filter 0: 빈 칸 + 주변 내 돌 (연결 가능 위치)
  setW(0, CH.EMPTY, 0, 0, 1.5)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) setW(0, CH.MY, dr, dc, 0.6)

  // Filter 1: 빈 칸 + 주변 상대 돌 (저지/공격 위치)
  setW(1, CH.EMPTY, 0, 0, 1.5)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) setW(1, CH.OPP, dr, dc, 0.6)

  // Filter 2: 빈 칸 + 사방 내 돌 (눈 후보)
  setW(2, CH.EMPTY, 0, 0, 2.0)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) setW(2, CH.MY, dr, dc, 1.0)
  B[2] = -3.0 // 4방향 모두 있어야 활성

  // Filter 3: 빈 칸 + 사방 상대 돌 (상대 눈 - 깨야 함)
  setW(3, CH.EMPTY, 0, 0, 2.0)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) setW(3, CH.OPP, dr, dc, 1.0)
  B[3] = -3.0

  // Filter 4: 내 단수 그룹 주변 (구해야 할 곳)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) setW(4, CH.MY_LIB1, dr, dc, 1.5)
  setW(4, CH.EMPTY, 0, 0, 0.8)

  // Filter 5: 상대 단수 그룹 주변 (잡을 곳)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) setW(5, CH.OPP_LIB1, dr, dc, 2.0)
  setW(5, CH.EMPTY, 0, 0, 1.0)

  // Filter 6: 활로 2 (위험한 내 그룹)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) setW(6, CH.MY_LIB2, dr, dc, 1.0)
  setW(6, CH.EMPTY, 0, 0, 0.7)

  // Filter 7: 상대 활로 2 (공격 기회)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) setW(7, CH.OPP_LIB2, dr, dc, 1.2)
  setW(7, CH.EMPTY, 0, 0, 0.7)

  // Filter 8: 대각선 + 빈칸 (호구/뻗음)
  setW(8, CH.EMPTY, 0, 0, 1.5)
  for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) setW(8, CH.MY, dr, dc, 0.7)

  // Filter 9: 직접 옆 연결 강화
  setW(9, CH.MY, 0, 0, 1.0)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) setW(9, CH.MY, dr, dc, 0.5)

  // Filter 10: 두터움 (내 돌 다수 + 빈 영역)
  setW(10, CH.EMPTY, 0, 0, 0.5)
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (dr === 0 && dc === 0) continue
    setW(10, CH.MY, dr, dc, 0.3)
  }

  // Filter 11: 상대 두터움 (피해야 함, 음수)
  setW(11, CH.EMPTY, 0, 0, 0.5)
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (dr === 0 && dc === 0) continue
    setW(11, CH.OPP, dr, dc, -0.4)
  }

  // Filter 12: 가장자리/귀
  setW(12, CH.EMPTY, 0, 0, 1.0)
  setW(12, CH.EDGE, 0, 0, 1.5)

  // Filter 13: 가장자리 + 내 돌 인접 (받힘)
  setW(13, CH.EDGE, 0, 0, 1.0)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) setW(13, CH.MY, dr, dc, 0.4)

  // Filter 14: 마지막 수 근처 (응수 우선)
  setW(14, CH.EMPTY, 0, 0, 1.0)
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    setW(14, CH.LAST, dr, dc, 1.5)
  }

  // Filter 15: 마지막 수 직접 옆
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) setW(15, CH.LAST, dr, dc, 2.0)
  setW(15, CH.EMPTY, 0, 0, 0.5)

  // Filter 16~23: He init (학습된 듯한 추가 표현)
  for (let f = 16; f < 24; f++) {
    for (let ic = 0; ic < inC; ic++) {
      for (let kr = 0; kr < k; kr++) {
        for (let kc = 0; kc < k; kc++) {
          const idx = ((f * inC) + ic) * k * k + kr * k + kc
          W[idx] = gaussSample(rng) * Math.sqrt(2 / (inC * 9))
        }
      }
    }
  }

  return { W, B, outC, inC, k }
}

// 네트워크 전체 가중치 빌드
export function buildWeights(seed = 20260517) {
  const rng = makeRng(seed)
  const inC = getNumPlanes()

  const conv1 = buildConv1Handcrafted(inC, rng)
  const conv2 = makeConv(24, 24, 3, rng)
  const conv3 = makeConv(24, 24, 3, rng)
  const conv4 = makeConv(24, 24, 3, rng)

  // Residual: conv3 + conv4 사이에 skip connection
  // Policy head
  const policyConv = makeConv(1, 24, 1, rng)
  const passLogit = (gaussSample(rng) * 0.1) - 2.0 // 초반엔 패스 안 하게

  // Value head: 24 → 4채널 → global avg pool → 4 → 16 → 1
  const valueConv = makeConv(4, 24, 1, rng)
  const valueFc1 = makeFc(16, 4, rng)
  const valueFc2 = makeFc(1, 16, rng)

  return {
    conv1, conv2, conv3, conv4,
    policyConv, passLogit,
    valueConv, valueFc1, valueFc2,
  }
}
