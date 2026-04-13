# 개발 환경 세팅 가이드

회사/집 양쪽에서 동일한 개발 환경을 꾸리는 방법입니다.

## 📋 초기 세팅 체크리스트

### 1. 필수 도구 설치
- [ ] **Git** — https://git-scm.com/
- [ ] **Node.js** v18 이상 — https://nodejs.org/
- [ ] **VSCode** — https://code.visualstudio.com/
- [ ] (백엔드 돌릴거면) **JDK 17** — https://adoptium.net/
- [ ] (선택) **Claude Code** — 회사 설정과 동일하게 쓰려면 설치

### 2. 저장소 클론
```bash
mkdir -p C:/workspace/pocket-money
cd C:/workspace/pocket-money
git clone https://github.com/nokeunsu-creator/pocket-money-frontend.git frontend
git clone https://github.com/nokeunsu-creator/pocket-money-backend.git backend
```

### 3. 환경변수 설정 (중요)

`.env.local`은 git에 없으므로 **수동으로 만들어야** 합니다.

```bash
cd C:/workspace/pocket-money/frontend
cp .env.example .env.local
```

그런 다음 `.env.local`을 VSCode로 열어서 회사 PC와 동일한 값을 입력.
회사 PC의 값은 본인이 메모해두거나 비밀번호 관리자에 저장해둘 것.

**구조**:
```
VITE_CHILD1_NAME=
VITE_CHILD2_NAME=
VITE_MOM_NAME=
VITE_DAD_NAME=
VITE_ME_NAME=
VITE_WIFE_NAME=
```

### 4. 의존성 설치 및 실행
```bash
# 프론트엔드
cd C:/workspace/pocket-money/frontend
npm install
npm run dev   # http://localhost:5173

# 백엔드 (별도 터미널)
cd C:/workspace/pocket-money/backend
./gradlew bootRun  # http://localhost:8080
```

### 5. (선택) Claude Code 재설정
회사에서 CLAUDE.md와 `.claude/` 훅을 썼다면 집에서도 동일하게 만들려면:
- `CLAUDE.md` 수동으로 복사 (gitignored 상태라 git으로 안 옮겨짐)
- `.claude/hooks/log-change.cjs`, `.claude/settings.json` 회사에서 복사

---

## 🔄 일상 워크플로우

### 작업 시작 전 (매번)
```bash
cd C:/workspace/pocket-money/frontend
git pull origin main
```

### 작업 후 (매번)
```bash
git add <변경한 파일>
git commit -m "작업 내용"
git push origin main
```

### 아직 commit 안 한 작업을 다른 PC로 옮기고 싶을 때
```bash
# 회사 PC에서
git stash push -m "작업중"
git push                     # stash는 로컬만 저장되므로 push는 commit된 것만

# 또는 임시 커밋 후 push
git commit -am "WIP: 작업중"
git push

# 집 PC에서
git pull
# (임시 커밋 방식일 경우) git reset HEAD~1 으로 커밋 해제하고 이어서 작업
```

### 양쪽에서 같은 파일을 동시에 수정했을 때
`git pull`할 때 conflict가 뜹니다:
1. VSCode에서 conflict 난 파일 열기
2. "Accept Current", "Accept Incoming", "Accept Both" 중 선택
3. 수정 후 `git add <파일>` → `git commit`

**권장:** 한쪽에서 작업 끝내고 push한 뒤 다른 쪽에서 pull해서 작업.

---

## 💻 VSCode Settings Sync

VSCode 확장, 설정, 스니펫을 양쪽 PC에서 자동 동기화.

### 켜는 방법
1. 좌측 하단 **계정 아이콘** (톱니바퀴 위쪽) 클릭
2. **"Turn on Settings Sync..."** 선택
3. 동기화할 항목 체크:
   - [x] Settings
   - [x] Keyboard Shortcuts
   - [x] User Snippets
   - [x] User Tasks
   - [x] Extensions
   - [x] UI State
4. 로그인 방식 선택:
   - **GitHub** 추천 (이미 저장소도 GitHub에 있음)
   - Microsoft 계정
5. 회사 PC에서 먼저 Sync On → 완료
6. 집 PC에서도 같은 계정으로 Sync On → 자동 반영

### 주의
- 동기화 범위: VSCode 개인 설정만. 프로젝트별 `.vscode/` 폴더는 별도 (git으로 관리)
- 민감 정보 (API 키 등) 동기화 안 됨 — 환경변수는 `.env.local`로 관리
- 양쪽 동시 사용 시 간혹 충돌 가능 → "Download (Replace Local)" 또는 "Upload (Replace Remote)" 선택

### 확장 중 추천
- **ESLint** — 코드 품질
- **Prettier** — 자동 정렬
- **GitLens** — Git 히스토리 보기
- **Korean Language Pack** — 한글 UI
- **ES7+ React/Redux/React-Native snippets** — React 스니펫

---

## 🚀 배포 관련

### 프론트엔드 (Vercel)
- `git push origin main` → Vercel이 자동 빌드/배포
- 환경변수는 Vercel 대시보드의 Settings → Environment Variables에 설정 (한 번만)
- 로컬 `.env.local`과 별개. Vercel은 Vercel 자체 환경변수만 봄

### 백엔드
- Dockerfile 기반 배포 (현재 사용처에 따라 다름)
- DB/Firebase 설정은 각 배포 환경에 맞게

---

## ❓ 문제 해결

### "npm install 실패"
- Node.js 버전 확인 (`node -v` → v18 이상)
- `node_modules/` 삭제 후 `npm install` 재시도

### "이름이 '첫째/둘째'로 나와요"
- `.env.local` 파일이 `frontend/` 바로 아래 있는지 확인
- 파일 내용에 `VITE_` 접두사가 붙어있는지 확인
- `npm run dev` 재시작

### "git pull 시 conflict"
- 변경점 확인 후 수동 해결
- 확신 없으면 작업물 백업 후 `git reset --hard origin/main` (⚠️ 로컬 변경 다 날림)

### "Claude Code가 맥락을 모르네"
- 회사에서 쓰던 `CLAUDE.md`를 집 `frontend/CLAUDE.md`로 복사
- Claude Code의 `~/.claude/projects/...` 메모리는 PC별로 쌓이므로 집에서 처음엔 학습 시간 필요
