// 가족 구성원 정보
export const familyMembers = [
  { id: 'dad', name: '아빠(친)', emoji: '👨‍🦳', gender: 'M', generation: 1 },
  { id: 'mom', name: '엄마(친)', emoji: '👩‍🦳', gender: 'F', generation: 1 },
  { id: 'father_in_law', name: '장인어른', emoji: '👴', gender: 'M', generation: 1 },
  { id: 'mother_in_law', name: '장모님', emoji: '👵', gender: 'F', generation: 1 },
  { id: 'sister', name: '누나', emoji: '👩', gender: 'F', generation: 2 },
  { id: 'brother_in_law', name: '매형', emoji: '👨', gender: 'M', generation: 2 },
  { id: 'me', name: '노근수', emoji: '🧑', gender: 'M', generation: 2 },
  { id: 'wife', name: '이인수', emoji: '👩', gender: 'F', generation: 2 },
  { id: 'wife_brother', name: '처남', emoji: '👨', gender: 'M', generation: 2 },
  { id: 'wife_brother_wife', name: '처남댁', emoji: '👩', gender: 'F', generation: 2 },
  { id: 'nephew', name: '조카', emoji: '👦', gender: 'M', generation: 3 },
  { id: 'son1', name: '노건우', emoji: '👦', gender: 'M', generation: 3 },
  { id: 'son2', name: '노승우', emoji: '👦', gender: 'M', generation: 3 },
]

// 배우자 연결
export const spouseLinks = [
  ['dad', 'mom'],
  ['father_in_law', 'mother_in_law'],
  ['sister', 'brother_in_law'],
  ['me', 'wife'],
  ['wife_brother', 'wife_brother_wife'],
]

// 부모 → 자녀 연결 (부모 쌍 → 자녀들)
export const parentChildLinks = [
  { parents: ['dad', 'mom'], children: ['sister', 'me'] },
  { parents: ['father_in_law', 'mother_in_law'], children: ['wife', 'wife_brother'] },
  { parents: ['sister', 'brother_in_law'], children: ['nephew'] },
  { parents: ['me', 'wife'], children: ['son1', 'son2'] },
]

