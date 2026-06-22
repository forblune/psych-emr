// ─────────────────────────────────────────────────────────────
// Mock data shaped like API responses.
// Swap each export for a Supabase query later (see api.js stubs).
// ─────────────────────────────────────────────────────────────

export const clinic = {
  hospital: '메디코어',
  department: '정신건강의학과',
  room: '제2진료실',
  session: '2026-06-22 오후 진료',
  date: '2026-06-22 (월)',
}

export const doctor = {
  name: '서연우 과장',
  title: '정신건강의학과 전문의',
  id: '2208',
  initial: '서',
}

export const systemStatus = [
  { label: 'HIRA 청구 연동', value: '정상', ok: true },
  { label: '척도검사 서버', value: '정상', ok: true },
  { label: '마지막 동기화', value: '12:41:08', ok: false },
]

export const kpis = [
  { tone: 't-acc', label: '금일 예약', value: '26', sub: '완료 14 · 잔여 12' },
  { tone: 't-warn', label: '대기 환자', value: '7', sub: '평균 대기', delta: '31분', deltaTone: 'dn' },
  { tone: 't-acc', label: '상담 중', value: '1', sub: '제2진료실' },
  { tone: 't-crit', label: '미작성 기록', value: '5', sub: '면담노트 · 척도 3건' },
  { tone: 't-crit', label: '고위험 환자', value: '3', sub: '자살위험 평가 필요' },
  { tone: 't-ok', label: '담당 입원', value: '9', sub: '폐쇄병동 · 격리 1' },
]

export const navGroups = [
  {
    title: '진료',
    items: [
      { icon: 'dashboard', label: '진료 대시보드', active: true },
      { icon: 'user', label: '환자 검색' },
      { icon: 'calendar', label: '예약 관리', count: 26 },
      { icon: 'checklist', label: '진료 대기열', count: 7 },
    ],
  },
  {
    title: '평가 · 치료',
    items: [
      { icon: 'pill', label: '처방 · 오더' },
      { icon: 'chart', label: '심리평가 · 척도', count: 5, crit: true },
      { icon: 'chat', label: '상담 · 면담 기록' },
      { icon: 'hospital', label: '입원 · 폐쇄병동', count: 9 },
    ],
  },
  {
    title: '운영',
    items: [
      { icon: 'card', label: '청구 · 수납' },
      { icon: 'box', label: '약품 · 재고', count: 2, crit: true },
      { icon: 'bars', label: '통계 · 지표' },
      { icon: 'gear', label: '설정' },
    ],
  },
]

export const schedule = {
  range: '오후 · 13:00–18:00',
  slots: [
    { time: '13:00', name: '윤도현', desc: '재진 · 공황장애', bar: 'sl-mut', badge: { cls: 'b-done', label: '완료' } },
    { time: '13:20', name: '오지안', desc: '재진 · ADHD', bar: 'sl-mut', badge: { cls: 'b-done', label: '완료' } },
    { time: '13:40', name: '정수민', desc: '재진 · 우울장애', bar: 'sl-acc', badge: { cls: 'b-prog', label: '상담중' }, now: true },
    { time: '14:00', name: '강하늘', desc: '응급 · 자살위기 평가', bar: 'sl-warn', tail: '대기' },
    { time: '14:50', name: '임서윤', desc: '초진면담 50분 · 불안', bar: 'sl-mut', tail: '예약' },
    { time: '15:40', name: '배준서', desc: '심리상담 50분', bar: 'sl-mut', tail: '예약' },
    { time: '16:30', name: '한예린', desc: '재진 · 양극성장애', bar: 'sl-mut', tail: '예약' },
    { time: '16:50', name: '조민재', desc: '재진 · 조현병', bar: 'sl-mut', tail: '예약' },
    { time: '17:10', name: '신아윤', desc: '재진 · 불면', bar: 'sl-mut', tail: '예약' },
  ],
}

// ── detail builders ──────────────────────────────────────────
const QTC = (v, f = 'f-n') => ({ name: 'QTc (ECG)', val: v, ref: '<450 ms', flag: 'QTc', flagType: f })

