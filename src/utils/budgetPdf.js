import jsPDF from 'jspdf'
import { getEntriesForMonth, getMonthSummary, getBudget, CATEGORIES } from './budgetStorage'

export function downloadBudgetPdf(year, month) {
  const doc = new jsPDF()
  const summary = getMonthSummary(year, month)
  const entries = getEntriesForMonth(year, month)
  const budget = getBudget()

  const monthStr = `${year}년 ${month}월`
  const formatAmt = (n) => n.toLocaleString() + '원'

  // Sort entries by date descending
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  // Build HTML content for rendering
  let html = `
    <div style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; padding: 20px; font-size: 12px; color: #333;">
      <h1 style="font-size: 20px; text-align: center; margin-bottom: 4px;">💰 가계부 리포트</h1>
      <p style="text-align: center; color: #888; font-size: 13px; margin-bottom: 20px;">${monthStr} · 노성미</p>
      <hr style="border: 1px solid #DDD;" />

      <div style="margin: 16px 0; padding: 12px; background: #F7F7F7; border-radius: 8px;">
        <table style="width: 100%; font-size: 13px;">
          <tr><td>수입</td><td style="text-align: right; color: #2ECC71; font-weight: bold;">+${formatAmt(summary.income)}</td></tr>
          <tr><td>지출</td><td style="text-align: right; color: #E74C3C; font-weight: bold;">-${formatAmt(summary.expense)}</td></tr>
          <tr><td colspan="2"><hr style="border: 0.5px solid #DDD;" /></td></tr>
          <tr><td><strong>잔액</strong></td><td style="text-align: right; font-weight: bold; font-size: 15px;">${formatAmt(summary.balance)}</td></tr>
          ${budget > 0 ? `<tr><td>예산</td><td style="text-align: right; color: #888;">${formatAmt(budget)} (사용률 ${summary.expense > 0 ? Math.round((summary.expense / budget) * 100) : 0}%)</td></tr>` : ''}
        </table>
      </div>

      <h3 style="font-size: 14px; margin: 16px 0 8px;">📊 카테고리별 지출</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <tr style="background: #F0F0F0;">
          <th style="padding: 6px; text-align: left;">카테고리</th>
          <th style="padding: 6px; text-align: right;">금액</th>
          <th style="padding: 6px; text-align: right;">비율</th>
        </tr>
        ${Object.entries(summary.byCategory || {})
          .sort((a, b) => b[1] - a[1])
          .map(([key, amount]) => {
            const cat = CATEGORIES.find(c => c.key === key)
            const pct = summary.expense > 0 ? Math.round((amount / summary.expense) * 100) : 0
            return `<tr>
              <td style="padding: 4px 6px;">${cat ? cat.icon + ' ' + cat.label : key}</td>
              <td style="padding: 4px 6px; text-align: right;">${formatAmt(amount)}</td>
              <td style="padding: 4px 6px; text-align: right;">${pct}%</td>
            </tr>`
          }).join('')}
      </table>

      <h3 style="font-size: 14px; margin: 16px 0 8px;">📋 상세 내역</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <tr style="background: #F0F0F0;">
          <th style="padding: 4px;">날짜</th>
          <th style="padding: 4px;">구분</th>
          <th style="padding: 4px;">카테고리</th>
          <th style="padding: 4px;">메모</th>
          <th style="padding: 4px; text-align: right;">금액</th>
        </tr>
        ${sorted.map(e => {
          const cat = CATEGORIES.find(c => c.key === e.category)
          const sign = e.type === 'income' ? '+' : '-'
          const color = e.type === 'income' ? '#2ECC71' : '#E74C3C'
          return `<tr>
            <td style="padding: 3px 4px;">${e.date.slice(5)}</td>
            <td style="padding: 3px 4px;">${e.type === 'income' ? '수입' : '지출'}</td>
            <td style="padding: 3px 4px;">${cat ? cat.icon + ' ' + cat.label : ''}</td>
            <td style="padding: 3px 4px;">${e.memo || ''}</td>
            <td style="padding: 3px 4px; text-align: right; color: ${color};">${sign}${formatAmt(e.amount)}</td>
          </tr>`
        }).join('')}
      </table>

      <p style="text-align: center; color: #AAA; font-size: 10px; margin-top: 20px;">생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
    </div>
  `

  // Create off-screen container for html rendering
  const container = document.createElement('div')
  container.style.width = '190mm'
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.innerHTML = html
  document.body.appendChild(container)

  doc.html(container, {
    callback: function (doc) {
      doc.save(`가계부_${year}년_${month}월.pdf`)
      document.body.removeChild(container)
    },
    x: 10,
    y: 10,
    width: 190,
    windowWidth: 800,
  })
}
