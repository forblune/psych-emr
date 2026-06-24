// UI chrome that isn't clinical data — kept client-side, not in the DB.
// (Sidebar navigation + infra status indicators.)

export const navGroups = [
  {
    title: '진료',
    items: [
      { icon: 'dashboard', label: '진료 대시보드', view: 'dashboard' },
      { icon: 'user', label: '환자 검색', view: 'search' },
      { icon: 'calendar', label: '예약 관리', count: 26, view: 'appts' },
      { icon: 'checklist', label: '진료 대기열', count: 7 },
    ],
  },
  {
    title: '평가 · 치료',
    items: [
      { icon: 'pill', label: '처방 · 오더' },
      { icon: 'chart', label: '심리평가 · 척도', count: 4, crit: true, view: 'scale-demo' },
      { icon: 'chat', label: '상담 · 면담 기록' },
      { icon: 'hospital', label: '입원 · 폐쇄병동', count: 9, view: 'ward' },
    ],
  },
  {
    title: '운영',
    items: [
      { icon: 'card', label: '청구 · 수납', view: 'billing' },
      { icon: 'box', label: '약품 · 재고', count: 2, crit: true, view: 'meds' },
      { icon: 'bars', label: '통계 · 지표', view: 'stats' },
      { icon: 'gear', label: '설정' },
    ],
  },
]

export const systemStatus = [
  { label: 'HIRA 청구 연동', value: '정상', ok: true },
  { label: '척도검사 서버', value: '정상', ok: true },
  { label: '마지막 동기화', value: '12:41:08', ok: false },
]