// ── queue with per-patient detail (drives the right panel) ───
export const queue = [
  {
    no: 'A-08', name: '정수민', sex: '여', age: 34, chart: '00513382', rrn: '920***-2******',
    type: '재진', statusCls: 'b-prog', status: '상담중', dx: 'F33.1', received: '13:34', wait: '-',
    risk: 'md', initial: '정',
    tags: ['자살위험 중등도', '주요우울장애', '범불안장애', '불면증'],
    detail: {
      safety: { level: 'md', sev: 'C-SSRS\n중등도', text: '자살위험 중등도 — 자살사고 간헐적 보고(지난주 빈도 증가), 구체적 계획·시도 없음. 안전계획 수립 완료 · 보호자 동반 확인. 다음 내원 시 재평가 필수.', bold: '자살위험 중등도' },
      scales: [
        { name: 'PHQ-9', tag: '우울', value: 14, max: 27, pct: 52, cls: 'mod', label: '중등도' },
        { name: 'GAD-7', tag: '불안', value: 11, max: 21, pct: 52, cls: 'mod', label: '중등도' },
        { name: 'ISI', tag: '불면', value: 18, max: 28, pct: 64, cls: 'sev', label: '중증' },
        { name: 'AUDIT', tag: '음주', value: 4, max: 40, pct: 10, cls: 'min', label: '정상' },
      ],
      trend: { labels: ['3/30', '4/13', '4/27', '5/11', '5/25', '6/08', '6/15', '6/22'], phq: [22, 20, 19, 17, 16, 15, 14, 14], gad: [15, 14, 13, 12, 12, 11, 11, 11] },
      summary: '4월 초 PHQ-9 22(중증)에서 약물·인지행동치료 병행 후 14(중등도)까지 호전. 불면(ISI 18)은 정체 상태로 수면위생 교육 및 야간 약물 조정 검토. 불안(GAD-7) 완만한 개선.',
      labs: [
        { group: '약물 혈중농도 모니터링', rows: [
          { name: 'Lithium', val: '0.74', ref: '0.6–1.0 mmol/L', flag: 'N', flagType: 'f-n' },
          { name: 'Valproate', val: '—', ref: '50–100 µg/mL', flag: '미시행', flagType: 'ref' },
        ]},
        { group: '대사 · 안전성 모니터링', rows: [
          { name: '공복혈당', val: '108', ref: '70–100 mg/dL', flag: 'H', flagType: 'f-h' },
          { name: 'HbA1c', val: '5.7', ref: '4.0–5.6 %', flag: 'H', flagType: 'f-h' },
          { name: 'LDL 콜레스테롤', val: '146', ref: '<130 mg/dL', flag: 'H', flagType: 'f-h' },
          { name: '중성지방 TG', val: '188', ref: '<150 mg/dL', flag: 'H', flagType: 'f-h' },
          { name: '프로락틴', val: '31', ref: '4.8–23.3 ng/mL', flag: 'H', flagType: 'f-h' },
          { name: 'TSH', val: '2.4', ref: '0.4–4.0 mIU/L', flag: 'N', flagType: 'f-n' },
          { name: 'AST / ALT', val: '26 / 29', ref: '0–40 IU/L', flag: 'N', flagType: 'f-n' },
          QTC('438'),
          { name: '체중 / BMI', val: '61.2 / 23.8', ref: '+2.1kg vs 3월', flag: '↑', flagType: 'f-l' },
        ]},
      ],
      rx: {
        items: [
          { klass: 'SSRI · 항우울제', name: '에스시탈로프람 15mg', brand: '(렉사프로정)', dose: '1일 1회 1정 · 아침 식후', sub: '주요우울장애 · 90일분 · 10mg→15mg 증량 06/22', qty: '90T', price: '₩18,900' },
          { klass: 'NDRI · 항우울제', name: '부프로피온 XL 150mg', brand: '(웰부트린엑스엘정)', dose: '1일 1회 1정 · 아침', sub: '우울 · 의욕저하 보강 · 30일분', qty: '30T', price: '₩21,000' },
          { klass: '비정형 항정신병약 · 저용량', name: '쿠에티아핀 50mg', brand: '(쎄로켈정)', dose: '취침 전 1정', sub: '불면 · 증강요법 · 30일분', qty: '30T', price: '₩9,600' },
          { klass: '벤조디아제핀 · 항불안', klassWarn: true, name: '로라제팜 0.5mg', brand: '(아티반정)', dose: '불안·초조 시 1정 · 1일 최대 2회', sub: '14일분 · ', subBold: '신규 — 검토 대기', qty: '14T', price: '₩2,800', isNew: true },
        ],
        warn: { title: '처방 검토 알림', text: '벤조디아제핀(로라제팜) 의존·내성 위험. 2주 이내 단기 처방 권고, 정기 재평가 필요. SSRI+쿠에티아핀 병용 시 QTc 추적(현재 438ms) 권장.' },
      },
      notes: [
        { author: '서연우 과장', dept: '정신건강의학과', datetime: '2026-06-22 13:40', segments: [
          { label: 'S)', text: ' 2주간 우울감·무기력 악화, 입면 곤란(1시간 이상), 직장 복귀 스트레스. 자살사고 간헐(빈도 증가), 구체적 계획 없음.' },
          { label: 'O)', text: ' MSE — 외모 단정, 정신운동 경도 지체, 정동 우울·불안, 사고흐름 논리적, 자살사고(+)·계획(−), 병식 양호, 인지 정상. PHQ-9 14 · GAD-7 11 · ISI 18.' },
          { label: 'A)', text: ' 주요우울장애, 재발성, 중등도(F33.1) / 범불안장애(F41.1) / 비기질성 불면증(F51.0).' },
          { label: 'P)', text: ' 에스시탈로프람 15mg 증량, 쿠에티아핀 취침전 유지, CBT 주 1회 연계, 자살안전계획 갱신, 2주 후 재평가.' },
        ]},
        { author: '서연우 과장', dept: '정신건강의학과', datetime: '2026-06-08 13:20', segments: [
          { label: 'S)', text: ' 수면 일부 호전, 낮 활동량 증가. 식욕 회복 중.' },
          { label: 'A)', text: ' 주요우울장애 부분 관해 경과.' },
          { label: 'P)', text: ' 약물 유지, 활동 스케줄링 과제 부여. PHQ-9 15.' },
        ]},
        { author: '한가람 임상심리사', dept: '심리평가', datetime: '2026-05-25 11:00', segments: [
          { label: '평가)', text: ' 종합심리검사(Full Battery) — MMPI-2, BDI-II, 로르샤흐. 우울·불안 척도 상승, 대인 위축 시사.' },
          { label: '권고)', text: ' 인지행동치료 적응증, 자동적 사고 다루기 우선.' },
        ]},
      ],
    },
  },
  {
    no: 'E-01', name: '강하늘', sex: '남', age: 27, chart: '00781120', rrn: '990***-1******',
    type: '응급', statusCls: 'b-emg', status: '위기', dx: 'F32.2', received: '13:50', wait: '4분',
    risk: 'hi', initial: '강',
    tags: ['자살위기 고위험', '주요우울 중증', '응급 평가'],
    detail: {
      safety: { level: 'hi', sev: 'C-SSRS\n고위험', text: '자살위기 고위험 — 구체적 자살계획 및 최근 자해 시도력. 즉시 보호자 연락 및 입원 평가 진행 중. 단독 귀가 불가, 지속 관찰 필요.', bold: '자살위기 고위험' },
      scales: [
        { name: 'PHQ-9', tag: '우울', value: 24, max: 27, pct: 89, cls: 'sev', label: '중증' },
        { name: 'GAD-7', tag: '불안', value: 17, max: 21, pct: 81, cls: 'sev', label: '중증' },
        { name: 'ISI', tag: '불면', value: 22, max: 28, pct: 78, cls: 'sev', label: '중증' },
        { name: 'C-SSRS', tag: '자살', value: 5, max: 6, pct: 83, cls: 'sev', label: '고위험' },
      ],
      trend: { labels: ['초진', '+1주', '+2주', '오늘'], phq: [20, 22, 23, 24], gad: [14, 15, 16, 17] },
      summary: '증상 악화 추세 — PHQ-9 지속 상승, 자살위험도 고위험으로 평가됨. 외래 관리 한계, 폐쇄병동 입원 적응증 검토 중.',
      labs: [
        { group: '응급 기본 · 안전성', rows: [
          { name: 'CBC', val: '정상', ref: '—', flag: 'N', flagType: 'f-n' },
          { name: '간기능 AST/ALT', val: '34 / 41', ref: '0–40 IU/L', flag: 'H', flagType: 'f-h' },
          { name: 'TSH', val: '1.9', ref: '0.4–4.0 mIU/L', flag: 'N', flagType: 'f-n' },
          { name: '약물·알코올 선별', val: '음성', ref: '—', flag: 'N', flagType: 'f-n' },
          QTC('446'),
        ]},
      ],
      rx: {
        items: [
          { klass: 'SSRI · 항우울제', name: '에스시탈로프람 10mg', brand: '(렉사프로정)', dose: '1일 1회 1정 · 아침', sub: '초진 처방 · 7일분(단기)', qty: '7T', price: '₩1,470' },
          { klass: '비정형 항정신병약', klassWarn: true, name: '쿠에티아핀 100mg', brand: '(쎄로켈정)', dose: '취침 전 1정', sub: '초조·불면 · ', subBold: '신규 — 입원 시 재조정', qty: '7T', price: '₩3,360', isNew: true },
        ],
        warn: { title: '응급 처방 주의', text: '자살위험 고위험 — 치명적 과량 위험 약물 단기 소량 처방. 입원 결정 시 처방 전면 재검토. 약물 보관 보호자 위임 권고.' },
      },
      notes: [
        { author: '서연우 과장', dept: '정신건강의학과', datetime: '2026-06-22 13:54', segments: [
          { label: 'S)', text: ' 2일 전 자해 시도, 지속적 자살사고 및 구체적 계획 호소. 무망감 심화.' },
          { label: 'O)', text: ' MSE — 정동 심한 우울, 정신운동 지체, 자살사고(+)·계획(+)·시도력(+), 병식 부분적. C-SSRS 고위험.' },
          { label: 'A)', text: ' 주요우울장애, 단일삽화, 중증(F32.2), 자살위기.' },
          { label: 'P)', text: ' 보호자 연락 완료, 폐쇄병동 입원 평가 진행, 지속 관찰. 단기 약물 소량 처방.' },
        ]},
      ],
    },
  },
  {
    no: 'A-09', name: '임서윤', sex: '여', age: 22, chart: '00822640', rrn: '040***-4******',
    type: '초진', statusCls: 'b-new', status: '신규', dx: 'F41.1', received: '13:55', wait: '9분',
    risk: '', initial: '임',
    tags: ['범불안장애 의심', '초진면담'],
    detail: {
      safety: { level: 'md', sev: 'C-SSRS\n저위험', text: '자살위험 낮음 — 자살사고 없음. 초진 평가 단계, 증상 스크리닝 진행 중.', bold: '자살위험 낮음' },
      scales: [
        { name: 'GAD-7', tag: '불안', value: 13, max: 21, pct: 62, cls: 'mod', label: '중등도' },
        { name: 'PHQ-9', tag: '우울', value: 7, max: 27, pct: 26, cls: 'mild', label: '경도' },
        { name: 'ISI', tag: '불면', value: 9, max: 28, pct: 32, cls: 'mild', label: '경도' },
        { name: 'AUDIT', tag: '음주', value: 2, max: 40, pct: 5, cls: 'min', label: '정상' },
      ],
      trend: { labels: ['오늘'], phq: [7], gad: [13] },
      summary: '초진 — 범불안장애 의심. 과도한 걱정·근긴장·집중곤란 호소. 종합 평가 및 기저질환 배제 검사 예정.',
      labs: [
        { group: '초진 기본검사', rows: [
          { name: 'TSH', val: '대기', ref: '0.4–4.0 mIU/L', flag: '진행중', flagType: 'ref' },
          { name: 'CBC', val: '대기', ref: '—', flag: '진행중', flagType: 'ref' },
        ]},
      ],
      rx: {
        items: [
          { klass: '초진 · 처방 보류', name: '처방 전 평가 단계', brand: '', dose: '약물 시작 전 종합심리평가 예정', sub: '비약물적 개입(이완훈련) 우선 안내', qty: '—', price: '—' },
        ],
        warn: { title: '초진 안내', text: '약물 처방 전 진단 확정 및 신체질환 배제 필요. 다음 내원 시 검사 결과 확인 후 치료 계획 수립.' },
      },
      notes: [
        { author: '서연우 과장', dept: '정신건강의학과', datetime: '2026-06-22 13:58', segments: [
          { label: 'S)', text: ' 6개월간 지속적 걱정, 긴장, 수면 곤란. 취업 준비 스트레스.' },
          { label: 'A)', text: ' 범불안장애 의심(F41.1) — 추가 평가 필요.' },
          { label: 'P)', text: ' 종합심리평가 의뢰, 갑상선 검사, 2주 후 재내원.' },
        ]},
      ],
    },
  },
  {
    no: 'A-10', name: '한예린', sex: '여', age: 38, chart: '00339915', rrn: '870***-2******',
    type: '재진', statusCls: 'b-wait', status: '대기', dx: 'F31.1', received: '14:02', wait: '21분',
    risk: 'md', initial: '한',
    tags: ['양극성 I형', '리튬 복용', '경조증 관찰'],
    detail: {
      safety: { level: 'md', sev: 'C-SSRS\n저위험', text: '자살위험 낮음 — 현재 기분 상승 국면. 경조증 징후 관찰 필요, 충동성 모니터링.', bold: '자살위험 낮음' },
      scales: [
        { name: 'YMRS', tag: '조증', value: 16, max: 60, pct: 27, cls: 'mod', label: '경조증' },
        { name: 'PHQ-9', tag: '우울', value: 5, max: 27, pct: 18, cls: 'mild', label: '경도' },
        { name: 'ISI', tag: '불면', value: 12, max: 28, pct: 43, cls: 'mod', label: '중등도' },
        { name: 'AUDIT', tag: '음주', value: 6, max: 40, pct: 15, cls: 'mild', label: '주의' },
      ],
      trend: { labels: ['4/20', '5/04', '5/18', '6/01', '6/22'], phq: [12, 9, 6, 5, 5], gad: [8, 7, 6, 5, 6] },
      summary: '우울 삽화 회복 후 기분 상승 전환. YMRS 16으로 경조증 진입 가능성 — 리튬 농도 유지 및 충동 조절 점검 필요.',
      labs: [
        { group: '약물 혈중농도 모니터링', rows: [
          { name: 'Lithium', val: '0.88', ref: '0.6–1.0 mmol/L', flag: 'N', flagType: 'f-n' },
          { name: 'TSH', val: '4.6', ref: '0.4–4.0 mIU/L', flag: 'H', flagType: 'f-h' },
          { name: 'Creatinine', val: '0.9', ref: '0.6–1.2 mg/dL', flag: 'N', flagType: 'f-n' },
        ]},
      ],
      rx: {
        items: [
          { klass: '기분조절제', name: '탄산리튬 300mg', brand: '(리단정)', dose: '1일 2회 1정 · 아침·저녁', sub: '양극성장애 유지 · 30일분', qty: '60T', price: '₩4,800' },
          { klass: '비정형 항정신병약', name: '쿠에티아핀 200mg', brand: '(쎄로켈정)', dose: '취침 전 1정', sub: '기분안정 · 30일분', qty: '30T', price: '₩14,400' },
        ],
        warn: { title: '모니터링 알림', text: 'TSH 4.6으로 상승 — 리튬 유발 갑상선기능저하 의심. 갑상선기능 추적 및 내분비 협진 고려.' },
      },
      notes: [
        { author: '서연우 과장', dept: '정신건강의학과', datetime: '2026-06-01 10:30', segments: [
          { label: 'S)', text: ' 수면 욕구 감소, 활동량 증가, 자신감 상승.' },
          { label: 'A)', text: ' 양극성 I형, 경조증 전환 의심(F31.1).' },
          { label: 'P)', text: ' 리튬 유지, 충동 조절 교육, 2주 후 재평가.' },
        ]},
      ],
    },
  },
  {
    no: 'A-11', name: '조민재', sex: '남', age: 45, chart: '00210073', rrn: '800***-1******',
    type: '재진', statusCls: 'b-wait', status: '대기', dx: 'F20.0', received: '14:08', wait: '28분',
    risk: 'md', initial: '조',
    tags: ['조현병', '클로자핀 ANC 모니터'],
    detail: {
      safety: { level: 'md', sev: 'C-SSRS\n저위험', text: '자살위험 낮음 — 환청 빈도 감소, 병식 부분 회복. 약물 순응도 양호.', bold: '자살위험 낮음' },
      scales: [
        { name: 'PANSS', tag: '양성', value: 62, max: 210, pct: 30, cls: 'mod', label: '경중등도' },
        { name: 'PHQ-9', tag: '우울', value: 8, max: 27, pct: 30, cls: 'mild', label: '경도' },
        { name: 'CGI-S', tag: '중증도', value: 4, max: 7, pct: 57, cls: 'mod', label: '중등도' },
        { name: 'AUDIT', tag: '음주', value: 1, max: 40, pct: 3, cls: 'min', label: '정상' },
      ],
      trend: { labels: ['3월', '4월', '5월', '6월'], phq: [12, 10, 9, 8], gad: [10, 9, 8, 7] },
      summary: '클로자핀 유지 중 양성증상 안정. 무과립구증 위험으로 ANC 정기 모니터링 필수 — 현재 정상 범위.',
      labs: [
        { group: '클로자핀 안전성 모니터링', rows: [
          { name: 'ANC (호중구)', val: '2,800', ref: '≥1,500 /µL', flag: 'N', flagType: 'f-n' },
          { name: 'WBC', val: '5.4', ref: '4.0–10.0', flag: 'N', flagType: 'f-n' },
          { name: '공복혈당', val: '118', ref: '70–100 mg/dL', flag: 'H', flagType: 'f-h' },
          QTC('441'),
        ]},
      ],
      rx: {
        items: [
          { klass: '비정형 항정신병약', name: '클로자핀 200mg', brand: '(클로자릴정)', dose: '1일 2회 · 아침·취침전', sub: '치료저항성 조현병 · 14일분', qty: '28T', price: '₩16,800' },
        ],
        warn: { title: 'ANC 모니터링', text: '클로자핀 복용 — 무과립구증 위험. 정기 ANC 검사 의무(현재 2,800/µL 정상). 발열·인후통 시 즉시 내원 교육.' },
      },
      notes: [
        { author: '서연우 과장', dept: '정신건강의학과', datetime: '2026-06-10 11:00', segments: [
          { label: 'S)', text: ' 환청 빈도 감소, 일상 기능 호전.' },
          { label: 'A)', text: ' 조현병, 편집형(F20.0) — 안정 유지.' },
          { label: 'P)', text: ' 클로자핀 유지, ANC 2주 간격 모니터링.' },
        ]},
      ],
    },
  },
  {
    no: 'A-12', name: '오지안', sex: '남', age: 14, chart: '00904471', rrn: '120***-3******',
    type: '재진', statusCls: 'b-wait', status: '대기', dx: 'F90.0', received: '14:14', wait: '34분',
    risk: '', initial: '오',
    tags: ['ADHD', '보호자 동반'],
    detail: {
      safety: { level: 'md', sev: 'C-SSRS\n저위험', text: '자살위험 낮음 — 소아청소년. 보호자 동반 하 평가.', bold: '자살위험 낮음' },
      scales: [
        { name: 'ARS', tag: 'ADHD', value: 28, max: 54, pct: 52, cls: 'mod', label: '중등도' },
        { name: 'PHQ-A', tag: '우울', value: 4, max: 27, pct: 15, cls: 'min', label: '정상' },
        { name: 'CGI-S', tag: '중증도', value: 3, max: 7, pct: 43, cls: 'mild', label: '경도' },
        { name: 'SNAP', tag: '주의력', value: 22, max: 36, pct: 61, cls: 'mod', label: '중등도' },
      ],
      trend: { labels: ['3월', '4월', '5월', '6월'], phq: [6, 5, 4, 4], gad: [5, 4, 4, 3] },
      summary: '메틸페니데이트 시작 후 주의력 개선. 식욕 저하·성장 모니터링 필요. 학교 적응 양호.',
      labs: [
        { group: '성장 · 안전성 모니터링', rows: [
          { name: '신장 / 체중', val: '162 / 48', ref: '백분위 추적', flag: 'N', flagType: 'f-n' },
          { name: '혈압', val: '112/68', ref: '<120/80', flag: 'N', flagType: 'f-n' },
          { name: '맥박', val: '84', ref: '60–100 bpm', flag: 'N', flagType: 'f-n' },
        ]},
      ],
      rx: {
        items: [
          { klass: '중추신경 자극제', name: '메틸페니데이트 OROS 27mg', brand: '(콘서타OROS서방정)', dose: '1일 1회 1정 · 아침', sub: 'ADHD · 28일분', qty: '28T', price: '₩28,000' },
        ],
        warn: { title: '소아 모니터링', text: '식욕저하·성장 지연·혈압 상승 모니터링. 약물 휴일(주말) 적용 여부 보호자와 상의.' },
      },
      notes: [
        { author: '서연우 과장', dept: '정신건강의학과', datetime: '2026-06-12 15:00', segments: [
          { label: 'S)', text: ' (보호자) 수업 집중도 향상, 숙제 수행 개선. 저녁 식욕 감소.' },
          { label: 'A)', text: ' ADHD, 복합형(F90.0) — 치료 반응 양호.' },
          { label: 'P)', text: ' 메틸페니데이트 유지, 체중·식이 모니터링.' },
        ]},
      ],
    },
  },
  {
    no: 'A-13', name: '백서진', sex: '여', age: 51, chart: '00118802', rrn: '740***-2******',
    type: '재진', statusCls: 'b-wait', status: '대기', dx: 'F10.2', received: '14:19', wait: '41분',
    risk: '', initial: '백',
    tags: ['알코올 사용장애', '금주 4주차'],
    detail: {
      safety: { level: 'md', sev: 'C-SSRS\n저위험', text: '자살위험 낮음 — 금주 유지 중, 동기 양호. 재발 고위험 시기 지지 필요.', bold: '자살위험 낮음' },
      scales: [
        { name: 'AUDIT', tag: '음주', value: 21, max: 40, pct: 52, cls: 'sev', label: '의존' },
        { name: 'PHQ-9', tag: '우울', value: 9, max: 27, pct: 33, cls: 'mild', label: '경도' },
        { name: 'GAD-7', tag: '불안', value: 8, max: 21, pct: 38, cls: 'mild', label: '경도' },
        { name: 'CIWA-Ar', tag: '금단', value: 3, max: 67, pct: 5, cls: 'min', label: '경미' },
      ],
      trend: { labels: ['입원', '퇴원', '+2주', '오늘'], phq: [15, 12, 10, 9], gad: [13, 11, 9, 8] },
      summary: '해독 후 금주 4주차 유지. 갈망 감소, 간기능 회복 추세. 단주모임(AA) 연계 진행.',
      labs: [
        { group: '간기능 · 영양', rows: [
          { name: 'AST / ALT', val: '48 / 52', ref: '0–40 IU/L', flag: 'H', flagType: 'f-h' },
          { name: 'GGT', val: '88', ref: '<60 IU/L', flag: 'H', flagType: 'f-h' },
          { name: 'Thiamine(B1)', val: '보충중', ref: '—', flag: 'N', flagType: 'f-n' },
          { name: 'CBC (MCV)', val: '98', ref: '80–100 fL', flag: 'N', flagType: 'f-n' },
        ]},
      ],
      rx: {
        items: [
          { klass: '항갈망제', name: '아캄프로세이트 333mg', brand: '(아캄프로정)', dose: '1일 3회 2정', sub: '금주 유지 · 30일분', qty: '180T', price: '₩27,000' },
          { klass: '비타민 보충', name: '티아민 100mg', brand: '(비타민B1)', dose: '1일 1회', sub: '베르니케 예방 · 30일분', qty: '30T', price: '₩3,000' },
        ],
        warn: { title: '재발 예방', text: '금주 1–3개월 재발 고위험. 음주 갈망 시 대처 전략 점검, AA 참석 독려. 간기능 추적.' },
      },
      notes: [
        { author: '서연우 과장', dept: '정신건강의학과', datetime: '2026-06-15 14:30', segments: [
          { label: 'S)', text: ' 금주 유지, 수면·식욕 회복. 가끔 갈망 있으나 대처 가능.' },
          { label: 'A)', text: ' 알코올 사용장애, 의존(F10.2) — 조기 관해.' },
          { label: 'P)', text: ' 아캄프로세이트 유지, AA 연계, 간기능 추적.' },
        ]},
      ],
    },
  },
]
