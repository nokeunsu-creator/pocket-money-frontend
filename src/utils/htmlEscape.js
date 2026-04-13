// HTML 특수문자 이스케이프
// PDF 생성 등에서 사용자 입력을 HTML 템플릿 문자열에 삽입하기 전에 사용.
export function escapeHtml(value) {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
