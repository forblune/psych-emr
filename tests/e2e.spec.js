import { test, expect } from '@playwright/test'

// Collect real console errors across the page lifetime.
function trackErrors(page) {
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

test.describe('정신과 EMR 대시보드 (mock 모드)', () => {
  test('대시보드가 렌더되고 핵심 영역이 보인다', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/')

    // 브랜드 / 진료과
    await expect(page.locator('.brand')).toContainText('메디코어')
    await expect(page.locator('.dept-pill')).toContainText('정신건강의학과')

    // KPI 7개(담당 입원 포함), 대기열 7행
    await expect(page.locator('.kpi')).toHaveCount(7)
    await expect(page.locator('.qrow')).toHaveCount(7)

    // 기본 선택 환자 = 정수민
    await expect(page.locator('.pt-id h2')).toHaveText('정수민')

    // 추이 차트 canvas 존재
    await expect(page.locator('.trend-card canvas')).toBeVisible()

    // mock 모드(Supabase 미설정)에선 실시간 배지가 없어야 함
    await expect(page.locator('.live-badge')).toHaveCount(0)

    expect(errors, '콘솔 에러 없음').toEqual([])
  })

  test('KPI는 데이터에서 집계된다(대기 6·상담중 1·금일 내원 7)', async ({ page }) => {
    await page.goto('/')
    const kpi = (label) =>
      page.locator('.kpi').filter({ has: page.locator('.lab', { hasText: label }) }).locator('.val')
    await expect(kpi('대기 환자')).toHaveText('6')
    await expect(kpi('상담 중')).toHaveText('1')
    await expect(kpi('금일 내원')).toHaveText('7')
    await expect(kpi('고위험 환자')).toHaveText('1')
  })

  test('입원·병동 모듈 — 네비게이션·보드·병동 필터', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-item', { hasText: '입원 · 폐쇄병동' }).click()

    await expect(page.locator('.crumb h1')).toHaveText('입원 · 병동')
    await expect(page.locator('.ward-occ')).toBeVisible()

    // 재원 환자 9 (mock), 입원 테이블 9행
    const rewon = page
      .locator('.kpi')
      .filter({ has: page.locator('.lab', { hasText: '재원 환자' }) })
      .locator('.val')
    await expect(rewon).toHaveText('9')
    await expect(page.locator('.ward-list tbody tr')).toHaveCount(9)

    // dx 코드에 KCD 한글명 동반(문상철 F20.0 편집조현병)
    const mun = page.locator('.ward-list tbody tr', { hasText: '문상철' })
    await expect(mun.locator('.dx')).toHaveText('F20.0')
    await expect(mun.locator('.dx-ko')).toHaveText('편집조현병')

    // 병동 필터: 5A → 5명
    await page.locator('.ward-list .seg button', { hasText: '5A' }).click()
    await expect(page.locator('.ward-list tbody tr')).toHaveCount(5)

    // 대시보드로 복귀
    await page.locator('.nav-item', { hasText: '진료 대시보드' }).click()
    await expect(page.locator('.crumb h1')).toHaveText('진료 대시보드')
  })

  test('입원 CRUD — 입원 등록 후 퇴원', async ({ page }) => {
    page.on('dialog', (d) => d.accept())
    await page.goto('/')
    await page.locator('.nav-item', { hasText: '입원 · 폐쇄병동' }).click()
    await expect(page.locator('.ward-list tbody tr')).toHaveCount(9)

    // 입원 등록
    await page.locator('.crumb-actions .btn.primary', { hasText: '입원 등록' }).click()
    await expect(page.locator('.ward-form')).toBeVisible()
    await page.locator('.note-field', { hasText: '환자명' }).locator('input').fill('테스트환자')
    await page.locator('.note-field', { hasText: '차트번호' }).locator('input').fill('00640999')
    // 진단: DSM-5 선택 → ICD-10/KCD 코드 저장
    await page.locator('.ward-form .dx-search').fill('범불안')
    await page.locator('.ward-form .dx-opt', { hasText: 'Generalized anxiety' }).click()
    await expect(page.locator('.ward-form .dx-selected')).toContainText('F41.1')
    const rb = page.locator('.note-field', { hasText: '병실 / 병상' }).locator('input')
    await rb.nth(0).fill('507')
    await rb.nth(1).fill('A')
    await page.locator('.ward-form button[type="submit"]').click()

    await expect(page.locator('.ward-list tbody tr')).toHaveCount(10)
    const rewon = page
      .locator('.kpi')
      .filter({ has: page.locator('.lab', { hasText: '재원 환자' }) })
      .locator('.val')
    await expect(rewon).toHaveText('10')

    // 퇴원
    await page.locator('.ward-list tbody tr', { hasText: '테스트환자' }).locator('.row-act.danger').click()
    await expect(page.locator('.ward-list tbody tr')).toHaveCount(9)
  })

  test('청구·수납 — 수납 처리', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-item', { hasText: '청구 · 수납' }).click()
    await expect(page.locator('.crumb h1')).toHaveText('청구 · 수납')
    await expect(page.locator('tbody tr')).toHaveCount(7)

    const unpaid = page
      .locator('.kpi')
      .filter({ has: page.locator('.lab', { hasText: '미수납' }) })
      .locator('.val')
    await expect(unpaid).toHaveText('4')

    const row = page.locator('tbody tr', { hasText: '강하늘' })
    // 주상병: 코드 + KCD 한글명
    await expect(row.locator('.dx')).toHaveText('F32.2')
    await expect(row.locator('.dx-ko')).toHaveText('정신병적 증상이 없는 중증의 우울에피소드')

    await row.locator('.btn.primary', { hasText: '수납 처리' }).click()
    await expect(row.locator('.badge')).toContainText('수납완료')
    await expect(unpaid).toHaveText('3')
  })

  test('약품·재고 — 네비게이션·집계·상태 칩', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-item', { hasText: '약품 · 재고' }).click()
    await expect(page.locator('.crumb h1')).toHaveText('약품 · 재고')
    await expect(page.locator('tbody tr')).toHaveCount(11)

    const low = page.locator('.kpi').filter({ has: page.locator('.lab', { hasText: '재고부족' }) }).locator('.val')
    await expect(low).toHaveText('2')
    const ctrl = page.locator('.kpi').filter({ has: page.locator('.lab', { hasText: '향정신성' }) }).locator('.val')
    await expect(ctrl).toHaveText('4')

    // 재고부족 필터 → 2품목, 모두 '재고부족' 배지
    await page.locator('.seg button', { hasText: '재고부족' }).click()
    await expect(page.locator('tbody tr')).toHaveCount(2)
    await expect(page.locator('tbody tr .badge', { hasText: '재고부족' })).toHaveCount(2)
  })

  test('약품·재고 — 입고/불출로 재고 변동, 재고부족 해소', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-item', { hasText: '약품 · 재고' }).click()

    const low = page.locator('.kpi').filter({ has: page.locator('.lab', { hasText: '재고부족' }) }).locator('.val')
    await expect(low).toHaveText('2')

    // 쿠에티아핀(재고 90 / 안전 120) 입고 50 → 140, 재고부족 1건으로 감소
    const row = page.locator('tbody tr', { hasText: '쿠에티아핀 25mg' })
    await row.locator('.stock-qty').fill('50')
    await row.locator('.row-act', { hasText: '입고' }).click()
    await expect(row.locator('td.ta-r.num').first()).toHaveText('140')
    await expect(row.locator('.badge', { hasText: '재고부족' })).toHaveCount(0)
    await expect(low).toHaveText('1')

    // 불출 50 → 90, 다시 재고부족
    await row.locator('.stock-qty').fill('50')
    await row.locator('.row-act', { hasText: '불출' }).click()
    await expect(row.locator('td.ta-r.num').first()).toHaveText('90')
    await expect(low).toHaveText('2')
  })

  test('약품·재고 — 약품 등록 후 목록·총 품목 반영', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-item', { hasText: '약품 · 재고' }).click()
    await expect(page.locator('tbody tr')).toHaveCount(11)

    await page.locator('.btn.primary', { hasText: '약품 등록' }).click()
    await page.locator('.note-field:has(span:text-is("약품명 *")) input').fill('미르타자핀 15mg')
    await page.locator('.note-field:has(span:text-is("보험코드 *")) input').fill('A29900777')
    await page.locator('.note-field:has(span:text-is("재고 *")) input').fill('300')
    await page.locator('.note-form-actions .btn.primary', { hasText: '약품 등록' }).click()

    await expect(page.locator('tbody tr')).toHaveCount(12)
    const total = page.locator('.kpi').filter({ has: page.locator('.lab', { hasText: '총 품목' }) }).locator('.val')
    await expect(total).toHaveText('12')
    await expect(page.locator('tbody tr', { hasText: '미르타자핀 15mg' })).toBeVisible()
  })

  test('약품·재고 — 약품 삭제 후 목록에서 제거', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-item', { hasText: '약품 · 재고' }).click()
    await expect(page.locator('tbody tr')).toHaveCount(11)

    const row = page.locator('tbody tr', { hasText: '졸피뎀 10mg' })
    await row.locator('.row-act.danger', { hasText: '삭제' }).click()
    await expect(page.locator('tbody tr', { hasText: '졸피뎀 10mg' })).toHaveCount(0)
    await expect(page.locator('tbody tr')).toHaveCount(10)
  })

  test('예약 관리 — 상태 변경·추가·삭제', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-item', { hasText: '예약 관리' }).click()
    await expect(page.locator('.crumb h1')).toHaveText('예약 관리')
    await expect(page.locator('tbody tr')).toHaveCount(9)

    // 강하늘 예약 → 취소로 상태 변경, 배지 반영
    const row = page.locator('tbody tr', { hasText: '강하늘' })
    await row.locator('.appt-status').selectOption('취소')
    await expect(row.locator('.badge')).toContainText('취소')

    // 예약 추가
    await page.locator('.crumb-actions .btn.primary', { hasText: '예약 추가' }).click()
    await expect(page.locator('.note-form')).toBeVisible()
    await page.locator('.note-field', { hasText: '시간' }).locator('input').fill('17:30')
    await page.locator('.note-field', { hasText: '환자명' }).locator('input').fill('신규예약환자')
    await page.locator('.note-form button[type="submit"]').click()
    await expect(page.locator('tbody tr')).toHaveCount(10)

    // 삭제
    await page.locator('tbody tr', { hasText: '신규예약환자' }).locator('.row-act.danger').click()
    await expect(page.locator('tbody tr')).toHaveCount(9)
  })

  test('예약→진료→청구 연동 — 예약에서 진료 시작 시 큐 등록·예약 완료·청구 자동 생성', async ({ page }) => {
    await page.goto('/')

    // 예약 화면: 배준서(상태 예약)에서 진료 시작
    await page.locator('.nav-item', { hasText: '예약 관리' }).click()
    const apptRow = page.locator('tbody tr', { hasText: '배준서' })
    await apptRow.locator('.row-act', { hasText: '진료 시작' }).click()

    // 접수 모달이 환자명 프리필 + 예약 연동 표시로 열림
    await expect(page.locator('.modal-title')).toContainText('예약 연동')
    await expect(page.locator('.note-field', { hasText: '환자명' }).locator('input')).toHaveValue('배준서')
    // 진단 선택(불면 → KCD F51.0)
    await page.locator('.dx-search').fill('불면')
    await page.locator('.dx-opt', { hasText: 'Insomnia disorder' }).click()
    await expect(page.locator('.dx-selected')).toContainText('F51.0')
    await page.locator('.modal-card button[type="submit"]').click()

    // 대시보드로 이동, 대기열 8명, 배준서 선택됨
    await expect(page.locator('.modal-card')).toHaveCount(0)
    await expect(page.locator('.qrow')).toHaveCount(8)
    await expect(page.locator('.pt-id h2')).toHaveText('배준서')

    // 예약은 완료 처리됨
    await page.locator('.nav-item', { hasText: '예약 관리' }).click()
    await expect(page.locator('tbody tr', { hasText: '배준서' }).locator('.badge')).toContainText('완료')

    // 청구가 자동 생성됨(주상병 F51.0 비기질성 불면증, 미수납)
    await page.locator('.nav-item', { hasText: '청구 · 수납' }).click()
    const billRow = page.locator('tbody tr', { hasText: '배준서' })
    await expect(billRow).toHaveCount(1)
    await expect(billRow.locator('.dx')).toHaveText('F51.0')
    await expect(billRow.locator('.dx-ko')).toHaveText('비기질성 불면증')
    await expect(billRow.locator('.badge')).toContainText('미수납')
  })

  test('환자 검색 — 통합 검색 후 열기로 이동', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-item', { hasText: '환자 검색' }).click()
    await expect(page.locator('.crumb h1')).toHaveText('환자 검색')

    // 외래 7 + 입원 9 = 16
    await expect(page.locator('tbody tr')).toHaveCount(16)

    // 이름 검색
    await page.locator('.search-input input').fill('강하늘')
    await expect(page.locator('tbody tr')).toHaveCount(1)

    // 열기 → 대시보드로 이동하며 해당 환자 선택
    await page.locator('tbody tr', { hasText: '강하늘' }).locator('.row-act').click()
    await expect(page.locator('.crumb h1')).toHaveText('진료 대시보드')
    await expect(page.locator('.pt-id h2')).toHaveText('강하늘')
  })

  test('환자 검색 — 입원 환자 필터', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-item', { hasText: '환자 검색' }).click()
    await page.locator('.search-bar .seg button', { hasText: '입원' }).click()
    await expect(page.locator('tbody tr')).toHaveCount(9)
  })

  test('통계 지표 — 네비게이션·집계 카드', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-item', { hasText: '통계 · 지표' }).click()

    await expect(page.locator('.crumb h1')).toHaveText('통계 · 지표')
    // 관리 환자 = 외래 7 + 입원 9 = 16
    const total = page
      .locator('.kpi')
      .filter({ has: page.locator('.lab', { hasText: '관리 환자' }) })
      .locator('.val')
    await expect(total).toHaveText('16')
    // 통계 카드 7개 + 위험도 도넛 canvas
    await expect(page.locator('.stat-card')).toHaveCount(7)
    await expect(page.locator('.donut-cv')).toBeVisible()
    // 외래 진단 분포: 코드 + KCD 한글명으로 막대가 그려짐
    const outDx = page.locator('.stat-card', { hasText: '외래 진단 분포' })
    await expect(outDx.locator('.dxbar-row').first()).toBeVisible()
    await expect(outDx).toContainText('범불안장애') // 임서윤 F41.1
    // 입원 진단 분포에도 한글명(문상철 F20.0 편집조현병)
    await expect(page.locator('.stat-card', { hasText: '입원 진단 분포' })).toContainText('편집조현병')
    // 진단군(F-블록) 집계: 외래+입원 합산.
    // 기분장애 = 외래 F33.1·F32.2·F31.1(3) + 입원 F31.2·F32.2·F33.2(3) = 6
    const grp = page.locator('.stat-card', { hasText: '진단군 분포' })
    await expect(grp).toContainText('기분장애')
    await expect(grp.locator('.dxbar-row', { hasText: '기분장애' }).locator('.dxbar-n')).toHaveText('6')
  })

  test('새로고침 — 데이터 재조회', async ({ page }) => {
    await page.goto('/')
    await page.locator('.crumb-actions .btn', { hasText: '새로고침' }).click()
    await expect(page.locator('.qrow')).toHaveCount(7)
  })

  test('신규 진료 시작 — 환자 접수 후 대기열·선택 반영', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qrow')).toHaveCount(7)
    await page.locator('.crumb-actions .btn.primary', { hasText: '신규 진료 시작' }).click()
    await expect(page.locator('.modal-card')).toBeVisible()
    await page.locator('.note-field', { hasText: '환자명' }).locator('input').fill('신규접수환자')
    // 진단: DSM-5명으로 검색·선택 → ICD-10/KCD 코드 저장
    await page.locator('.dx-search').fill('panic')
    await page.locator('.dx-opt', { hasText: 'Panic disorder' }).click()
    await expect(page.locator('.dx-selected')).toContainText('F41.0')
    await page.locator('.modal-card button[type="submit"]').click()
    await expect(page.locator('.modal-card')).toHaveCount(0)
    await expect(page.locator('.qrow')).toHaveCount(8)
    await expect(page.locator('.pt-id h2')).toHaveText('신규접수환자')
  })

  test('진단 선택 — DSM-5명/한글/코드 검색 → ICD-10(KCD) 저장', async ({ page }) => {
    await page.goto('/')
    await page.locator('.crumb-actions .btn.primary', { hasText: '신규 진료 시작' }).click()
    await expect(page.locator('.modal-card')).toBeVisible()

    // 한글 진단명으로 검색 → 범불안장애(F41.1) 1건
    await page.locator('.dx-search').fill('범불안')
    await expect(page.locator('.dx-opt')).toHaveCount(1)
    await page.locator('.dx-opt', { hasText: 'Generalized anxiety' }).click()
    await expect(page.locator('.dx-selected')).toContainText('F41.1')
    await expect(page.locator('.dx-selected')).toContainText('범불안장애')

    // 코드로도 검색 → ADHD는 KCD 기준 F90.0
    await page.locator('.dx-search').fill('F90')
    await expect(page.locator('.dx-opt')).toHaveCount(1)
    await expect(page.locator('.dx-opt')).toContainText('활동성 및 주의력 장애')
    await page.locator('.dx-opt', { hasText: 'Attention-deficit' }).click()
    await expect(page.locator('.dx-selected')).toContainText('F90.0')

    // 양극성 II형은 KCD 기준 F31.8 (ICD-10-CM의 F31.81 아님)
    await page.locator('.dx-search').fill('Bipolar II')
    await expect(page.locator('.dx-opt')).toContainText('F31.8')
    await expect(page.locator('.dx-opt')).not.toContainText('F31.81')
  })

  test('환자 패널·대기열 — dx 코드에 한글 진단명 동반 표시', async ({ page }) => {
    await page.goto('/')
    // 기본 선택 환자(정수민, F33.1) 패널: 코드 + KCD 한글명
    const dx = page.locator('.pt-dx')
    await expect(dx).toContainText('F33.1')
    await expect(dx).toContainText('재발성 우울장애')

    // 대기열 행: 코드 아래 한글명(조민재 F20.0 편집조현병)
    const row = page.locator('.qrow', { hasText: '조민재' })
    await expect(row.locator('.dx')).toHaveText('F20.0')
    await expect(row.locator('.dx-ko')).toHaveText('편집조현병')

    // 다른 환자 선택 시 패널 진단 갱신(임서윤 F41.1 범불안장애)
    await page.locator('.qrow', { hasText: '임서윤' }).click()
    await expect(dx).toContainText('F41.1')
    await expect(dx).toContainText('범불안장애')
  })

  test('대기열 행을 클릭하면 환자 패널이 바뀐다', async ({ page }) => {
    await page.goto('/')
    await page.locator('.qrow', { hasText: '강하늘' }).click()
    await expect(page.locator('.pt-id h2')).toHaveText('강하늘')
    // 응급/고위험 태그 노출
    await expect(page.locator('.pt-tags')).toContainText('자살위기 고위험')
  })

  test('탭 전환 — 척도/검사/처방/경과', async ({ page }) => {
    await page.goto('/')

    await page.locator('.tab', { hasText: '검사·약물농도' }).click()
    await expect(page.locator('.lab-group').first()).toBeVisible()

    await page.locator('.tab', { hasText: '처방·오더' }).click()
    await expect(page.locator('.rx').first()).toBeVisible()
    await expect(page.locator('.warnbox')).toBeVisible()

    await page.locator('.tab', { hasText: '경과·면담' }).click()
    await expect(page.locator('.note .soap').first()).toBeVisible()
  })

  test('다크/라이트 테마 토글', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await page.locator('button[title="테마 전환"]').click()
    await expect(html).toHaveAttribute('data-theme', 'light')
    await page.locator('button[title="테마 전환"]').click()
    await expect(html).toHaveAttribute('data-theme', 'dark')
  })

  test('검색 — 이름으로 대기열 필터', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qrow')).toHaveCount(7)

    await page.locator('.topsearch input').fill('강하늘')
    await expect(page.locator('.qrow')).toHaveCount(1)
    await expect(page.locator('.qrow')).toContainText('강하늘')

    // 지우기 버튼 → 다시 전체
    await page.locator('.topsearch-clear').click()
    await expect(page.locator('.qrow')).toHaveCount(7)
  })

  test('검색 — F코드/차트번호로도 필터, 없으면 빈 상태', async ({ page }) => {
    await page.goto('/')
    await page.locator('.topsearch input').fill('F20')
    await expect(page.locator('.qrow')).toHaveCount(1)
    await expect(page.locator('.qrow .dx')).toHaveText('F20.0')

    await page.locator('.topsearch input').fill('없는환자zzz')
    await expect(page.locator('.qrow')).toHaveCount(0)
    await expect(page.locator('.queue-empty')).toBeVisible()
  })

  test('노트 작성 — SOAP 입력 후 목록 맨 위에 추가', async ({ page }) => {
    await page.goto('/')
    await page.locator('.tab', { hasText: '경과·면담' }).click()

    const before = await page.locator('.note').count()

    await page.locator('.note-add-btn').click()
    await expect(page.locator('.note-form')).toBeVisible()
    await page.locator('.note-field', { hasText: '주관적' }).locator('textarea').fill('E2E 테스트 경과 기록')
    await page.locator('.note-field', { hasText: '평가' }).locator('textarea').fill('F33.1 유지')
    await page.locator('.note-form button[type="submit"]').click()

    // 폼 닫히고 노트 1개 증가
    await expect(page.locator('.note')).toHaveCount(before + 1)
    // 맨 위(최신) 노트에 작성자 + 입력 내용
    const top = page.locator('.note').first()
    await expect(top).toContainText('서연우 과장')
    await expect(top).toContainText('E2E 테스트 경과 기록')
  })

  test('처방 추가 — 입력 후 처방 목록에 반영', async ({ page }) => {
    await page.goto('/')
    await page.locator('.tab', { hasText: '처방·오더' }).click()

    const before = await page.locator('.rx').count()

    await page.locator('.note-add-btn', { hasText: '처방 추가' }).click()
    await expect(page.locator('.note-form')).toBeVisible()
    await page.locator('.note-field', { hasText: '약물명' }).locator('input').fill('설트랄린 50mg')
    await page.locator('.note-field', { hasText: '용법' }).locator('input').fill('1일 1회 1정 · 아침')
    await page.locator('.note-form button[type="submit"]').click()

    await expect(page.locator('.rx')).toHaveCount(before + 1)
    await expect(page.locator('.rx').last()).toContainText('설트랄린 50mg')
    await expect(page.locator('.rx').last()).toHaveClass(/new/)
  })

  test('처방 시 재고 자동 차감 — 약품 마스터 일치 시 stock 감소', async ({ page }) => {
    await page.goto('/')
    // 졸피뎀 10mg 20T 처방 (약품 마스터 재고 140 → 120)
    await page.locator('.tab', { hasText: '처방·오더' }).click()
    await page.locator('.note-add-btn', { hasText: '처방 추가' }).click()
    await page.locator('.note-field', { hasText: '약물명' }).locator('input').fill('졸피뎀 10mg')
    await page.locator('.note-field', { hasText: '용법' }).locator('input').fill('취침 전 1정')
    await page.locator('.note-field', { hasText: '수량' }).locator('input').fill('20T')
    await page.locator('.note-form button[type="submit"]').click()
    await expect(page.locator('.rx').last()).toContainText('졸피뎀 10mg')

    // 약품·재고 화면에서 재고 차감 확인
    await page.locator('.nav-item', { hasText: '약품 · 재고' }).click()
    const row = page.locator('tbody tr', { hasText: '졸피뎀 10mg' })
    await expect(row.locator('td.ta-r.num').first()).toHaveText('120')
  })

  test('처방 시 재고 — 마스터에 없는 약물명은 차감 없음', async ({ page }) => {
    await page.goto('/')
    await page.locator('.tab', { hasText: '처방·오더' }).click()
    await page.locator('.note-add-btn', { hasText: '처방 추가' }).click()
    // 용량 불일치(쿠에티아핀 25mg 마스터 ≠ 200mg 처방) → 차감 없음
    await page.locator('.note-field', { hasText: '약물명' }).locator('input').fill('쿠에티아핀 200mg')
    await page.locator('.note-field', { hasText: '용법' }).locator('input').fill('1일 2회')
    await page.locator('.note-field', { hasText: '수량' }).locator('input').fill('60T')
    await page.locator('.note-form button[type="submit"]').click()

    await page.locator('.nav-item', { hasText: '약품 · 재고' }).click()
    const row = page.locator('tbody tr', { hasText: '쿠에티아핀 25mg' })
    await expect(row.locator('td.ta-r.num').first()).toHaveText('90') // 변동 없음
  })

  test('노트 수정 — 내용 변경 후 반영', async ({ page }) => {
    await page.goto('/')
    await page.locator('.tab', { hasText: '경과·면담' }).click()
    const first = page.locator('.note').first()
    await first.locator('.row-act', { hasText: '수정' }).click()
    const form = page.locator('.note-form')
    await form.locator('textarea').first().fill('수정된 경과 내용 E2E')
    await form.getByRole('button', { name: '수정 저장' }).click()
    await expect(page.locator('.note').first()).toContainText('수정된 경과 내용 E2E')
  })

  test('노트 삭제 — 확인 후 목록에서 제거', async ({ page }) => {
    page.on('dialog', (d) => d.accept())
    await page.goto('/')
    await page.locator('.tab', { hasText: '경과·면담' }).click()
    const before = await page.locator('.note').count()
    await page.locator('.note').first().locator('.row-act', { hasText: '삭제' }).click()
    await expect(page.locator('.note')).toHaveCount(before - 1)
  })

  test('처방 수정 — 약물명 변경 후 반영', async ({ page }) => {
    await page.goto('/')
    await page.locator('.tab', { hasText: '처방·오더' }).click()
    await page.locator('.rx').first().locator('.row-act', { hasText: '수정' }).click()
    const form = page.locator('.note-form')
    await form.locator('.note-field', { hasText: '약물명' }).locator('input').fill('수정된약물 5mg')
    await form.getByRole('button', { name: '수정 저장' }).click()
    await expect(page.locator('.rx').first()).toContainText('수정된약물 5mg')
  })

  test('처방 삭제 — 확인 후 목록에서 제거', async ({ page }) => {
    page.on('dialog', (d) => d.accept())
    await page.goto('/')
    await page.locator('.tab', { hasText: '처방·오더' }).click()
    const before = await page.locator('.rx').count()
    await page.locator('.rx').first().locator('.row-act', { hasText: '삭제' }).click()
    await expect(page.locator('.rx')).toHaveCount(before - 1)
  })

  test('척도 입력 — PHQ-9 점수 입력 시 카드 추가', async ({ page }) => {
    await page.goto('/')
    // 평가척도 탭은 기본 활성
    const before = await page.locator('.scale').count()
    await page.locator('.note-add-btn', { hasText: '척도 입력' }).click()
    await expect(page.locator('.note-form')).toBeVisible()
    await page.locator('.note-field select').selectOption('PHQ-9')
    await page.locator('.note-field input[type="number"]').fill('21')
    await page.getByRole('button', { name: '척도 저장' }).click()
    await expect(page.locator('.scale')).toHaveCount(before + 1)
    // 21점 → 중증
    await expect(page.locator('.scale').last()).toContainText('중증')
  })

  test('척도 삭제 — 확인 후 카드 제거', async ({ page }) => {
    page.on('dialog', (d) => d.accept())
    await page.goto('/')
    const before = await page.locator('.scale').count()
    await page.locator('.scale').first().locator('.scale-act.del').click()
    await expect(page.locator('.scale')).toHaveCount(before - 1)
  })

  test('척도 수정 — 점수 변경 시 중증도 갱신', async ({ page }) => {
    await page.goto('/')
    // PHQ-9 (정수민, 14=중등도) 수정 → 3점=정상
    const phq = page.locator('.scale', { hasText: 'PHQ-9' })
    await phq.locator('.scale-act', { hasText: '수정' }).click()
    await expect(page.locator('.note-form')).toBeVisible()
    await page.locator('.note-field input[type="number"]').fill('3')
    await page.getByRole('button', { name: '수정 저장' }).click()
    await expect(page.locator('.scale', { hasText: 'PHQ-9' })).toContainText('정상')
  })

  test('검사 입력 — 항목 추가 시 표에 반영', async ({ page }) => {
    await page.goto('/')
    await page.locator('.tab', { hasText: '검사·약물농도' }).click()
    const before = await page.locator('.lab-val').count()
    await page.locator('.note-add-btn', { hasText: '검사 입력' }).click()
    await expect(page.locator('.note-form')).toBeVisible()
    await page.locator('.note-field', { hasText: '항목명' }).locator('input').fill('비타민D')
    await page.locator('.note-field', { hasText: '결과' }).locator('input').fill('18')
    await page.getByRole('button', { name: '검사 저장' }).click()
    await expect(page.locator('.lab-val')).toHaveCount(before + 1)
    await expect(page.locator('.panes')).toContainText('비타민D')
  })

  test('검사 삭제 — 확인 후 행 제거', async ({ page }) => {
    page.on('dialog', (d) => d.accept())
    await page.goto('/')
    await page.locator('.tab', { hasText: '검사·약물농도' }).click()
    const before = await page.locator('.lab-val').count()
    await page.locator('.lab-del').first().click()
    await expect(page.locator('.lab-val')).toHaveCount(before - 1)
  })

  test('검사 수정 — 결과·판정 변경 후 반영', async ({ page }) => {
    await page.goto('/')
    await page.locator('.tab', { hasText: '검사·약물농도' }).click()
    // 첫 검사 행 수정
    await page.locator('tbody .row-act', { hasText: '수정' }).first().click()
    await expect(page.locator('.note-form')).toBeVisible()
    await page.locator('.note-field', { hasText: '결과' }).locator('input').fill('0.99')
    await page.getByRole('button', { name: '수정 저장' }).click()
    await expect(page.locator('.panes')).toContainText('0.99')
  })

  test('정렬 — 위험도순은 고위험을 맨 위로', async ({ page }) => {
    await page.goto('/')

    // 위험도 정렬: 첫 행 = 고위험(강하늘)
    await page.locator('.queue .seg button', { hasText: '위험도' }).click()
    await expect(page.locator('.qrow').first()).toContainText('강하늘')

    // 접수순 정렬: 첫 행 = 가장 먼저 접수(정수민 13:34)
    await page.locator('.queue .seg button', { hasText: '접수순' }).click()
    await expect(page.locator('.qrow').first()).toContainText('정수민')
  })
})
