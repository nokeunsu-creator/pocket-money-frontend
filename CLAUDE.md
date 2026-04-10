# 우리집 보물상자 - 개발 규칙

## 모바일 입력창 필수 규칙

이 앱은 모바일(스마트폰) 전용입니다. `<input>` 요소를 만들 때 **반드시** 아래 스타일을 포함해야 화면을 넘어가지 않습니다:

```jsx
style={{
  minWidth: 0,           // flex 자식 요소가 부모를 넘지 않도록
  maxWidth: '100%',      // 부모 너비를 넘지 않도록
  boxSizing: 'border-box', // padding/border를 width에 포함
  fontSize: 18,          // 최대 18px (너무 크면 넘침)
}}
```

### flex 레이아웃 안 input
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <input style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }} />
  <span style={{ flexShrink: 0 }}>단위</span>  {/* 단위 텍스트가 줄어들지 않도록 */}
</div>
```

### width: '100%' input
```jsx
<input style={{ width: '100%', boxSizing: 'border-box' }} />
```

**절대 하면 안 되는 것:**
- `fontSize: 22` 이상으로 설정 (모바일에서 넘침)
- `minWidth: 0` 없이 flex 자식 input 사용
- `boxSizing: 'border-box'` 없이 `width: '100%'` 사용

## 배포

- `git push origin main` → Vercel 자동 배포
- URL: https://pocket-money-frontend.vercel.app
- Firebase: pocket-money-d1b18 (온라인 게임용)

## 데이터 저장

- 모든 사용자 데이터는 localStorage에 저장
- Firebase는 온라인 멀티플레이 게임 방(room) 관리에만 사용
