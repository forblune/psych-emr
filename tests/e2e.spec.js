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

  test('대기열 정렬 세그먼트 토글(UI 상태)', async ({ page }) => {
    await page.goto('/')
    const seg = page.locator('.queue .seg button', { hasText: '위험도' })
    await seg.click()
    await expect(seg).toHaveClass(/on/)
  })
})
