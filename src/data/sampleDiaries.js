// 그림일기 샘플 데이터 — 건우의 실제 일기 23편 (2026-02-07 ~ 03-01)
// v4 200컷 — 진짜 웹툰처럼 이어지는 카메라 무빙 + 풍부한 말풍선/내레이션/효과음
import { CHILD1 } from '../config/names'

export const FAMILY_CHARACTERS = [
  { id: 'dad',     label: '아빠',  image: '/diary/dad_geunsu_B_webtoon.png',     color: '#4895EF' },
  { id: 'mom',     label: '엄마',  image: '/diary/mom_insu_B_webtoon.png',       color: '#06D6A0' },
  { id: 'child1',  label: '형',    image: '/diary/gunwoo_B_webtoon.png',         color: '#FF9F1C' },
  { id: 'child2',  label: '동생',  image: '/diary/son_seungwoo_B_webtoon.png',   color: '#EF476F' },
]

const PIC = {
  dad:     '/diary/dad_geunsu_B_webtoon.png',
  mom:     '/diary/mom_insu_B_webtoon.png',
  child1:  '/diary/gunwoo_B_webtoon.png',
  child2:  '/diary/son_seungwoo_B_webtoon.png',
}

// 웹툰 컷 헬퍼
const p = (obj) => ({ image: PIC.child1, ...obj })

// 컬러 (캐릭터 음성 매핑)
const COL = {
  me:   '#1a1a1a',
  bro:  '#EF476F',
  dad:  '#4895EF',
  mom:  '#06D6A0',
  big:  '#FF9F1C',
  red:  '#E63946',
  yellow: '#FFB703',
  green: '#06D6A0',
  blue: '#118AB2',
}

