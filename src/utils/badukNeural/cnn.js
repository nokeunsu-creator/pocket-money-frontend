// CNN 순방향 추론 (pure JS)
// - Conv2d (3x3 + padding=1, 1x1)
// - ReLU
// - Residual connection
// - Global Average Pool
// - Fully Connected
// - Softmax (with mask)
// - Tanh
//
// 모든 텐서는 Float32Array (NCHW 평탄화).

// Conv2d 3x3 with padding=1.
// in: [inC, H, W], W: [outC, inC, 3, 3], B: [outC]
// out: [outC, H, W]
function conv2d3x3(input, weights, size) {
  const { W, B, outC, inC } = weights
  const out = new Float32Array(outC * size * size)
  const HW = size * size

  for (let oc = 0; oc < outC; oc++) {
    const wBase = oc * inC * 9
    const bias = B[oc]
    const outBase = oc * HW
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        let s = bias
        for (let ic = 0; ic < inC; ic++) {
          const inBase = ic * HW
          const wcBase = wBase + ic * 9
          for (let dr = -1; dr <= 1; dr++) {
            const nr = r + dr
            if (nr < 0 || nr >= size) continue
            for (let dc = -1; dc <= 1; dc++) {
              const nc = c + dc
              if (nc < 0 || nc >= size) continue
              s += input[inBase + nr * size + nc] * W[wcBase + (dr + 1) * 3 + (dc + 1)]
            }
          }
        }
        out[outBase + r * size + c] = s
      }
    }
  }
  return out
}

// Conv2d 1x1.
function conv2d1x1(input, weights, size) {
  const { W, B, outC, inC } = weights
  const out = new Float32Array(outC * size * size)
  const HW = size * size
  for (let oc = 0; oc < outC; oc++) {
    const bias = B[oc]
    const wBase = oc * inC
    const outBase = oc * HW
    for (let p = 0; p < HW; p++) {
      let s = bias
      for (let ic = 0; ic < inC; ic++) {
        s += input[ic * HW + p] * W[wBase + ic]
      }
      out[outBase + p] = s
    }
  }
  return out
}

function relu(t) {
  for (let i = 0; i < t.length; i++) if (t[i] < 0) t[i] = 0
  return t
}

function addInPlace(a, b) {
  for (let i = 0; i < a.length; i++) a[i] += b[i]
  return a
}

function globalAvgPool(input, channels, size) {
  const out = new Float32Array(channels)
  const HW = size * size
  for (let c = 0; c < channels; c++) {
    let s = 0
    const base = c * HW
    for (let p = 0; p < HW; p++) s += input[base + p]
    out[c] = s / HW
  }
  return out
}

function fcLayer(input, weights) {
  const { W, B, outDim, inDim } = weights
  const out = new Float32Array(outDim)
  for (let o = 0; o < outDim; o++) {
    let s = B[o]
    const base = o * inDim
    for (let i = 0; i < inDim; i++) s += input[i] * W[base + i]
    out[o] = s
  }
  return out
}

function tanh(x) {
  if (x > 20) return 1
  if (x < -20) return -1
  const e1 = Math.exp(x), e2 = Math.exp(-x)
  return (e1 - e2) / (e1 + e2)
}

// Policy + value 추론.
// input: Float32Array [11, S, S]
// legalMask: Float32Array [S*S], 0 or 1
// 반환: { policy: Float32Array[S*S], pass: number, value: number (-1~1) }
export function forward(input, weights, size, legalMask) {
  // Trunk
  let x = conv2d3x3(input, weights.conv1, size); relu(x)
  let x2 = conv2d3x3(x, weights.conv2, size); relu(x2)
  let x3 = conv2d3x3(x2, weights.conv3, size); relu(x3)
  let x4 = conv2d3x3(x3, weights.conv4, size)
  // Residual: x4 += x2 (24ch 동일)
  addInPlace(x4, x2)
  relu(x4)

  // Policy head: 24→1 (1x1 conv)
  const pConv = conv2d1x1(x4, weights.policyConv, size)
  const HW = size * size
  // pConv: [1, S, S] → logit per cell
  const logits = new Float32Array(HW + 1) // +1 for pass
  for (let p = 0; p < HW; p++) logits[p] = pConv[p]
  logits[HW] = weights.passLogit

  // Mask 적용 + softmax
  let maxLogit = -Infinity
  for (let p = 0; p < HW; p++) {
    if (legalMask[p] && logits[p] > maxLogit) maxLogit = logits[p]
  }
  if (logits[HW] > maxLogit) maxLogit = logits[HW]

  let sum = 0
  const probs = new Float32Array(HW + 1)
  for (let p = 0; p < HW; p++) {
    if (legalMask[p]) {
      const e = Math.exp(logits[p] - maxLogit)
      probs[p] = e; sum += e
    }
  }
  const ePass = Math.exp(logits[HW] - maxLogit)
  probs[HW] = ePass; sum += ePass

  if (sum > 0) for (let p = 0; p <= HW; p++) probs[p] /= sum

  // Value head: 24→4 (1x1) → GAP → 16 → 1 → tanh
  const vConv = conv2d1x1(x4, weights.valueConv, size); relu(vConv)
  const vPool = globalAvgPool(vConv, 4, size)
  const vH = fcLayer(vPool, weights.valueFc1); relu(vH)
  const vOut = fcLayer(vH, weights.valueFc2)
  const value = tanh(vOut[0])

  return {
    policy: probs.subarray(0, HW),
    pass: probs[HW],
    value,
  }
}
