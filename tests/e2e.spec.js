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

    // KPI 6개, 대기열 7행
    await expect(page.locator('.kpi')).toHaveCount(6)
    await expect(page.locator('.qrow')).toHaveCount(7)

    // 기본 선택 환자 = 정수민
    await expect(page.locator('.pt-id h2')).toHaveText('정수민')

    // 추이 차트 canvas 존재
    await expect(page.locator('.trend-card canvas')).toBeVisible()

    expect(errors, '콘솔 에러 없음').toEqual([])
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
