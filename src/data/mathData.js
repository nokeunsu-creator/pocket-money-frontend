// Shape definitions
export const SHAPES = [
  { kr: '원', en: 'circle', sides: 0 },
  { kr: '삼각형', en: 'triangle', sides: 3 },
  { kr: '사각형', en: 'rectangle', sides: 4 },
  { kr: '정사각형', en: 'square', sides: 4 },
  { kr: '오각형', en: 'pentagon', sides: 5 },
  { kr: '육각형', en: 'hexagon', sides: 6 },
  { kr: '마름모', en: 'diamond', sides: 4 },
  { kr: '평행사변형', en: 'parallelogram', sides: 4 },
  { kr: '사다리꼴', en: 'trapezoid', sides: 4 },
  { kr: '타원', en: 'oval', sides: 0 },
]

// Unit conversion tables
export const UNIT_CONVERSIONS = {
  length: [
    { from: 'mm', to: 'cm', factor: 0.1 },
    { from: 'cm', to: 'm', factor: 0.01 },
    { from: 'm', to: 'km', factor: 0.001 },
    { from: 'cm', to: 'mm', factor: 10 },
    { from: 'm', to: 'cm', factor: 100 },
    { from: 'km', to: 'm', factor: 1000 },
  ],
  weight: [
    { from: 'g', to: 'kg', factor: 0.001 },
    { from: 'kg', to: 'g', factor: 1000 },
    { from: 'kg', to: 't', factor: 0.001 },
    { from: 't', to: 'kg', factor: 1000 },
  ],
  volume: [
    { from: 'mL', to: 'L', factor: 0.001 },
    { from: 'L', to: 'mL', factor: 1000 },
  ],
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeChoices(answer, count = 4, spread = 10) {
  const choices = new Set()
  choices.add(answer)
  let attempts = 0
  while (choices.size < count && attempts < 100) {
    const offset = randInt(1, spread) * (Math.random() < 0.5 ? -1 : 1)
    const wrong = answer + offset
    if (wrong > 0 && wrong !== answer) {
      choices.add(wrong)
    }
    attempts++
  }
  while (choices.size < count) {
    choices.add(answer + choices.size)
  }
  return shuffle([...choices])
}

// Problem generators

export function generateArithmeticProblem(level) {
  let a, b, op, answer, text

  switch (level) {
    case 1: { // +/- within 20
      op = Math.random() < 0.5 ? '+' : '-'
      if (op === '+') {
        a = randInt(1, 10)
        b = randInt(1, 10)
        answer = a + b
      } else {
        a = randInt(2, 18)
        b = randInt(1, a - 1)
        answer = a - b
      }
      text = `${a} ${op} ${b} = ?`
      break
    }
    case 2: { // +/- within 100
      op = Math.random() < 0.5 ? '+' : '-'
      if (op === '+') {
        a = randInt(10, 50)
        b = randInt(10, 49)
        answer = a + b
      } else {
        a = randInt(20, 99)
        b = randInt(1, a - 1)
        answer = a - b
      }
      text = `${a} ${op} ${b} = ?`
      break
    }
    case 3: { // x within 9x9
      a = randInt(2, 9)
      b = randInt(2, 9)
      answer = a * b
      text = `${a} × ${b} = ?`
      break
    }
    case 4: { // ÷ exact division within 81
      b = randInt(2, 9)
      answer = randInt(1, 9)
      a = b * answer
      text = `${a} ÷ ${b} = ?`
      break
    }
    case 5: { // mixed +/-/x/÷ within 100
      const ops = ['+', '-', '×', '÷']
      op = ops[randInt(0, 3)]
      if (op === '+') {
        a = randInt(10, 50)
        b = randInt(10, 49)
        answer = a + b
      } else if (op === '-') {
        a = randInt(20, 99)
        b = randInt(1, a - 1)
        answer = a - b
      } else if (op === '×') {
        a = randInt(2, 9)
        b = randInt(2, 9)
        answer = a * b
      } else {
        b = randInt(2, 9)
        answer = randInt(1, 9)
        a = b * answer
      }
      text = `${a} ${op} ${b} = ?`
      break
    }
    case 6: { // two-digit x one-digit
      a = randInt(11, 99)
      b = randInt(2, 9)
      answer = a * b
      text = `${a} × ${b} = ?`
      break
    }
    case 7: { // three-digit +/-
      op = Math.random() < 0.5 ? '+' : '-'
      if (op === '+') {
        a = randInt(100, 500)
        b = randInt(100, 499)
        answer = a + b
      } else {
        a = randInt(200, 999)
        b = randInt(100, a - 1)
        answer = a - b
      }
      text = `${a} ${op} ${b} = ?`
      break
    }
    default: { // level 8+: mixed with larger numbers
      const ops = ['+', '-', '×', '÷']
      op = ops[randInt(0, 3)]
      if (op === '+') {
        a = randInt(100, 500)
        b = randInt(100, 499)
        answer = a + b
      } else if (op === '-') {
        a = randInt(200, 999)
        b = randInt(100, a - 1)
        answer = a - b
      } else if (op === '×') {
        a = randInt(11, 50)
        b = randInt(2, 9)
        answer = a * b
      } else {
        b = randInt(2, 9)
        answer = randInt(10, 50)
        a = b * answer
      }
      text = `${a} ${op} ${b} = ?`
      break
    }
  }

  return { text, answer }
}

export function generateFractionProblem(level) {
  switch (level) {
    case 1: { // identify fraction from picture description
      const denom = randInt(2, 6)
      const numer = randInt(1, denom - 1)
      const text = `전체 ${denom}칸 중 ${numer}칸이 색칠되어 있어요. 분수로 나타내면?`
      const answer = `${numer}/${denom}`
      const wrongChoices = new Set()
      wrongChoices.add(answer)
      while (wrongChoices.size < 4) {
        const wn = randInt(1, denom)
        const wd = randInt(2, 8)
        const w = `${wn}/${wd}`
        if (w !== answer) wrongChoices.add(w)
      }
      return { text, answer, choices: shuffle([...wrongChoices]) }
    }
    case 2: { // compare fractions (same denominator)
      const denom = randInt(3, 8)
      const n1 = randInt(1, denom - 1)
      let n2 = randInt(1, denom - 1)
      while (n2 === n1) n2 = randInt(1, denom - 1)
      const bigger = n1 > n2 ? `${n1}/${denom}` : `${n2}/${denom}`
      const text = `${n1}/${denom} 과 ${n2}/${denom} 중 더 큰 수는?`
      const choices = shuffle([`${n1}/${denom}`, `${n2}/${denom}`, '같다'])
      return { text, answer: bigger, choices }
    }
    case 3: { // add fractions same denominator
      const denom = randInt(3, 8)
      const n1 = randInt(1, denom - 2)
      const n2 = randInt(1, denom - n1)
      const sum = n1 + n2
      const answer = `${sum}/${denom}`
      const text = `${n1}/${denom} + ${n2}/${denom} = ?`
      const wrongChoices = new Set()
      wrongChoices.add(answer)
      while (wrongChoices.size < 4) {
        const wn = randInt(1, denom)
        const wd = [denom, denom * 2, denom + 1][randInt(0, 2)]
        const w = `${wn}/${wd}`
        if (w !== answer) wrongChoices.add(w)
      }
      return { text, answer, choices: shuffle([...wrongChoices]) }
    }
    case 4: { // subtract fractions same denominator
      const denom = randInt(3, 8)
      const n1 = randInt(2, denom - 1)
      const n2 = randInt(1, n1 - 1)
      const diff = n1 - n2
      const answer = `${diff}/${denom}`
      const text = `${n1}/${denom} - ${n2}/${denom} = ?`
      const wrongChoices = new Set()
      wrongChoices.add(answer)
      while (wrongChoices.size < 4) {
        const wn = randInt(1, denom)
        const wd = [denom, denom * 2, denom + 1][randInt(0, 2)]
        const w = `${wn}/${wd}`
        if (w !== answer) wrongChoices.add(w)
      }
      return { text, answer, choices: shuffle([...wrongChoices]) }
    }
    default: { // level 5: add fractions different denominator (simple)
      const pairs = [[2, 4], [2, 6], [3, 6], [2, 3], [3, 9], [4, 8]]
      const [d1, d2] = pairs[randInt(0, pairs.length - 1)]
      const n1 = randInt(1, d1 - 1)
      const n2 = randInt(1, d2 - 1)
      const lcd = Math.max(d1, d2) // one always divides the other in these pairs
      const sumNumer = n1 * (lcd / d1) + n2 * (lcd / d2)
      // simplify
      function gcd(a, b) { return b === 0 ? a : gcd(b, a % b) }
      const g = gcd(sumNumer, lcd)
      const answer = `${sumNumer / g}/${lcd / g}`
      const text = `${n1}/${d1} + ${n2}/${d2} = ?`
      const wrongChoices = new Set()
      wrongChoices.add(answer)
      wrongChoices.add(`${n1 + n2}/${d1 + d2}`) // common mistake
      while (wrongChoices.size < 4) {
        const wn = randInt(1, lcd)
        const wd = [lcd, d1, d2][randInt(0, 2)]
        const w = `${wn}/${wd}`
        if (w !== answer) wrongChoices.add(w)
      }
      return { text, answer, choices: shuffle([...wrongChoices]) }
    }
  }
}

export function generateShapeProblem(level) {
  switch (level) {
    case 1: { // identify shape name
      const shape = SHAPES[randInt(0, SHAPES.length - 1)]
      const text = `이 도형의 이름은? (${shape.en})`
      const answer = shape.kr
      const wrongChoices = new Set()
      wrongChoices.add(answer)
      while (wrongChoices.size < 4) {
        const other = SHAPES[randInt(0, SHAPES.length - 1)]
        wrongChoices.add(other.kr)
      }
      return { text, answer, choices: shuffle([...wrongChoices]) }
    }
    case 2: { // count sides
      const candidates = SHAPES.filter(s => s.sides > 0)
      const shape = candidates[randInt(0, candidates.length - 1)]
      const text = `${shape.kr}의 변의 수는?`
      const answer = shape.sides
      return { text, answer, choices: shuffle(makeChoices(answer, 4, 3)) }
    }
    case 3: { // calculate perimeter of rectangle
      const w = randInt(2, 15)
      const h = randInt(2, 15)
      const answer = (w + h) * 2
      const text = `가로 ${w}cm, 세로 ${h}cm인 직사각형의 둘레는?`
      return { text, answer, choices: shuffle(makeChoices(answer, 4, 8)) }
    }
    case 4: { // calculate area of rectangle
      const w = randInt(2, 12)
      const h = randInt(2, 12)
      const answer = w * h
      const text = `가로 ${w}cm, 세로 ${h}cm인 직사각형의 넓이는? (cm²)`
      return { text, answer, choices: shuffle(makeChoices(answer, 4, 15)) }
    }
    default: { // level 5: mixed
      const sub = randInt(1, 4)
      return generateShapeProblem(sub)
    }
  }
}

export function generateUnitProblem(level) {
  let conversions, conv, value, answer, text

  switch (level) {
    case 1: // cm <-> mm
      conversions = UNIT_CONVERSIONS.length.filter(
        c => (c.from === 'cm' && c.to === 'mm') || (c.from === 'mm' && c.to === 'cm')
      )
      break
    case 2: // m <-> cm
      conversions = UNIT_CONVERSIONS.length.filter(
        c => (c.from === 'm' && c.to === 'cm') || (c.from === 'cm' && c.to === 'm')
      )
      break
    case 3: // km <-> m
      conversions = UNIT_CONVERSIONS.length.filter(
        c => (c.from === 'km' && c.to === 'm') || (c.from === 'm' && c.to === 'km')
      )
      break
    case 4: // g <-> kg
      conversions = UNIT_CONVERSIONS.weight
      break
    case 5: // mL <-> L
      conversions = UNIT_CONVERSIONS.volume
      break
    default: { // level 6: mixed
      const allConversions = [
        ...UNIT_CONVERSIONS.length,
        ...UNIT_CONVERSIONS.weight,
        ...UNIT_CONVERSIONS.volume,
      ]
      conversions = allConversions
      break
    }
  }

  conv = conversions[randInt(0, conversions.length - 1)]

  // pick a nice value
  if (conv.factor >= 1) {
    value = randInt(1, 10)
  } else {
    value = randInt(1, 10) * (1 / conv.factor)
  }

  answer = value * conv.factor
  // clean up floating point
  answer = Math.round(answer * 1000) / 1000

  text = `${value}${conv.from} = ?${conv.to}`

  const spread = Math.max(Math.abs(answer) * 0.5, 10)
  const choices = new Set()
  choices.add(answer)
  // common wrong answers
  choices.add(value * conv.factor * 10)
  choices.add(value * conv.factor / 10)
  while (choices.size < 4) {
    const wrong = answer * [0.1, 10, 100, 0.01][randInt(0, 3)]
    if (wrong > 0 && wrong !== answer) choices.add(Math.round(wrong * 1000) / 1000)
  }
  while (choices.size < 4) {
    choices.add(answer + randInt(1, 100))
  }

  return { text, answer, choices: shuffle([...choices]) }
}

export function generateClockProblem(level) {
  let hour, minute

  switch (level) {
    case 1: // exact hours
      hour = randInt(1, 12)
      minute = 0
      break
    case 2: // half hours
      hour = randInt(1, 12)
      minute = Math.random() < 0.5 ? 0 : 30
      break
    case 3: // quarter hours
      hour = randInt(1, 12)
      minute = [0, 15, 30, 45][randInt(0, 3)]
      break
    case 4: // 5-minute intervals
      hour = randInt(1, 12)
      minute = randInt(0, 11) * 5
      break
    default: // level 5: any minute
      hour = randInt(1, 12)
      minute = randInt(0, 59)
      break
  }

  const answer = `${hour}:${String(minute).padStart(2, '0')}`
  const text = '시계가 가리키는 시간은?'

  const choices = new Set()
  choices.add(answer)
  while (choices.size < 4) {
    let wh = hour + randInt(-2, 2)
    if (wh < 1) wh += 12
    if (wh > 12) wh -= 12
    let wm
    if (level <= 2) {
      wm = [0, 30][randInt(0, 1)]
    } else if (level === 3) {
      wm = [0, 15, 30, 45][randInt(0, 3)]
    } else if (level === 4) {
      wm = randInt(0, 11) * 5
    } else {
      wm = randInt(0, 59)
    }
    const wrong = `${wh}:${String(wm).padStart(2, '0')}`
    if (wrong !== answer) choices.add(wrong)
  }

  return { hour, minute, text, answer, choices: shuffle([...choices]) }
}
