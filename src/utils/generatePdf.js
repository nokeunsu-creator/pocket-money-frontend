import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { EMOJI_MAP, BANK_EMOJI_MAP, fmt } from '../constants'

function buildEntryRows(entries, type) {
  if (!entries || entries.length === 0) {
    return '<tr><td colspan="5" style="text-align:center;color:#999;padding:16px;">기록이 없습니다</td></tr>'
  }
  return entries.map(e => {
    const d = new Date(e.entryDate)
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
    const isPositive = type === 'cash' ? e.type === 'INCOME' : e.type === 'DEPOSIT'
    const emoji = type === 'cash' ? (EMOJI_MAP[e.category] || '📌') : (BANK_EMOJI_MAP[e.category] || '📌')
    const color = isPositive ? '#4895EF' : '#EF476F'
    const bankColor = isPositive ? '#2D6A4F' : '#E76F51'
    const c = type === 'cash' ? color : bankColor
    const sign = isPositive ? '+' : '-'
    const typeLabel = type === 'cash'
      ? (isPositive ? '수입' : '지출')
      : (isPositive ? '입금' : '출금')
    return `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #EEE;text-align:center;">${dateStr}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #EEE;text-align:center;">${typeLabel}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #EEE;">${emoji} ${e.category}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #EEE;color:#666;">${e.memo || ''}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #EEE;text-align:right;font-weight:bold;color:${c};">${sign}${fmt(e.amount)}원</td>
    </tr>`
  }).join('')
}

function buildHtml(user, year, month, stats, entries, bankStats, bankEntries) {
  const balance = stats?.totalBalance ?? 0
  const income = stats?.monthIncome ?? 0
  const expense = stats?.monthExpense ?? 0
  const bankBalance = bankStats?.totalBalance ?? 0
  const deposit = bankStats?.monthDeposit ?? 0
  const withdraw = bankStats?.monthWithdraw ?? 0

  return `
    <div style="font-family:'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',sans-serif;padding:30px;width:700px;background:#FFF;color:#333;">
      <!-- 헤더 -->
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:28px;font-weight:bold;color:#5A3E28;margin-bottom:4px;">🐷 ${user}의 용돈기입장</div>
        <div style="font-size:16px;color:#888;">${year}년 ${month}월 거래내역</div>
      </div>

      <!-- 요약 카드 -->
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div style="flex:1;background:#F8F9FA;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">💵 내 돈 잔액</div>
          <div style="font-size:22px;font-weight:bold;color:${balance >= 0 ? '#2D6A4F' : '#EF476F'};">${fmt(balance)}원</div>
          <div style="margin-top:8px;font-size:12px;">
            <span style="color:#4895EF;">▲ ${fmt(income)}원</span>
            &nbsp;&nbsp;
            <span style="color:#EF476F;">▼ ${fmt(expense)}원</span>
          </div>
        </div>
        <div style="flex:1;background:#F8F9FA;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">🏦 통장 잔액</div>
          <div style="font-size:22px;font-weight:bold;color:${bankBalance >= 0 ? '#2D6A4F' : '#EF476F'};">${fmt(bankBalance)}원</div>
          <div style="margin-top:8px;font-size:12px;">
            <span style="color:#2D6A4F;">▲ ${fmt(deposit)}원</span>
            &nbsp;&nbsp;
            <span style="color:#E76F51;">▼ ${fmt(withdraw)}원</span>
          </div>
        </div>
      </div>

      <!-- 내돈 내역 -->
      <div style="margin-bottom:24px;">
        <div style="font-size:16px;font-weight:bold;color:#5A3E28;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #4895EF;">
          💵 내돈 내역
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#F8F9FA;">
              <th style="padding:8px 6px;text-align:center;width:60px;">날짜</th>
              <th style="padding:8px 6px;text-align:center;width:50px;">구분</th>
              <th style="padding:8px 6px;text-align:left;">카테고리</th>
              <th style="padding:8px 6px;text-align:left;">메모</th>
              <th style="padding:8px 6px;text-align:right;width:110px;">금액</th>
            </tr>
          </thead>
          <tbody>
            ${buildEntryRows(entries, 'cash')}
          </tbody>
        </table>
      </div>

      <!-- 통장 내역 -->
      <div style="margin-bottom:16px;">
        <div style="font-size:16px;font-weight:bold;color:#5A3E28;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #2D6A4F;">
          🏦 통장 내역
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#F8F9FA;">
              <th style="padding:8px 6px;text-align:center;width:60px;">날짜</th>
              <th style="padding:8px 6px;text-align:center;width:50px;">구분</th>
              <th style="padding:8px 6px;text-align:left;">카테고리</th>
              <th style="padding:8px 6px;text-align:left;">메모</th>
              <th style="padding:8px 6px;text-align:right;width:110px;">금액</th>
            </tr>
          </thead>
          <tbody>
            ${buildEntryRows(bankEntries, 'bank')}
          </tbody>
        </table>
      </div>

      <!-- 푸터 -->
      <div style="text-align:center;font-size:11px;color:#BBB;margin-top:20px;padding-top:12px;border-top:1px solid #EEE;">
        생성일: ${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일
      </div>
    </div>
  `
}

export async function generatePdf(user, year, month, stats, entries, bankStats, bankEntries) {
  // 임시 div 생성
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.innerHTML = buildHtml(user, year, month, stats, entries, bankStats, bankEntries)
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container.firstElementChild, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FFFFFF',
    })

    const imgWidth = 210 // A4 width mm
    const pageHeight = 297 // A4 height mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF('p', 'mm', 'a4')

    let heightLeft = imgHeight
    let position = 0

    // 첫 페이지
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // 추가 페이지 (내용이 길 경우)
    while (heightLeft > 0) {
      position = -(pageHeight - 0) * (Math.ceil((imgHeight - heightLeft) / pageHeight))
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(`${user}_${year}년${month}월_거래내역.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
