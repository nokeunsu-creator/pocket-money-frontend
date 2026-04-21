// 가족 구성원 실명 설정
// 실명은 .env.local(로컬) 또는 Vercel 환경변수(배포)로만 주입됨.
// 소스 코드에는 절대 실명을 하드코딩하지 말 것.
//
// 빌드 시 환경변수가 없으면 아래 fallback(역할명)이 사용되며,
// 실명 기반의 기존 데이터(DB/localStorage)는 접근 불가 상태가 됨.
// 로컬 개발 시 frontend/.env.local 에 VITE_* 값 채우기.

const env = import.meta.env

export const CHILD1 = env.VITE_CHILD1_NAME || '첫째'
export const CHILD2 = env.VITE_CHILD2_NAME || '둘째'
export const MOM = env.VITE_MOM_NAME || '엄마'
export const DAD = env.VITE_DAD_NAME || '아빠'
export const ME = env.VITE_ME_NAME || '나'
export const WIFE = env.VITE_WIFE_NAME || '아내'

// 배열 형태로도 제공 (HUB 등에서 사용)
export const HUB_USERS = [CHILD1, CHILD2]