export const SAMPLE_DIARIES = [
  {
    id: 'sample_20260207', author: CHILD1, date: '2026-02-07', title: '친할아버지 생신 잔치',
    body: `오늘은 2026년 2월 7일 토요일이다.
친할아버지 생일잔치를 했다. 갈비도락에서 가족이 다 같이 모여서 고기랑 잡채를 먹었다. 잡채가 진짜 맛있어서 두 번이나 더 떴다.
밥 먹고 우리 집 스카이라운지로 자리를 옮겨서 케익을 잘랐다. 친할아버지가 촛불을 후 끄시고 우리는 짝짝짝 박수를 쳤다.
어른들은 집에 올라가시고, 나·동생·형 셋이서 놀이터로 갔다. 다방구를 하려고 했는데 동생이 자꾸 자전거를 끌고 와서 형이 술래일 땐 자전거를 타겠다고 했다. 그래서 놀이시간의 1/4 정도가 그냥 날아간 것 같다.
다방구를 하니까 동생은 빛의 속도로 잡혔고, 형은 잘만 피해다녔다 (술래는 나였다). 어디서 본 얼굴이 와서 같이 놀자고 해서 2대2로 했다.
집에 와서 사슴벌레 먹이도 갈아주고, 동생과 보글보글4를 했다. 오늘은 보스를 두 마리나 깼다! 참고로 형은 처음에 사슴벌레를 바퀴벌레인 줄 알았다고 했다.`,
    panels: [
      p({ scene: '갈비도락 도착 — 식당 외관',
          narration: '오늘은 친할아버지 생신!',
          bubbles: [{ text: '여기야~ 들어가자!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad }] }),
      p({ scene: '갈비도락 가족 식사',
          bubbles: [
            { text: '생신 축하드려요!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.red },
            { text: '많이 먹어라~', position: 'bottom-right', type: 'speech', tail: 'up-right', color: COL.yellow },
          ],
          sfx: { text: '치이익~', position: 'middle-right', color: COL.red, rotation: -5 } }),
      p({ scene: '잡채 한 입 — 클로즈업',
          bubbles: [{ text: '잡채 맛있어!! 한 번 더~', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }],
          sfx: { text: '냠냠', position: 'top-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '엘리베이터 — 스카이라운지로 이동',
          narration: '식사 끝 → 우리 집 스카이라운지로',
          bubbles: [{ text: '케익 가지러 가자~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad }] }),
      p({ scene: '스카이라운지 케익 도착',
          narration: '야경이 끝내준다…',
          bubbles: [{ text: '와… 케익이다!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.me }] }),
      p({ scene: '촛불 끄기 — 친할아버지 클로즈업',
          bubbles: [{ text: '후-!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.yellow }],
          sfx: { text: '짝짝짝', position: 'bottom-left', color: COL.yellow, rotation: -10 } }),
      p({ scene: '놀이터 다방구 — 동생의 자전거 사기극',
          narration: '어른들 집으로 ↑ 우리 셋 놀이터로 ↓',
          bubbles: [
            { text: '형 술래일 땐 자전거 탈래!', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.bro },
            { text: '그게 무슨...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me },
          ] }),
      p({ scene: '동생의 자전거 반칙 — 리액션',
          bubbles: [{ text: '놀이시간 1/4 날아갔어!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.red }],
          sfx: { text: '하…', position: 'top-right', color: COL.me, rotation: 0 } }),
      p({ scene: '집에서 보글보글4 + 사슴벌레',
          narration: '오늘의 마무리: 게임 + 곤충 케어',
          bubbles: [
            { text: '보스 2마리 깼다!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.green },
            { text: '바퀴벌레 아니고 사슴벌레!', position: 'bottom-right', type: 'speech', tail: 'up-right', color: COL.me },
          ],
          sfx: { text: '클리어!', position: 'middle-right', color: COL.yellow, rotation: -8 } }),
    ],
  },
  {
    id: 'sample_20260208', author: CHILD1, date: '2026-02-08', title: '줄넘기 1050개',
    body: `오늘은 2월 8일이다.
교회에서 골든벨을 했는데 19문제 중 5번째 문제에서 탈락했다. 너무 아쉬워서 진짜 한참 멍했다. 간식으로 짜요짜요를 받고 교회에서 국수를 먹었다.
집에 와서 아빠가 "재밌는 거 할 테니 줄넘기 1000개 하자"고 했다. 100개씩 나눠서 하기로 했는데, 내가 200개를 너무 빨리 끝내서 동생이 의심했다. 결국 50개를 더 해서 나는 1050개, 아빠와 동생은 1000개를 했다.
1등은 동생, 2등은 나, 꼴찌는 아빠. 보상으로 플스4 원피스 해적무쌍4를 13분 했다. 그리고 무한도전을 봤다.`,
    panels: [
      p({ scene: '교회 골든벨 — 와이드',
          narration: '교회 골든벨, 19문제 중…',
          bubbles: [{ text: '5번 문제 정답은?', position: 'top-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '5번 문제에서 탈락 — 리액션',
          bubbles: [{ text: '아... 틀렸다 ㅠㅠ', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.me }],
          sfx: { text: '땡!', position: 'top-right', color: COL.red, rotation: -12 } }),
      p({ scene: '아빠의 줄넘기 1000개 도전',
          narration: '집에 와서…',
          bubbles: [
            { text: '재밌는 거 할 테니, 줄넘기 1000개 어때?', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad },
            { text: '...뭐 재밌는 건데요?', position: 'top-right', type: 'thought', tail: 'down-right', color: COL.me },
          ] }),
      p({ scene: '동생의 의심 — 클로즈업',
          bubbles: [
            { text: '200개 너무 빠른데?!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.bro },
            { text: '...진짠데?', position: 'bottom-right', type: 'speech', tail: 'up-right', color: COL.me },
          ],
          sfx: { text: '의심...', position: 'middle-right', color: COL.red, rotation: -5 } }),
      p({ scene: '저녁 야외 줄넘기 — 와이드',
          narration: '결국 나만 +50개. 총 1050개.',
          sfx: { text: '슝슝슝', position: 'middle-right', color: COL.blue, rotation: 8 } }),
      p({ scene: '저공 드라마틱 점프',
          bubbles: [{ text: '으아... 다리...', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.me }],
          sfx: { text: '헉헉', position: 'top-right', color: COL.red, rotation: -5 } }),
      p({ scene: '카운터 1050 — 디테일',
          sfx: { text: '1050!', position: 'middle-center', color: COL.green, rotation: -10 } }),
      p({ scene: '보상 — 플스4 원피스 13분',
          narration: '동생 1등, 나 2등, 아빠 꼴찌!',
          bubbles: [{ text: '13분이지만... 이게 어디야!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }],
          sfx: { text: '두근', position: 'top-right', color: COL.red, rotation: -8 } }),
    ],
  },
  {
    id: 'sample_20260209', author: CHILD1, date: '2026-02-09', title: '하루 종일 집에서',
    body: `오늘은 2월 9일이다.
하루 종일 집에 있었다. 동생 친구들이 목요일에 오기로 했는데 엄마가 교회 가야 한다고 해서 전화로 금요일로 미뤘다.
왕수학을 꾸역꾸역 풀고, 핫도그를 꿀에 부먹하면서 무한도전을 봤다. 핫도그 + 꿀 + 무한도전은 진짜 황금조합이다.
그 다음 화상영어를 했다. 오늘은 두 번째로 밀푀유나베를 먹었다.`,
    panels: [
      p({ scene: '엄마 — 약속 변경 전화',
          narration: '엄마가 동생 친구들 약속 변경 전화',
          bubbles: [{ text: '금요일로 미뤄도 될까?', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.mom }],
          sfx: { text: '띠리링', position: 'top-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '왕수학 꾸역꾸역 — 오버숄더',
          narration: '하루의 가장 큰 난관: 왕수학',
          bubbles: [{ text: '하... 언제 끝나...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }],
          sfx: { text: '졸려', position: 'top-right', color: COL.me, rotation: 15 } }),
      p({ scene: '핫도그 꿀 부먹 — 디테일',
          sfx: { text: '뚝뚝', position: 'middle-right', color: COL.yellow, rotation: -5 } }),
      p({ scene: '핫도그 + 무한도전 황금조합',
          bubbles: [{ text: '핫도그 + 꿀 = 완벽!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }],
          sfx: { text: '냠냠', position: 'top-right', color: COL.yellow, rotation: -5 } }),
      p({ scene: '화상영어 클로즈업',
          bubbles: [{ text: 'Hello teacher~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '저녁 밀푀유나베 — 가족',
          narration: '두 번째 밀푀유나베!',
          bubbles: [{ text: '맛있다~ 한 번 더!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
    ],
  },
  {
    id: 'sample_20260210', author: CHILD1, date: '2026-02-10', title: '공부 대신 3만원',
    body: `오늘은 2월 10일이다.
엄마가 갑자기 "공부 대신 3만원 내면 안 해도 된다"고 했다. 그래서 보물찾기 게임이 시작됐다. 내가 5만원, 동생이 1만원을 냈고, 동생이 이자 붙여서 나한테 3만원을 준다고 했다.
무한도전을 보다가 이것저것 하고 있는데 아빠가 와서 바로 동계올림픽을 (지루하게) 봤다.`,
    panels: [
      p({ scene: '엄마의 솔깃한 제안',
          narration: '평범한 오후, 갑자기…',
          bubbles: [{ text: '공부 대신 3만원 어때?', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.mom }],
          sfx: { text: '띵-!', position: 'top-right', color: COL.yellow, rotation: -10 } }),
      p({ scene: '나의 충격 리액션',
          bubbles: [{ text: '엥?! 3만원??', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.red }],
          sfx: { text: '두근!', position: 'bottom-right', color: COL.red, rotation: -8 } }),
      p({ scene: '동생도 참전 — 클로즈업',
          bubbles: [{ text: '나도 1만원! 이자 붙여줄게~', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.bro }],
          sfx: { text: '꿍꿍', position: 'middle-right', color: COL.bro, rotation: -5 } }),
      p({ scene: '소파 무한도전 시청',
          bubbles: [{ text: '평화롭다~', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
      p({ scene: '아빠 등장',
          narration: '평화의 시간 끝...',
          bubbles: [{ text: '왔다~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad }] }),
      p({ scene: '아빠 강제 동계올림픽',
          bubbles: [
            { text: '동계올림픽 보자!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.dad },
            { text: '아... 또요?', position: 'bottom-right', type: 'speech', tail: 'up-right', color: COL.me },
          ] }),
    ],
  },
  {
    id: 'sample_20260211', author: CHILD1, date: '2026-02-11', title: '리모컨 전쟁',
    body: `오늘은 2월 11일이다.
동생이 뉴스포츠 방과후를 갔다. 그 사이에 내가 공부를 빛의 속도로 다 했다. 오늘 나만 공부를 다 하면 나만 무한도전을 봐도 된다고 했다.
공부가 끝나서 엄마가 태블릿을 봐도 된다고 했다. 그런데 동생이 돌아와서 "자기가 보던 거 보자"고 졸랐다. 결국 같이 봤다.
6시에 끄라고 엄마가 했는데, 내가 동생한테 끄라고 했더니 그 녀석이 나한테 리모컨을 던졌다! 나도 똑같이 던졌더니 자기가 왜 던지냐며 침대방으로 가버렸다.
화상영어 후에 아빠가 와서 또 밀푀유나베를 먹고 또 (억지로) 동계올림픽을 봤다.`,
    panels: [
      p({ scene: '동생 — 뉴스포츠 출발',
          narration: '동생이 나가는 순간 작전 개시!',
          bubbles: [{ text: '갔다 올게~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.bro }] }),
      p({ scene: '빛의 속도 공부 — 모션 블러',
          bubbles: [{ text: '빛.속.공부 완료!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.green }],
          sfx: { text: '슈슉!', position: 'top-right', color: COL.blue, rotation: 10 } }),
      p({ scene: '태블릿 단독 시청 — 평화',
          bubbles: [{ text: '나만 보는 시간!', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
      p({ scene: '동생 귀가 — 평화 종결',
          bubbles: [
            { text: '왔다!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.bro },
            { text: '...벌써?', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me },
          ] }),
      p({ scene: '태블릿 다툼',
          bubbles: [
            { text: '내가 보던 거 봐!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.bro },
            { text: '아 진짜...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me },
          ] }),
      p({ scene: '리모컨 폭격전 — 와이드',
          narration: '엄마: "6시에 꺼!" → 동생이 던졌다!',
          sfx: { text: '쾅!!', position: 'middle-center', color: COL.red, rotation: -15 } }),
      p({ scene: '동생 침대방 도주',
          bubbles: [{ text: '왜 던지냐고~!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.bro }],
          sfx: { text: '쾅!', position: 'middle-center', color: COL.me, rotation: 8 } }),
      p({ scene: '저녁 또 동계올림픽',
          narration: '저녁: 또 밀푀유나베 + 또 동계올림픽',
          bubbles: [{ text: '오늘도 평화롭게 끝...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
    ],
  },
  {
    id: 'sample_20260212', author: CHILD1, date: '2026-02-12', title: '두바이쫀쿠키 냄새',
    body: `오늘은 2월 12일이다.
아빠랑 자고 6:59에 일어났다. 이상하게 동생도 그 시간에 깼다. 사슴벌레 먹이를 갈아주고, 우유가 없어서 동생은 김에 밥, 나는 시리얼을 먹은 뒤 왕수학을 했다.
동생이 자꾸 우는 소리가 들렸다. 알고 보니 오늘부터 동생은 '공포자'(공부 포기한 자)로 변신했다.
엄마가 두바이쫀쿠키를 사 왔는데, 동생이 자기만 냄새를 맡고 나한테는 1초만 맡게 해주고는 "네 코가 이상한 거야!"라고 뻥을 쳤다.
엄마랑 쓰레기를 버리러 갔다 왔고, 어제 만든 성 사진도 찍었다.`,
    panels: [
      p({ scene: '6:59 기상 — 클로즈업',
          narration: '아빠랑 자고 일어난 시간: 6:59',
          bubbles: [{ text: '음... 일찍 일어났네', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }],
          sfx: { text: '쿵-', position: 'top-right', color: COL.yellow, rotation: 0 } }),
      p({ scene: '동생도 같이 일어남',
          bubbles: [{ text: '어떻게 알고 일어났지?!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.red }],
          sfx: { text: '!?', position: 'middle-right', color: COL.red, rotation: -10 } }),
      p({ scene: '사슴벌레 먹이 — 디테일',
          sfx: { text: '냠냠', position: 'middle-right', color: COL.yellow, rotation: -5 } }),
      p({ scene: '아침 — 우유 없음 비상',
          bubbles: [
            { text: '난 김에 밥...', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.bro },
            { text: '난 시리얼!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me },
          ] }),
      p({ scene: '동생 공포자 변신',
          narration: '"공(부)포(기한)자" 등장!',
          bubbles: [{ text: '으아앙~ 못해!!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.bro }],
          sfx: { text: '엉엉', position: 'middle-right', color: COL.bro, rotation: -5 } }),
      p({ scene: '엄마 — 두바이쫀쿠키 등장',
          bubbles: [{ text: '두바이쫀쿠키 사왔어~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.mom }],
          sfx: { text: '반짝', position: 'top-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '동생의 냄새 독점',
          bubbles: [{ text: '나만 1초 맡았어!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.bro }],
          sfx: { text: '킁킁', position: 'middle-right', color: COL.bro, rotation: -5 } }),
      p({ scene: '냄새 사기 — 리액션',
          bubbles: [
            { text: '네 코가 이상한 거야!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.bro },
            { text: '...뻥치네', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me },
          ] }),
    ],
  },
  {
    id: 'sample_20260213', author: CHILD1, date: '2026-02-13', title: '경찰과 도둑, 배터리 6%',
    body: `오늘은 2월 13일이다.
6:54에 일어났다. 동생 친구 서율이와 지훈이가 왔다. 자장면을 먹고 바깥에서 놀았다. 처음엔 얼음땡, 그 다음엔 짚라인, 그 다음엔 경찰과 도둑.
얼음땡은 나·서율이 vs 동생·지훈이로 편을 먹었다. 내가 정찰 겸 지하 1층까지 갔다가 들켜서 도망가다가 넘어졌다. 우리 팀 폭망.
짚라인을 한 6번쯤 타고, 경찰과 도둑은 나·지훈이 vs 서율이·동생. 빛의 속도로 동생을 찾아내서 잡고 서율이도 잡았다.
나 vs 동생·지훈이가 됐는데, 동생은 내 눈앞에서도 못 잡고 지훈이는 자전거였는데 나무 사이를 왔다갔다 하니 못 잡았다.
배터리가 6%여서 집으로 줄행랑을 쳤다. 폰을 충전하면서 일기를 썼다.
저녁에 식탁 문제로 엄마랑 아빠가 싸웠다. 좀 뻘쭘했다. 정리하고 딸기를 먹으며 또 동계올림픽을 봤다.`,
    panels: [
      p({ scene: '동생 친구들 등장 — 와이드',
          bubbles: [{ text: '서율이! 지훈이! 왔다~', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.bro }] }),
      p({ scene: '로비 자장면 — 네 명',
          narration: '간식은 자장면! 든든하게 충전.',
          bubbles: [{ text: '냠냠 맛있다!', position: 'bottom-right', type: 'speech', tail: 'up-right', color: COL.me }] }),
      p({ scene: '얼음땡 — 놀이터 와이드',
          narration: '얼음땡 → 정찰 작전 개시',
          bubbles: [{ text: '나·서율 vs 동생·지훈! 시작!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.me }] }),
      p({ scene: '지하 1층 정찰 — 저공',
          bubbles: [{ text: '여기까지 와있나...?', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
      p({ scene: '들켜서 도망 + 넘어짐 — 리액션',
          bubbles: [{ text: '으악! 미끄러진다!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.red }],
          sfx: { text: '쿵!', position: 'middle-center', color: COL.red, rotation: -15 } }),
      p({ scene: '짚라인 6연속',
          bubbles: [{ text: '슈우우웅~!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.blue }],
          sfx: { text: '슈웅', position: 'middle-right', color: COL.blue, rotation: 10 } }),
      p({ scene: '경찰과 도둑 — 작전 회의',
          bubbles: [
            { text: '동생부터 잡자', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.me },
            { text: '오케이~', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.blue },
          ] }),
      p({ scene: '동생 빛의 속도 체포',
          bubbles: [{ text: '잡았다!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.green }],
          sfx: { text: '척!', position: 'middle-center', color: COL.green, rotation: -8 } }),
      p({ scene: '나무 사이로 피해다님 — 클로즈업',
          bubbles: [{ text: '지훈인 자전거! 그래도 못 잡지~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }],
          sfx: { text: '슝!', position: 'top-right', color: COL.blue, rotation: 5 } }),
      p({ scene: '폰 — 배터리 6% (디테일)',
          narration: '저주의 숫자: 6%',
          sfx: { text: '경고!', position: 'middle-center', color: COL.red, rotation: -10 } }),
      p({ scene: '집으로 줄행랑',
          bubbles: [{ text: '6%다!! 집!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.red }],
          sfx: { text: '슈웅~', position: 'middle-right', color: COL.blue, rotation: 12 } }),
      p({ scene: '저녁 — 부모님 다툼 옆에서 딸기',
          bubbles: [{ text: '...뻘쭘...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
    ],
  },
  {
    id: 'sample_20260214', author: CHILD1, date: '2026-02-14', title: '파주 아울렛 + 셰프와 사냥꾼',
    body: `오늘은 2월 14일 토요일이다.
아빠·나·동생 셋이서 자고 6:51에 일어났다. 아빠가 고전게임을 하려고 했는데 동생도 깨서 결국 셋이 돌아가면서 했다.
엄마도 일어나서 시리얼을 먹은 뒤 파주 아울렛에 가서 엄마·아빠 옷을 샀다. 우린 옆에서 진짜 지루했다.
집에 와서 동생과 게임을 했다. 저녁을 먹고 딸기를 먹으며 넷플릭스로 '셰프와 사냥꾼'을 봤다. 딸기 + 셰프와 사냥꾼 = 황금조합.`,
    panels: [
      p({ scene: '6:51 기상 — 클로즈업',
          narration: '토요일! 6:51 기상',
          sfx: { text: '하암~', position: 'top-right', color: COL.yellow, rotation: -5 } }),
      p({ scene: '아빠·동생과 고전게임 돌아가며',
          bubbles: [
            { text: '내 차례야!', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.bro },
            { text: '응 30초만 더~', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.dad },
          ] }),
      p({ scene: '파주 아울렛 쇼핑 — 와이드',
          narration: '아울렛에서 엄마·아빠 옷 쇼핑',
          bubbles: [{ text: '이건 어때?', position: 'top-left', type: 'speech', tail: 'down-left', color: COL.mom }] }),
      p({ scene: '지루한 기다림 — 리액션',
          bubbles: [{ text: '아... 지루해...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }],
          sfx: { text: 'Z..z..', position: 'top-right', color: COL.me, rotation: 15 } }),
      p({ scene: '집에 와서 동생과 게임',
          bubbles: [{ text: '한 판 더!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.bro }] }),
      p({ scene: '딸기 + 셰프와 사냥꾼',
          bubbles: [{ text: '딸기 + 넷플릭스 = ❤️', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.red }] }),
    ],
  },
  {
    id: 'sample_20260215', author: CHILD1, date: '2026-02-15', title: '교회 윷놀이 패배',
    body: `오늘은 2월 15일이다.
교회에서 윷놀이를 했는데 우리 팀이 졌다. 간식은 떡볶이. 떡볶이를 먹고 있는데 동생한테 자꾸 전화가 와서 메시지로 대답했다.
형한테 놀 수 있냐 물어보고 나왔는데, 아빠한테 전화가 와서 국수를 못 먹는다고 했다. 형이랑 차를 타고 집으로 왔다.
시리얼을 먹고 바깥에서 놀다가 집에서 플스를 했는데, 세상에서 제일 나쁜 동생 때문에 아빠가 플스를 껐다.
보드게임도 했는데 또 동생 때문에 정리했다. 형이 가고 나와 동생은 티비를 봤다.`,
    panels: [
      p({ scene: '교회 윷놀이 — 와이드',
          narration: '교회 윷놀이! 우리 팀 vs 옆 팀',
          sfx: { text: '와아~!', position: 'top-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '우리 팀 패배 — 리액션',
          bubbles: [{ text: '아... 졌어...', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.me }] }),
      p({ scene: '간식 떡볶이 — 클로즈업',
          bubbles: [{ text: '매콤! 맛있다!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.red }],
          sfx: { text: '냠냠', position: 'top-right', color: COL.red, rotation: -5 } }),
      p({ scene: '집에서 시리얼',
          bubbles: [{ text: '시리얼 한 그릇 더!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '플스 다툼 + 동생 사고',
          narration: '세상에서 제일 나쁜 동생...',
          bubbles: [{ text: '#$%@!!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.bro }] }),
      p({ scene: '아빠의 플스 OFF — 저공',
          bubbles: [
            { text: '꺼!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.dad },
            { text: '왜요...?', position: 'bottom-right', type: 'speech', tail: 'up-right', color: COL.me },
          ],
          sfx: { text: '딸깍', position: 'middle-right', color: COL.me, rotation: 0 } }),
      p({ scene: '형 가고 — TV 시청',
          bubbles: [{ text: '오늘도 끝...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
    ],
  },
  {
    id: 'sample_20260216', author: CHILD1, date: '2026-02-16', title: '5:54 기상 + 외할머니댁',
    body: `오늘은 2월 16일이다.
5:54에 일어났다. 이유는 아빠가 티비를 먼저 보고 있었기 때문이다.
외할머니댁에 가서 티비도 보고, 밥도 먹고, 세배도 하고, 삼촌도 뵙고, 저녁밥도 먹었다.
폰 배터리가 나올 때 6%였는데 집에 왔을 때는 70%였다. 충전 신기록!
집에 와서 동계올림픽을 보고 마니또 클럽을 봤다.`,
    panels: [
      p({ scene: '알람 시계 5:54 — 디테일',
          narration: '아빠한테 TV 빼앗기지 않으려고…',
          sfx: { text: '5:54', position: 'middle-center', color: COL.red, rotation: -10 } }),
      p({ scene: 'TV 선점 작전 — 와이드',
          bubbles: [{ text: '5:54?! 아빠한테 졌네...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }],
          sfx: { text: '띠리리~', position: 'top-right', color: COL.dad, rotation: -5 } }),
      p({ scene: '외할머니댁 도착',
          bubbles: [
            { text: '왔구나~ 어서 와!', position: 'top-left', type: 'speech', tail: 'down-left', color: COL.mom },
            { text: '안녕하세요!', position: 'bottom-right', type: 'speech', tail: 'up-right', color: COL.me },
          ] }),
      p({ scene: '세배 — 미디엄',
          bubbles: [{ text: '새해 복 많이 받으세요!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '대가족 식사',
          bubbles: [{ text: '많이 먹어라~', position: 'top-left', type: 'speech', tail: 'down-left', color: COL.mom }] }),
      p({ scene: '폰 — 70% 충전 신기록 (디테일)',
          narration: '폰: 6% → 70%!',
          sfx: { text: '70%✨', position: 'middle-center', color: COL.green, rotation: -10 } }),
      p({ scene: '집 — 또 동계올림픽',
          bubbles: [{ text: '오늘도 동계올림픽...', position: 'bottom-right', type: 'thought', tail: 'up-right', color: COL.me }] }),
    ],
  },
  {
    id: 'sample_20260217', author: CHILD1, date: '2026-02-17', title: '루미큐브 + 세뱃돈 15만원',
    body: `오늘은 2월 17일이다.
8:06에 일어났다. 시리얼을 먹고 친할머니댁으로 갔다. 주차 자리가 없어서 나와 엄마만 먼저 내렸다.
대성이형네가 와서 루미큐브를 3판 했다. 1·2판은 개인전 — 승자는 다 아빠, 패자는 다 동생.
3번째는 팀전. 칩 뽑아서 같은 숫자로 팀을 나눴다. 나·아빠, 엄마·동생, 형·고모. 초반엔 엄마팀이 잘했지만, 우리 팀이 후반에 엄청 많은 칩을 깎아내며 1등! 아빠 3연승, 동생 3연패는 면했다.
세배해서 15만원을 받았다! 윷놀이도 했는데 우리 팀이 1번째는 이겼지만 2·3번째는 졌다.`,
    panels: [
      p({ scene: '주차장 부족 — 와이드',
          narration: '주차 자리 없음 → 나·엄마만 먼저 내림',
          bubbles: [{ text: '여긴 자리가 없네...', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.mom }] }),
      p({ scene: '친할머니댁 입장',
          bubbles: [
            { text: '왔구나~', position: 'top-left', type: 'speech', tail: 'down-left', color: COL.mom },
            { text: '안녕하세요!', position: 'bottom-right', type: 'speech', tail: 'up-right', color: COL.me },
          ] }),
      p({ scene: '루미큐브 — 대가족 와이드',
          narration: '1·2판 개인전 — 아빠 우승, 동생 꼴찌',
          bubbles: [{ text: '또 내가 1등!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.dad }],
          sfx: { text: '척!', position: 'middle-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '아빠 3연승 직전 — 클로즈업',
          bubbles: [{ text: '이번에도... 아빠야?!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.bro }],
          sfx: { text: '!!', position: 'top-right', color: COL.red, rotation: -10 } }),
      p({ scene: '아빠·건우 팀 작전 회의',
          bubbles: [
            { text: '아빠 이거 어때요?', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.me },
            { text: '오 좋아!', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.dad },
          ] }),
      p({ scene: '팀전 승리 — 주먹 인사',
          bubbles: [{ text: '우리 팀 1등!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.green }],
          sfx: { text: '✨', position: 'middle-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '대가족 윷놀이',
          sfx: { text: '와아아!', position: 'top-right', color: COL.yellow, rotation: -10 } }),
      p({ scene: '친할머니께 세배',
          bubbles: [{ text: '새해 복 많이 받으세요!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '세뱃돈 15만원!',
          narration: '오늘의 하이라이트!',
          bubbles: [{ text: '15만원!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.green }],
          sfx: { text: '두근✨', position: 'top-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '집 — 저축 결심',
          bubbles: [{ text: '바로 저축해야지!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
    ],
  },
  {
    id: 'sample_20260218', author: CHILD1, date: '2026-02-18', title: '당근마켓 자전거 + 가양대교',
    body: `오늘은 2월 18일이다.
아침으로 시리얼을 먹고 아빠·동생·나 셋이 아빠가 당근마켓에서 산 미니 벨로 자전거를 받으러 갔다. 평화의 광장에 도착.
주차가 무료여서 형네를 부르고, 그 사이 홈플러스에서 자장면을 1인분으로 3명이 나눠 먹었다. 진짜 한 입씩.
형, 고모부, 고모, 친할머니가 오시고 자전거를 타고 가양대교까지 갔다 왔다.
형이 언덕 시합 때 기어를 6으로 맞추고는 모른 척 "기어 3이었어"라고 하고 1등 했다. 내가 2등, 동생 3등.
놀이터에서 다방구를 했는데 형은 가위바위보를 잘해서 술래가 안 됐고, 동생은 한 명도 못 잡았다.
저녁으로 고기를 먹었다.`,
    panels: [
      p({ scene: '당근마켓 미니벨로 인수',
          bubbles: [{ text: '자전거 GET!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.dad }],
          sfx: { text: '짠!', position: 'top-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '평화의 광장 도착',
          narration: '주차 무료! 형네 호출.',
          bubbles: [{ text: '주차 무료다!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad }] }),
      p({ scene: '자장면 1인분 셋이 나눠먹기',
          bubbles: [{ text: '1인분으로 3명...?', position: 'top-right', type: 'thought', tail: 'down-right', color: COL.me }],
          sfx: { text: '꼬르륵', position: 'middle-right', color: COL.yellow, rotation: -5 } }),
      p({ scene: '대가족 자전거 출발',
          narration: '형네 도착! 가양대교까지!',
          bubbles: [{ text: '출발!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.big }] }),
      p({ scene: '한강 자전거 — 라이딩',
          sfx: { text: '슈웅', position: 'middle-right', color: COL.blue, rotation: 10 } }),
      p({ scene: '언덕 시합 — 저공',
          bubbles: [{ text: '내가 1등!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.big }],
          sfx: { text: '헉헉', position: 'bottom-left', color: COL.red, rotation: -5 } }),
      p({ scene: '형의 기어 반칙 폭로',
          bubbles: [
            { text: '난 기어 3이었어!', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.big },
            { text: '...진짜?', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me },
          ] }),
      p({ scene: '놀이터 다방구',
          bubbles: [{ text: '나 술래만 됐어...', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.me }] }),
      p({ scene: '동생 0킬 — 리액션',
          bubbles: [{ text: '한 명도 못 잡았어...', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.bro }],
          sfx: { text: '훌쩍', position: 'top-right', color: COL.bro, rotation: -5 } }),
      p({ scene: '저녁 고기',
          bubbles: [{ text: '오늘은 고기다!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }] }),
    ],
  },
  {
    id: 'sample_20260219', author: CHILD1, date: '2026-02-19', title: '쇼트트랙 금메달 + 베란다 공사 기습',
    body: `오늘은 2월 19일이다. 7:05에 일어났다.
호빵을 먹으면서 쇼트트랙 여자 계주 금메달 소식을 네이버로 봤다. 갑자기 벨이 울려서 봤더니 베란다 공사하러 오신 분들이었다. 그 시간에 폰을 했다.
왕수학을 다 하고, 점심으로 튀김우동라면을 먹고, 사슴벌레 먹이를 갈아준 뒤 무한도전을 보면서 사탕을 초코 3개·딸기 1개 먹었다. 황금비율!
엄마가 끄라고 해서 끄고, 아빠가 와서 가방을 빛의 속도로 봤더니 자전거 자물쇠가 있었다. 아빠와 동생은 차 키 가지러 갔다.
저녁으로 밥, 고기, 고사리, 무를 먹었다. 1등으로 먹고 쇼트트랙을 3번째 봤다. 오랜만에 원피스 영화를 보고 키 크는 약(그로우업 샷)과 요구르트를 먹은 뒤 다시 밀라노 올림픽을 봤다.`,
    panels: [
      p({ scene: '7:05 기상',
          narration: '오늘은 7:05 기상 — 평범한 출발',
          sfx: { text: '하암~', position: 'top-right', color: COL.yellow, rotation: -5 } }),
      p({ scene: '호빵 + 쇼트트랙 금메달',
          bubbles: [{ text: '여자 계주 금메달!!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }],
          sfx: { text: '두근', position: 'top-right', color: COL.red, rotation: -8 } }),
      p({ scene: '베란다 공사 기습 — 띵동!',
          narration: '띵동! 공사 오신 분들...',
          bubbles: [
            { text: '베란다 공사 왔습니다~', position: 'top-left', type: 'speech', tail: 'down-left', color: COL.me },
            { text: '엇! 그럼 폰 해야지!', position: 'bottom-right', type: 'thought', tail: 'up-right', color: COL.me },
          ],
          sfx: { text: '띵동!', position: 'middle-center', color: COL.red, rotation: -10 } }),
      p({ scene: '폰 시간 — 거실',
          bubbles: [{ text: '공사하는 동안 자유시간~', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.green }] }),
      p({ scene: '점심 튀김우동라면',
          bubbles: [{ text: '뜨끈~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }],
          sfx: { text: '후루룩', position: 'top-right', color: COL.yellow, rotation: -5 } }),
      p({ scene: '사슴벌레 — 디테일',
          sfx: { text: '냠냠', position: 'middle-right', color: COL.yellow, rotation: -5 } }),
      p({ scene: '사탕 황금비율 (초코3 + 딸기1)',
          bubbles: [{ text: '이게 황금비율이야~', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }] }),
      p({ scene: '아빠 가방 빛속 스캔',
          narration: '아빠 가방 → 자전거 자물쇠 발견',
          bubbles: [{ text: '자전거 자물쇠다!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.green }],
          sfx: { text: '척!', position: 'middle-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '저녁 가족 식사',
          bubbles: [{ text: '1등으로 먹었다!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.me }] }),
      p({ scene: '원피스 영화 시간',
          bubbles: [{ text: '오랜만에 원피스!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
    ],
  },
  {
    id: 'sample_20260220', author: CHILD1, date: '2026-02-20', title: '몸무게 30kg 돌파 + 영광의 3점',
    body: `오늘은 2월 20일이다.
드디어 몸무게가 30kg이 됐다! 그래서 3점을 얻었다. 영광의 3점!
호빵을 먹고 바로 왕수학을 했다. 점심으로 나와 동생은 라면 육개장, 엄마는 햇반을 드셨다.
공부를 다 하고 화상영어를 했다. 메소드 연기 발휘! 아빠한테 전화가 와서 동생이 나갔다. 우유 등을 사오고 '셰프와 사냥꾼'을 보고 샤워를 한 뒤 '나혼자 산다'를 봤다.`,
    panels: [
      p({ scene: '체중계 30kg — 클로즈업',
          narration: '드디어 30kg!',
          sfx: { text: '30!!', position: 'middle-center', color: COL.green, rotation: -10 } }),
      p({ scene: '영광의 3점 — 리액션',
          bubbles: [{ text: '영광의 3점!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.green }],
          sfx: { text: '✨', position: 'top-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '아침 호빵',
          bubbles: [{ text: '오늘도 호빵!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '왕수학 — 오버숄더',
          bubbles: [{ text: '집중!', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
      p({ scene: '점심 라면 육개장 / 햇반',
          bubbles: [
            { text: '라면 최고!', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.bro },
            { text: '난 햇반~', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.mom },
          ] }),
      p({ scene: '화상영어 — 메소드 연기',
          bubbles: [{ text: 'Oh my goodness!!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.me }],
          sfx: { text: '연기 폭발', position: 'top-right', color: COL.red, rotation: -8 } }),
      p({ scene: '동생 — 우유 원정',
          bubbles: [{ text: '우유 사러 가자~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad }] }),
      p({ scene: '셰프와 사냥꾼 + 나혼자 산다',
          narration: '저녁 TV 풀코스',
          bubbles: [{ text: '오늘은 TV 풀코스!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.big }] }),
    ],
  },
  {
    id: 'sample_20260221', author: CHILD1, date: '2026-02-21', title: '성경학교 + 보물찾기 0개',
    body: `오늘은 2월 21일 토요일이다.
유초등부 성경학교에 갔다. 오랜만에 배주하랑도 보고 셋이서 예배 시작 전에 놀았다.
예배 시작하려는데 갑자기 꼬리잡기 게임을 했다. 가위바위보 져서 이긴 사람 뒤에 붙는 방식. 형 팀 vs 내 팀이었는데 우리 팀이 졌다.
예배 후 공과공부 때 선생님이 나한테 기도하라고 하셨는데, 교재에 있는 걸 읽기만 하면 된다고 하셔서 다행이었다.
김밥, 떡볶이 or 어묵(난 떡볶이·동생은 어묵), 서오릉 피자, 주스, 과일을 먹었다. 뽑기에서 꼴찌인 5등이 나왔다.
한국 기독교 역사 문화관을 갔다 와서 보물찾기를 했는데 동생 1개, 형 1개, 배주하 2개. 나는 0개를 찾았다! 다른 선생님이 보물 대신 간식을 주셨다.
순살치킨을 먹고 엄마가 와서 집에 갔다. 토스트 먹고 플스4 하고 '놀면 뭐하니'를 봤다.`,
    panels: [
      p({ scene: '성경학교 친구 재회',
          narration: '오랜만에 배주하!',
          bubbles: [{ text: '오랜만이야~!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }] }),
      p({ scene: '꼬리잡기 — 와이드',
          narration: '형 팀 vs 내 팀',
          sfx: { text: '슈웅', position: 'middle-right', color: COL.blue, rotation: 10 } }),
      p({ scene: '꼬리잡기 패배 — 리액션',
          bubbles: [{ text: '아 또 졌어 ㅠㅠ', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.me }] }),
      p({ scene: '공과 — 기도 지명',
          bubbles: [
            { text: '교재 읽기만 하면 돼~', position: 'top-left', type: 'speech', tail: 'down-left', color: COL.green },
            { text: '...휴 다행', position: 'bottom-right', type: 'thought', tail: 'up-right', color: COL.me },
          ] }),
      p({ scene: '간식 선택 — 떡볶이파/어묵파',
          bubbles: [
            { text: '난 떡볶이!', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.me },
            { text: '난 어묵!', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.bro },
          ] }),
      p({ scene: '한국 기독교 역사 문화관',
          bubbles: [{ text: '오~ 신기한데?', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '보물찾기 — 와이드',
          bubbles: [{ text: '어디 있지...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
      p({ scene: '0개의 굴욕 — 리액션',
          narration: '동생 1, 형 1, 배주하 2, 나 0!!',
          bubbles: [{ text: '...0개?!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.red }],
          sfx: { text: '으아악', position: 'middle-right', color: COL.red, rotation: -10 } }),
      p({ scene: '집에서 플스4 회복',
          bubbles: [{ text: '플스로 회복한다!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }] }),
    ],
  },
  {
    id: 'sample_20260222', author: CHILD1, date: '2026-02-22', title: '고사리 비빔밥 + 우주선 vs 성당',
    body: `오늘은 2월 22일 일요일이다.
아침으로 고사리 비빔밥을 먹었다. 유초등부에 안 갔다. 아빠가 교회를 안 가서 걸어갔다 왔다.
점심 전에 엄마가 깨를 옮기라고 해서 옮긴 뒤, 동생은 튀김우동·나와 엄마는 새우탕을 1컵 나눠 먹고, 내가 옮긴 깨를 넣은 주먹밥을 먹었다.
'만공'(만들면서 공부)을 하자고 해서 내가 우주선을 만들고, 엄마는 러시아의 성 바실리 대성당을 만들었다.
아빠와 동생이 자전거를 타자고 했는데 안 간다고 하자 아빠가 내 귀를 당겼다! 엄마가 가지 말라고 했다.
나와 엄마는 집에서 정리하고 삼국지를 봤다. 아빠와 동생이 MBC를 갔다 왔는데, 아빠가 어제 못 들어간다고 했는데 들어갔다고 했다.
저녁으로 고기와 비빔밥. 넷플릭스 '도라이버' 보기 전에 교회에서 받은 롤케익을 먹었다.`,
    panels: [
      p({ scene: '아침 고사리 비빔밥 — 클로즈업',
          bubbles: [{ text: '나물 비빔밥 맛있다~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }],
          sfx: { text: '척척', position: 'top-right', color: COL.yellow, rotation: -5 } }),
      p({ scene: '아빠 걸어서 교회',
          narration: '아빠 차 안 가져감 → 걸어서…',
          bubbles: [{ text: '오늘은 걸어서~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad }] }),
      p({ scene: '엄마의 강제 노동 (깨 옮기기)',
          bubbles: [
            { text: '깨 옮겨~', position: 'top-left', type: 'speech', tail: 'down-left', color: COL.mom },
            { text: '하... 또 노동...', position: 'bottom-right', type: 'thought', tail: 'up-right', color: COL.me },
          ] }),
      p({ scene: '점심 새우탕 + 주먹밥',
          bubbles: [{ text: '내가 옮긴 깨가 들어있어!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '만공 — 우주선 완성!',
          bubbles: [{ text: '우주선 발사~!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.blue }],
          sfx: { text: '슈웅✨', position: 'middle-right', color: COL.yellow, rotation: -10 } }),
      p({ scene: '엄마는 성 바실리 대성당',
          bubbles: [{ text: '엄마 작품도 멋있다~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '아빠 자전거 권유 → 거부',
          bubbles: [
            { text: '자전거 타러 가자!', position: 'top-left', type: 'speech', tail: 'down-left', color: COL.dad },
            { text: '안 갈래요...', position: 'bottom-right', type: 'speech', tail: 'up-right', color: COL.me },
          ] }),
      p({ scene: '귀 당김! — 클로즈업',
          narration: '거부의 대가...',
          bubbles: [{ text: '아악! 귀!!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.red }],
          sfx: { text: '쭈욱~', position: 'middle-center', color: COL.red, rotation: -15 } }),
      p({ scene: '엄마의 방패',
          bubbles: [{ text: '가지 말라고!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.mom }] }),
      p({ scene: '저녁 롤케익 + 도라이버',
          bubbles: [{ text: '롤케익 + 넷플릭스 = 평화', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
    ],
  },
  {
    id: 'sample_20260223', author: CHILD1, date: '2026-02-23', title: '지하 6층 + 짬뽕지존',
    body: `오늘은 2월 23일 월요일이다.
원래 아빠가 회사 가야 하는데 동생이 병원을 가야 해서 안 갔다. 차로 갔는데 주차장이 엄청 막혀서 엄마와 동생만 먼저 내리고 나와 아빠는 차에서 기다렸다.
자리가 너어어어어무 없어서 최하층인 지하 6층까지 갔다. 거기도 자리가 없어서 차에서 '개그콘서트'를 봤다.
주차 후 1층 편의점 앞에서 만나서 아빠가 초코우유, 딸기우유, 커피우유를 사주셨다. 우유 3종 세트! 도넛도 사서 자리 잡으려는데 사람이 많아 한참 기다렸다.
동생 진료 받으러 갔는데 1시간 이상 지연됐다(이유는 상담). 기다리는 동안 아빠가 브레인 아웃을 깔아 주셨다.
짬뽕지존 서오릉점에서 짜장면, 짬뽕, 탕수육 등을 먹고 집에 왔다. 아빠와 동생은 당근마켓 청소기 팔러 가고, 나와 엄마만 집에 있어서 나만 왕수학을 했다.
다 한 뒤에 동생이 졸라서 엄마가 TV 봐도 된다고 했다. 화상영어로 마무리.`,
    panels: [
      p({ scene: '아침 — 아빠 회사 안 감',
          narration: '동생 병원 가는 날',
          bubbles: [{ text: '오늘은 회사 안 가~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad }] }),
      p({ scene: '병원 주차장 입구 — 와이드',
          bubbles: [
            { text: '먼저 내려갈게~', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.mom },
            { text: '우린 차에서 기다리자', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.dad },
          ] }),
      p({ scene: '대기 — 오버숄더',
          bubbles: [{ text: '아 자리 진짜 없네...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.dad }] }),
      p({ scene: '지하 6층 — 저공 드라마틱',
          narration: '주차장 최하층 도달!',
          bubbles: [{ text: '지... 지하 6층?!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.red }],
          sfx: { text: '뚜벅뚜벅', position: 'bottom-right', color: COL.me, rotation: 0 } }),
      p({ scene: '차에서 개그콘서트',
          bubbles: [{ text: '아 시간 ㅋㅋㅋ', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '우유 3종 — 와이드',
          bubbles: [{ text: '초코·딸기·커피 우유!!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }],
          sfx: { text: '두근✨', position: 'top-right', color: COL.red, rotation: -8 } }),
      p({ scene: '도넛 가게 줄서기',
          bubbles: [{ text: '아 줄이 너무 길어...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
      p({ scene: '도넛 자리 잡기',
          bubbles: [{ text: '여기 앉자!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.me }] }),
      p({ scene: '브레인 아웃 — 클로즈업',
          bubbles: [{ text: '브레인 아웃 ON!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '짬뽕지존 진수성찬',
          narration: '병원 끝나고 짬뽕지존 서오릉점!',
          bubbles: [{ text: '먹자! 진수성찬!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.red }] }),
      p({ scene: '청소기 — 당근마켓 출동',
          bubbles: [{ text: '청소기 팔러 갔다 올게~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad }] }),
      p({ scene: '나만 왕수학 (엄마와 둘이서)',
          bubbles: [{ text: '나만 왕수학...? 흑...', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.me }] }),
    ],
  },
  {
    id: 'sample_20260224', author: CHILD1, date: '2026-02-24', title: '체스 + 싱크로 게임',
    body: `오늘은 2월 24일 화요일이다.
아침에 동생이랑 체스를 하다가 폰으로 해서 엄마가 끄라고 했다. 아침으로 시리얼과 주먹밥을 먹은 뒤 바로 왕수학을 했다.
엄마가 점심으로 만두를 해주셨다. 양치 후 다른 짜잘한 공부를 한 뒤 태블릿으로 무한도전을 보다가 껐다.
아빠가 와서 또 밀푀유나베를 먹으면서 아빠가 사온 칠리소스에 찍먹을 했다. TV N에서 '싱크로 게임'이라는 서바이벌을 봤다.
어제쯤 올림픽이 폐막했다.`,
    panels: [
      p({ scene: '아침 체스 대결',
          bubbles: [
            { text: '한 판 더!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.bro },
            { text: '체크메이트!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.me },
          ] }),
      p({ scene: '엄마 — 폰 체스 OFF',
          bubbles: [{ text: '폰으로 하지 마! 끄세요~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.mom }] }),
      p({ scene: '아침 시리얼 + 주먹밥',
          bubbles: [{ text: '주먹밥 + 시리얼!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '점심 — 엄마표 만두',
          bubbles: [{ text: '엄마 만두 최고!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }],
          sfx: { text: '맛있다~', position: 'top-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '태블릿 — 무한도전',
          bubbles: [{ text: '오늘도 무한도전!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '칠리소스 — 디테일',
          sfx: { text: '쨘!', position: 'middle-center', color: COL.red, rotation: -10 } }),
      p({ scene: '저녁 — 밀푀유나베 + 칠리소스 찍먹',
          bubbles: [{ text: '오~ 새로운 맛!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad }] }),
      p({ scene: 'TV N 싱크로 게임',
          narration: '서바이벌 본방사수!',
          bubbles: [{ text: '흥미진진!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.blue }] }),
    ],
  },
  {
    id: 'sample_20260225', author: CHILD1, date: '2026-02-25', title: '암산 + 키 크는 약 엎음',
    body: `오늘은 2월 25일 수요일이다.
어제 '싱크로 게임' 보다가 나온 문제 하나를 내가 종이도 없이 암산으로 풀어서 출연자들보다 빨리 맞췄다!
아침으로 나와 동생은 튀김우동, 엄마는 새우탕을 먹었다. 바로 왕수학을 했다.
동생이랑 가위바위보 보드게임을 하다가 엄마가 점심으로 소바바 치킨과 감자튀김을 해주셔서 먹다가 그냥 하고 있었는데 내가 이겼다.
태블릿 보다가 화상영어를 하는데 갑자기 '돌발 상황' — 아빠가 화상영어 하는 중인데 대놓고 큰 소리로 말했다!
저녁으로 계란말이, 김치찌개, 밥, 팽이버섯을 먹었다. 아빠랑 동생은 자전거 타러 가고, 나와 엄마는 엘리스 보드게임을 했는데 비겼다.
TV N 유퀴즈를 보다가 샤워하고 그로우 샷 키 크는 약을 먹으려다 엎었다! 닦고 남은 거 + 새 1병을 마셨다. 유퀴즈에서 영화 '왕과 사는 남자' 단종역이 나와서 보다가 껐다.`,
    panels: [
      p({ scene: '싱크로 게임 — 암산 정답!',
          narration: '내가 종이 없이 암산으로!',
          bubbles: [{ text: '정답! 출연자보다 빨라!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.green }],
          sfx: { text: '✨천재✨', position: 'top-right', color: COL.yellow, rotation: -10 } }),
      p({ scene: '아침 — 튀김우동 / 새우탕',
          bubbles: [
            { text: '튀김우동!', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.me },
            { text: '난 새우탕~', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.mom },
          ] }),
      p({ scene: '왕수학 — 오버숄더',
          bubbles: [{ text: '오늘도 왕수학...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
      p({ scene: '점심 — 가위바위보 보드게임',
          bubbles: [
            { text: '내가 이겼다!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.me },
            { text: '으악 아쉽다~', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.bro },
          ] }),
      p({ scene: '화상영어 — 아빠 돌발 큰소리',
          narration: '화상영어 중인데 아빠가!!',
          bubbles: [
            { text: '여보~!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.dad },
            { text: '아빠ㅠㅠ', position: 'bottom-right', type: 'shout', tail: 'up-right', color: COL.red },
          ],
          sfx: { text: '으아악', position: 'middle-center', color: COL.red, rotation: -12 } }),
      p({ scene: '저녁 — 가족 식사',
          bubbles: [{ text: '계란말이 최고!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }] }),
      p({ scene: '엄마와 엘리스 보드게임 — 비김',
          bubbles: [{ text: '비겼네~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.mom }] }),
      p({ scene: '키 크는 약 엎음!! — 클로즈업',
          narration: '엎었다!! 닦고 다시 1병 더!',
          bubbles: [{ text: '으악! 엎었다!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.red }],
          sfx: { text: '쏟아짐!', position: 'middle-right', color: COL.red, rotation: -10 } }),
      p({ scene: '유퀴즈 — 단종 등장',
          bubbles: [{ text: '오 단종이다!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
    ],
  },
  {
    id: 'sample_20260226', author: CHILD1, date: '2026-02-26', title: '왕수학 3시간 + 유부초밥',
    body: `오늘은 2월 26일 목요일이다.
아침으로 빵을 먹은 뒤 3시간 이상 왕수학만 했다. 점심으로 주먹밥을 먹은 뒤 또 공부를 했다. 마라톤이다.
공부 끝나고 무한도전을 봤다. 아빠가 와서 저녁으로 아빠가 사온 유부초밥을 먹었다. TV에서 '냉장고를 부탁해'를 보다가 아빠와 동생은 자전거 때문에 나갔다.
나와 엄마는 '런닝맨'과 '틈만나면'을 보다가 TV를 껐다. 한참 뒤에 아빠와 동생이 돌아왔다.`,
    panels: [
      p({ scene: '왕수학 3시간 마라톤 — 와이드',
          narration: '3시간째…',
          bubbles: [{ text: '으아... 3시간째...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }],
          sfx: { text: '땀땀', position: 'top-right', color: COL.blue, rotation: -5 } }),
      p({ scene: '완전 탈진 — 리액션',
          bubbles: [{ text: '...죽겠다...', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.me }],
          sfx: { text: '털썩', position: 'top-right', color: COL.me, rotation: 0 } }),
      p({ scene: '점심 주먹밥 → 또 공부',
          bubbles: [{ text: '먹고 또 가자!', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
      p({ scene: '아빠 — 유부초밥 가져옴',
          bubbles: [{ text: '유부초밥이다!!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }],
          sfx: { text: '두근', position: 'top-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '아빠·동생 자전거 출동',
          bubbles: [{ text: '우린 자전거 타고 올게~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad }] }),
      p({ scene: '엄마와 런닝맨 + 틈만나면',
          narration: '엄마와 단둘이 TV 풀코스',
          bubbles: [{ text: '평화롭다~', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
    ],
  },
  {
    id: 'sample_20260227', author: CHILD1, date: '2026-02-27', title: '알라딘 책 도착 + 치킨',
    body: `오늘은 2월 27일 금요일이다.
아침으로 시리얼을 먹은 뒤 점심 때까지 계속 왕수학을 했다. 점심으로 김에 밥을 먹고 있는데 갑자기 엄마가 나갔다.
알라딘에서 '수상한 연구실' 7권, '조선에서 레벨 업 7·8권'이 와서 공부를 빨리 끝내고 남는 시간에 다 봤다.
공부를 다 하고 무한도전을 본 뒤 화상영어를 하고 아빠가 와서 저녁으로 치킨을 먹었다. '셰프와 사냥꾼'을 봤다.
아빠와 동생이 자전거를 차에 실어보려고 나간 사이에 책을 다 보고, 샤워하고, 양치까지 했다.`,
    panels: [
      p({ scene: '아침 시리얼 → 왕수학 → 점심',
          narration: '점심까지 왕수학 마라톤!',
          bubbles: [{ text: '아직 한참 남았다...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.me }] }),
      p({ scene: '점심 — 김에 밥',
          bubbles: [{ text: '간단하게 김에 밥!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '엄마 — 알라딘 픽업',
          bubbles: [{ text: '책 왔어! 갔다 올게~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.mom }],
          sfx: { text: '띵동!', position: 'top-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '수상한 연구실 7권 — 클로즈업',
          narration: '"수상한 연구실 7" 빠르게 흡수!',
          bubbles: [{ text: '오 신간이다!!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }] }),
      p({ scene: '조선 레벨업 7·8권 흡수',
          bubbles: [{ text: '두 권 연속!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.blue }],
          sfx: { text: '집중!', position: 'top-right', color: COL.yellow, rotation: -5 } }),
      p({ scene: '저녁 — 치킨',
          bubbles: [
            { text: '치킨이닷!!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.red },
            { text: '맛있겠다~', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.mom },
          ] }),
      p({ scene: '아빠·동생 자전거 차에 적재',
          bubbles: [{ text: '실어보자~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.dad }] }),
    ],
  },
  {
    id: 'sample_20260228', author: CHILD1, date: '2026-02-28', title: '호수공원 + 코스트코 + 케익 엎음',
    body: `오늘은 2월 28일 토요일이다.
아침으로 시리얼을 먹은 다음 나·동생·아빠가 호수공원에 가서 자전거로 한 바퀴를 돌고 코스트코 일선점으로 갔다.
옥수수 수프, 바나나우유, 두바이 초콜릿 크림, 딸기 케익, 바게트를 샀다. 참고로 쇼핑 전 시식코너에서 거의 다 먹어본 것들이다.
아빠가 녹차 아이스크림, 치킨볼, 츄로스를 사주셔서 먹고 있는데 아빠 가방(짐 옮길 수단)이 넘어져서 케익이 엎어졌다!!
호수공원으로 가서 짐을 옮기고 또 한 바퀴를 돈 후 집에 왔다. 저녁으로 김밥을 엄마가 사러 가고, 나와 동생은 태블릿을 봤다.
김밥을 먹은 뒤 '놀면 뭐하니?'를 봤다. 샤워하는데 초등부 선생님께 전화가 왔다. 채널A '게와 늑대의 시간'을 본 후 아빠랑 셋이서 잤다.`,
    panels: [
      p({ scene: '호수공원 자전거 — 와이드',
          narration: '아빠·동생·나 호수공원!',
          sfx: { text: '슈웅', position: 'middle-right', color: COL.blue, rotation: 10 } }),
      p({ scene: '코스트코 도착',
          bubbles: [{ text: '쇼핑 시작!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.dad }] }),
      p({ scene: '시식코너 다 정복!',
          bubbles: [{ text: '쇼핑 전에 다 먹고 산다!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }],
          sfx: { text: '냠냠', position: 'top-right', color: COL.yellow, rotation: -5 } }),
      p({ scene: '카트 가득 — 와이드',
          bubbles: [{ text: '우와 한가득!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '아빠 — 츄로스·치킨볼·아이스크림',
          bubbles: [
            { text: '이게 다 뭐야!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.yellow },
            { text: '많이 먹어~', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.dad },
          ] }),
      p({ scene: '케익 엎어짐 대참사!!',
          narration: '아빠 가방 휘청 → 딸기 케익 추락!!',
          bubbles: [{ text: '아아아악!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.red }],
          sfx: { text: '쾅!!', position: 'middle-center', color: COL.red, rotation: -15 } }),
      p({ scene: '호수공원 두 번째 라이딩',
          bubbles: [{ text: '저녁은 김밥이래~', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '저녁 — 김밥 + 놀면 뭐하니?',
          bubbles: [{ text: '김밥 + 놀뭐 = 환상!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }] }),
      p({ scene: '샤워 중 — 선생님 전화',
          bubbles: [{ text: '여보세요?', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }],
          sfx: { text: '띠리링', position: 'top-right', color: COL.yellow, rotation: -8 } }),
    ],
  },
  {
    id: 'sample_20260301', author: CHILD1, date: '2026-03-01', title: '3·1절 한강 자전거 20km',
    body: `오늘은 3·1절이면서 일요일이다.
아침으로 우유와 어제 코스트코에서 산 두바이초콜릿크림을 바른 식빵을 먹었다. 교회 가서 찬양 후 오늘은 헌금 위원을 하고 말씀을 들었다.
생일파티를 해서 선물로 문화상품권 5만원권을 받았다! 간식으로 튀김 1컵을 먹고 교회 지하에서 국수를 먹기 전에 혜준이라는 친구한테 패스 잘하냐고 물어 한 판 했는데 내가 승리.
국수를 먹고 형아네랑 고양 한강공원으로 가서 자전거를 타기로 했다. 엄마는 교회 일로 불참.
짐 챙겨서 가는 길에 네비가 이상해서 돌아갔다. 6km쯤 가다가 옆길에 오리들이 많아서 보고, 10km에서 화장실, 다음 도착지 15km까지 내가 계속 3등을 유지했다 (1등 고모부, 2등 형).
기어 없는 자전거로도 1번째 언덕에서 3위를 유지! 2번째 언덕에서 빼앗겼다. 도로엔 논이 타는 냄새 + 똥 냄새도 있었다. 이중공격!
20km 떨어진 파주출판단지 도착. 나·형·동생·고모는 출판단지에 있고, 아빠와 고모부는 자전거로 차를 가지러 갔다.
고모가 빵과 초코음료를 사주셨다. 집에 와서 빛의 속도로 샤워한 뒤 아빠가 시킨 거 해서 1점을 얻었다.
저녁으로 족발을 먹는데 엄마가 비계 좋아하는 사람은 고기를 좋아한다고 했지만 나는 비계만 좋아하고 고기는 안 좋아한다고 했다. 넷플릭스 '도라이버'를 봤다.`,
    panels: [
      p({ scene: '아침 — 두바이크림 식빵',
          bubbles: [{ text: '두바이크림 식빵 최고!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.yellow }] }),
      p({ scene: '교회 헌금 위원 임명',
          narration: '오늘은 헌금 위원!',
          bubbles: [{ text: '책임감 UP!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '생일파티 — 문화상품권 5만원!',
          bubbles: [{ text: '5만원권!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.yellow }],
          sfx: { text: '두근✨', position: 'top-right', color: COL.red, rotation: -8 } }),
      p({ scene: '교회 지하 — 튀김 한 컵',
          bubbles: [{ text: '튀김 한 컵!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '혜준이와 패스 대결 — 승리',
          bubbles: [
            { text: '패스 잘하지~', position: 'top-right', type: 'speech', tail: 'down-right', color: COL.blue },
            { text: '내가 이겼어!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.big },
          ] }),
      p({ scene: '자전거 출발 준비',
          narration: '엄마는 교회 일로 불참!',
          bubbles: [{ text: '출발하자!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.dad }] }),
      p({ scene: '네비 오류 — 빙 돌아감',
          bubbles: [{ text: '네비가 이상해...', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.dad }] }),
      p({ scene: '6km 오리떼 구경',
          bubbles: [{ text: '오리들이다~ 귀여워!', position: 'bottom-left', type: 'speech', tail: 'down-left', color: COL.me }] }),
      p({ scene: '10km 화장실',
          bubbles: [{ text: '잠깐 다녀올게!', position: 'bottom-left', type: 'shout', tail: 'down-left', color: COL.me }] }),
      p({ scene: '한강 자전거 — 계속 3등',
          narration: '1등 고모부, 2등 형, 3등 나 (15km까지)',
          sfx: { text: '슈웅', position: 'middle-right', color: COL.blue, rotation: 10 } }),
      p({ scene: '1번째 언덕 — 저공',
          bubbles: [{ text: '기어 없이도 3등!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.green }],
          sfx: { text: '헉헉', position: 'bottom-right', color: COL.red, rotation: -5 } }),
      p({ scene: '2번째 언덕 — 빼앗김',
          bubbles: [{ text: '아... 5등으로 추락 ㅠㅠ', position: 'bottom-left', type: 'speech', tail: 'up-left', color: COL.me }] }),
      p({ scene: '논 타는 냄새 + 똥 냄새 이중공격',
          bubbles: [{ text: '윽! 무슨 냄새야!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.red }],
          sfx: { text: '으악~', position: 'middle-right', color: COL.me, rotation: -10 } }),
      p({ scene: '파주출판단지 도착 (20km 완주)',
          narration: '20km 완주!',
          bubbles: [{ text: '도착!!', position: 'top-left', type: 'shout', tail: 'down-left', color: COL.green }],
          sfx: { text: '✨도착✨', position: 'top-right', color: COL.yellow, rotation: -8 } }),
      p({ scene: '저녁 족발 — 비계만 좋아!',
          bubbles: [
            { text: '비계만 좋아!', position: 'top-right', type: 'shout', tail: 'down-right', color: COL.yellow },
            { text: '...왜 그러니?', position: 'bottom-left', type: 'thought', tail: 'up-left', color: COL.mom },
          ] }),
    ],
  },
]

// 각 panel.image를 자동으로 장면별 이미지 경로로 매핑
// (v4 200장 자동 생성 결과: /diary/scenes/d{epIdx}_p{panelIdx}.png)
SAMPLE_DIARIES.forEach((diary, epIdx) => {
  diary.panels.forEach((panel, pIdx) => {
    panel._fallback = panel.image            // 기존 캐릭터 이미지 (fallback)
    panel.image = `/diary/scenes/d${epIdx + 1}_p${pIdx + 1}.png`
  })
})

// localStorage 키 — v4 (200컷, 카메라 무빙, 풍부한 말풍선)
export const DIARY_STORAGE_KEY = 'pocket-money-diaries-v4'

export function loadDiaries() {
  try {
    const raw = localStorage.getItem(DIARY_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(SAMPLE_DIARIES))
  return [...SAMPLE_DIARIES]
}

export function saveDiaries(diaries) {
  try {
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(diaries))
  } catch (e) { /* ignore */ }
}