// 선택된 인물 기준 호칭 매핑
// relationshipLabels[viewer][target] = 호칭
export const relationshipLabels = {
  // "나" 기준
  me: {
    dad: '아빠',
    mom: '엄마',
    father_in_law: '장인어른',
    mother_in_law: '장모님',
    wife: '아내',
    sister: '누나',
    brother_in_law: '매형',
    nephew: '조카',
    son1: '큰아들',
    son2: '작은아들',
    wife_brother: '처남',
    wife_brother_wife: '처남댁',
  },

  // "아내" 기준
  wife: {
    me: '남편',
    dad: '시아버지',
    mom: '시어머니',
    father_in_law: '친정아빠',
    mother_in_law: '친정엄마',
    sister: '형님',
    brother_in_law: '아주버님',
    nephew: '조카',
    son1: '큰아들',
    son2: '작은아들',
    wife_brother: '남동생',
    wife_brother_wife: '동서',
  },

  // "큰아들" 기준
  son1: {
    me: '아빠',
    wife: '엄마',
    dad: '할아버지',
    mom: '할머니',
    father_in_law: '외할아버지',
    mother_in_law: '외할머니',
    sister: '고모',
    brother_in_law: '고모부',
    nephew: '사촌',
    son2: '동생',
    wife_brother: '외삼촌',
    wife_brother_wife: '외숙모',
  },

  // "작은아들" 기준
  son2: {
    me: '아빠',
    wife: '엄마',
    dad: '할아버지',
    mom: '할머니',
    father_in_law: '외할아버지',
    mother_in_law: '외할머니',
    sister: '고모',
    brother_in_law: '고모부',
    nephew: '사촌',
    son1: '형',
    wife_brother: '외삼촌',
    wife_brother_wife: '외숙모',
  },

  // "아빠" 기준
  dad: {
    me: '아들',
    wife: '며느리',
    mom: '아내',
    father_in_law: '사돈',
    mother_in_law: '사돈',
    sister: '딸',
    brother_in_law: '사위',
    nephew: '외손주',
    son1: '손자',
    son2: '손자',
    wife_brother: '사돈',
    wife_brother_wife: '사돈',
  },

  // "엄마" 기준
  mom: {
    me: '아들',
    wife: '며느리',
    dad: '남편',
    father_in_law: '사돈',
    mother_in_law: '사돈',
    sister: '딸',
    brother_in_law: '사위',
    nephew: '외손주',
    son1: '손자',
    son2: '손자',
    wife_brother: '사돈',
    wife_brother_wife: '사돈',
  },

  // "누나" 기준
  sister: {
    me: '남동생',
    wife: '올케',
    dad: '아빠',
    mom: '엄마',
    father_in_law: '사돈',
    mother_in_law: '사돈',
    brother_in_law: '남편',
    nephew: '아들',
    son1: '조카',
    son2: '조카',
    wife_brother: '사돈',
    wife_brother_wife: '사돈',
  },

  // "매형" 기준
  brother_in_law: {
    me: '처남',
    wife: '처남댁',
    dad: '장인어른',
    mom: '장모님',
    father_in_law: '사돈',
    mother_in_law: '사돈',
    sister: '아내',
    nephew: '아들',
    son1: '조카',
    son2: '조카',
    wife_brother: '사돈',
    wife_brother_wife: '사돈',
  },

  // "조카" 기준
  nephew: {
    me: '외삼촌',
    wife: '외숙모',
    dad: '외할아버지',
    mom: '외할머니',
    father_in_law: '외증조부',
    mother_in_law: '외증조모',
    sister: '엄마',
    brother_in_law: '아빠',
    son1: '외사촌',
    son2: '외사촌',
    wife_brother: '외삼촌',
    wife_brother_wife: '외숙모',
  },

  // "장인어른" 기준
  father_in_law: {
    me: '사위',
    wife: '딸',
    dad: '사돈',
    mom: '사돈',
    mother_in_law: '아내',
    sister: '사돈',
    brother_in_law: '사돈',
    nephew: '사돈손주',
    son1: '외손자',
    son2: '외손자',
    wife_brother: '아들',
    wife_brother_wife: '며느리',
  },

  // "장모님" 기준
  mother_in_law: {
    me: '사위',
    wife: '딸',
    dad: '사돈',
    mom: '사돈',
    father_in_law: '남편',
    sister: '사돈',
    brother_in_law: '사돈',
    nephew: '사돈손주',
    son1: '외손자',
    son2: '외손자',
    wife_brother: '아들',
    wife_brother_wife: '며느리',
  },

  // "처남" 기준
  wife_brother: {
    me: '매형',
    wife: '누나',
    dad: '사돈',
    mom: '사돈',
    father_in_law: '아빠',
    mother_in_law: '엄마',
    sister: '사돈',
    brother_in_law: '사돈',
    nephew: '사돈조카',
    son1: '조카',
    son2: '조카',
    wife_brother_wife: '아내',
  },

  // "처남댁" 기준
  wife_brother_wife: {
    me: '형님',
    wife: '형님',
    dad: '사돈',
    mom: '사돈',
    father_in_law: '시아버지',
    mother_in_law: '시어머니',
    sister: '사돈',
    brother_in_law: '사돈',
    nephew: '사돈조카',
    son1: '조카',
    son2: '조카',
    wife_brother: '남편',
  },
}

// SVG 레이아웃 좌표 (viewBox 1000x700 기준)
export const nodePositions = {
  // 1세대 (y=80)
  dad:            { x: 200, y: 80 },
  mom:            { x: 340, y: 80 },
  father_in_law:  { x: 660, y: 80 },
  mother_in_law:  { x: 800, y: 80 },

  // 2세대 (y=300)
  sister:         { x: 130, y: 300 },
  brother_in_law: { x: 270, y: 300 },
  me:             { x: 500, y: 300 },
  wife:           { x: 640, y: 300 },
  wife_brother:   { x: 780, y: 300 },
  wife_brother_wife: { x: 920, y: 300 },

  // 3세대 (y=520)
  nephew: { x: 200, y: 520 },
  son1:   { x: 500, y: 520 },
  son2:   { x: 640, y: 520 },
}
