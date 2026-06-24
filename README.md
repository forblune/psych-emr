# 메디코어 EMR · 정신건강의학과 진료센터 (React)

ERP 스타일 정신과 진료 EMR. 단일 HTML 목업 → React 컴포넌트 + mock 데이터로 시작해,
Supabase(역할 기반 RLS)·Realtime·임상 CRUD까지 확장한 프로토타입.
데이터는 전부 가상. 라이브 데모: https://forblune.github.io/psych-emr/

## 화면 (8종)

진료 대시보드 · 심리평가/척도 데모 · 예약 관리 · 입원/병동 · 통계·지표 · 환자 검색 · 청구·수납 · 약품·재고

주요 흐름:
- **진단 표준화** — DSM-5 진단명으로 선택 → ICD-10(**KCD**) 코드로 저장(`DiagnosisPicker`). 대기열·환자 패널·병동·청구·통계 어디서나 코드+한글 진단명 동반 표시.
- **심리평가/척도 데모** — PHQ-9, GAD-7, 수면 상태, 자살위험 체크 샘플 검사. 브라우저 상태에서만 점수를 계산하고 진단이 아닌 참고 구간으로 표시.
- **예약 → 진료 → 청구 워크플로** — 예약에서 "진료 시작" → 대기열 등록 + 예약 완료 + 주상병 기반 **청구 자동 생성**.
- **약품·재고** — 입고·불출·등록·삭제, **처방 시 재고 자동 차감**, **입·출고 이력**(누가·언제·왜) 감사 로그.

## 실행

```bash
npm install
npm run dev      # 개발 서버 http://localhost:5173
npm run build    # 프로덕션 빌드 → dist/
npm test         # Playwright E2E (mock 모드, 40/40)
npm run deploy   # 빌드 후 dist/ → gh-pages (GitHub Pages)
```

> env가 없으면 자동으로 **로컬 mock 데이터**로 동작합니다(아래 *Supabase 연동* 참고).

## 구조

```
src/
  main.jsx              앱 진입점 (ThemeProvider 주입)
  App.jsx               레이아웃 조립 + view 라우팅 + 전역 상태/핸들러
  theme.css             다크/라이트 테마 (CSS 변수)
  context/
    AuthContext.jsx     Supabase 세션 (로그인 게이트)
    ThemeContext.jsx    다크모드 토글 (data-theme 속성 제어)
  lib/
    supabase.js         Supabase 클라이언트 (env 없으면 미설정 플래그)
    scales.js           평가척도 중증도 자동 분류 (PHQ-9/GAD-7/ISI/AUDIT 밴드)
  data/
    api.js              데이터 접근 seam — env 있으면 Supabase, 없으면 mock
    mock.js             API 응답 형태의 목 데이터 (seed의 단일 소스)
    config.js           순수 UI 설정 (사이드바 nav · 시스템 상태) — DB 아님
    diagnoses.js        진단 마스터 (DSM-5 ↔ ICD-10/KCD 48종)
  components/
    Icon.jsx            라인 아이콘 세트 (이모지 없음)
    TopBar.jsx          상단바 + 통합 검색 + 실시간 시계 + 테마 토글
    Sidebar.jsx         좌측 내비게이션 + 시스템 상태 (view 전환)
    KpiStrip.jsx        상단 KPI 스트립
    Login.jsx           로그인/가입 (Supabase 모드)
    NewVisit.jsx        신규 진료 시작(접수) 모달 + 진단 선택
    DiagnosisPicker.jsx DSM-5 진단명 검색 → ICD-10/KCD 코드 선택
    ── 대시보드 ──
    PatientQueue.jsx    진료 대기열 (행 클릭 → 환자 선택, dx 한글명)
    PatientDetail.jsx   선택 환자 패널 + 탭 컨테이너 (진단 표시)
    Schedule.jsx        오늘 진료 일정
    TrendChart.jsx      증상 경과 추이 차트 (canvas, draw-in)
    ── 화면 ──
    Appointments.jsx    예약 관리 (상태 변경·추가·삭제 + 진료 시작)
    Ward.jsx            입원/병동 보드 + 입퇴원 CRUD
    ScaleDemo.jsx       심리평가/척도 데모 검사 (프론트 상태, 저장 없음)
    Stats.jsx           통계·지표 (집계 차트 + 진단군 분포)
    PatientSearch.jsx   외래·입원 통합 검색
    Billing.jsx         청구·수납 (주상병 + 보험 + 수납 처리)
    Medications.jsx     약품·재고 + 입·출고 이력
    tabs/
      ScalesTab.jsx     평가척도 (PHQ-9/GAD-7/ISI 등) + 자살위험 안전배너
      LabsTab.jsx       검사·약물농도 (리튬 농도, 대사 모니터링 등)
      RxTab.jsx         처방·오더 + 상호작용 경고
      NotesTab.jsx      경과·면담 기록 (MSE 포함 SOAP)
scripts/
  gen-seed.mjs          mock.js → supabase/seed.sql 재생성
  deploy.sh             빌드 후 gh-pages 배포
```

## Supabase 연동

env가 비어 있으면 앱은 **자동으로 로컬 mock 데이터**로 돕니다. 실데이터로 전환하려면:

### 1. Supabase 프로젝트 생성
[supabase.com](https://supabase.com) → New project. 생성 후 **Settings → API** 에서
Project URL 과 anon public key 를 복사.

### 2. 환경변수 설정
```bash
cp .env.example .env
# .env 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 채우기
```

### 3. 스키마 + 데이터 적용
Supabase 대시보드 **SQL Editor** 에 순서대로 붙여넣고 실행:
```
1) supabase/migrations/0001_init.sql      # 테이블 + 인덱스
2) supabase/migrations/0002_auth_rls.sql  # 프로필 + 역할 기반 RLS + 트리거
3) supabase/migrations/0003_note_write.sql # 노트 쓰기 정책
4) supabase/migrations/0004_rx_write.sql   # 처방 쓰기 정책
5) supabase/migrations/0005_note_rx_modify.sql # 노트·처방 수정/삭제 정책
6) supabase/migrations/0006_scale_lab_write.sql # 척도·검사 입력/삭제 정책
7) supabase/migrations/0007_scale_lab_update.sql # 척도·검사 수정 정책
8) supabase/migrations/0008_realtime.sql   # 대기열 Realtime publication
9) supabase/migrations/0009_kpis_view.sql  # 대시보드 KPI 집계 뷰(security_invoker)
10) supabase/migrations/0010_ward.sql      # 입원·병동(wards/admissions) + RLS + 집계 뷰
11) supabase/migrations/0011_admission_write.sql # 입원 등록·수정·퇴원 RLS + attending 트리거
12) supabase/migrations/0012_patient_intake.sql  # 신규 환자 접수(환자/대기열/안전성 insert) RLS + 트리거
13) supabase/migrations/0013_realtime_expand.sql # Realtime 확장(노트/처방/입원 publication)
14) supabase/migrations/0014_appointments.sql # 예약 상태 모델링 + 쓰기 RLS + KPI 갱신
15) supabase/migrations/0015_billing.sql   # 청구·수납(billings) + RLS + 집계 뷰
16) supabase/migrations/0016_medications.sql # 약품·재고(medications) + RLS + 요약 뷰
17) supabase/migrations/0017_diagnoses.sql # 진단 마스터(DSM-5→ICD-10/KCD, 읽기전용)
18) supabase/migrations/0018_billing_dx.sql # 청구에 주상병(dx) 컬럼 추가
19) supabase/migrations/0019_billing_insert.sql # 청구 생성 정책 + attending 트리거(진료→청구)
20) supabase/migrations/0020_med_stock_log.sql # 약품 입·출고 이력(감사 로그)
21) supabase/seed.sql                      # 데모 데이터(담당의 연결 포함)
```
(또는 Supabase CLI: `supabase db push` 후 `psql ... -f supabase/seed.sql`)

### 4. 로그인 계정 만들기
앱 실행 후 로그인 화면에서 **가입하기**로 계정을 만들면 트리거가 자동으로
profile(역할 `doctor`, 담당의 = 시드 의사)을 생성합니다. → 로그인하면 그 의사의
담당 환자 7명이 보입니다.

> 빠른 테스트: Supabase **Authentication → Providers → Email** 에서
> "Confirm email"을 잠시 꺼두면 메일 인증 없이 바로 로그인됩니다.

역할 변경(예: 관리자로 승격 — 전체 환자 조회):
```sql
update profiles set role = 'admin' where id = (select id from auth.users where email = '본인이메일');
```

### 5. 실행
```bash
npm run dev
```
env가 채워져 있으면 `data/api.js` 가 자동으로 Supabase 쿼리를 사용합니다.

## 인증 · 권한 (RLS)

- **로그인 필수** — env가 설정되면 세션이 없을 때 로그인 화면만 노출, 데이터 조회 차단.
- **역할 기반 행 수준 보안**
  - `doctor` : 본인이 담당(`patients.attending_id`)인 환자 + 그 환자의 모든 임상 데이터만 조회
  - `nurse` / `admin` : 전체 조회
- 정책은 `app_role()` · `app_doctor_id()` · `owns_patient()` (security definer) 헬퍼로 평가 — `profiles` 자기참조 재귀를 회피.
- **쓰기**: 노트(`0003`)·처방(`0004`)·수정/삭제(`0005`)·척도/검사(`0006`,`0007`) 모두 `owns_patient(patient_id)` 으로 담당의 본인 환자에 한해 허용.
  - 입원(`0011`)·신규 접수(`0012`)·예약(`0014`)·청구(`0015` 수납·`0019` 생성)는 담당의(`attending_id`) 기준 RLS + 등록 시 담당의 자동 설정 트리거.
  - 약품(`0016`)·입출고 이력(`0020`)·진단 마스터(`0017`)는 병원 공용 참조/운영 데이터(담당의 격리 대상 아님).

### 권한 시연 (nurse/admin)
`supabase/demo_roles.sql` 로 doctor·2번째 doctor·nurse·admin 을 세팅해 역할 차이를 직접 확인할 수 있습니다.
앱에서 4개 계정 가입 → SQL Editor 에서 `demo_roles.sql` 실행 → 각 계정으로 로그인.

로컬 PG16 검증 결과(같은 정책):

| 역할 | 보이는 환자 | 강하늘(이준호 담당) 쓰기 |
|---|---|---|
| 의사 A (서연우) | 6명 (강하늘 제외) | 거부 |
| 의사 B (이준호) | 1명 (강하늘) | 허용 |
| 간호사 | 7명 전체 | 허용 |
| 관리자 | 7명 전체 | 허용 |
| 비로그인 | 0 (차단) | — |

## 데이터 모델

```
clinics · doctors                기관 / 의료진
patients                         환자 인구학 정보 (chart_no 고유)
  ├─ queue_entries               오늘 진료 대기열 (방문 단위)
  ├─ safety_assessments          자살위험(C-SSRS) 등 안전성 평가
  ├─ rating_scales               PHQ-9 / GAD-7 / ISI 등 평가척도
  ├─ trend_points                증상 경과 시계열
  ├─ labs                        검사·약물농도 (리튬, 프로락틴 등)
  ├─ prescriptions               처방·오더
  ├─ clinical_notes              SOAP 면담 기록 (segments jsonb)
  └─ patient_detail_meta         요약 + 처방 경고
appointments                     진료 일정 (예약→진료→청구 워크플로)
wards · admissions               병동 / 입원(입원유형·격리·acuity, attending_id 기준 RLS)
billings                         청구·수납 (주상병 dx + 보험 + 본인부담금 + 수납상태)
medications                      약품·재고 (분류·단위·재고·안전재고·유효기간·향정신성)
med_stock_logs                   약품 입·출고 이력 (입고/불출/조제, 누가·언제·왜)
diagnoses                        진단 마스터 (DSM-5명 ↔ ICD-10/KCD 코드, 읽기전용 참조)
dashboard_kpis · ward_summary
billing_summary · med_summary    집계 뷰(security_invoker → 역할별 RLS 집계)
kpis                             (레거시) 큐레이션 지표 — dashboard_kpis 뷰로 대체됨
```

> **진단 코드는 KCD-8(한국표준질병·사인분류) 기준**입니다. DSM-5와 갈리는 지점(양극성 II형
> `F31.8`·ADHD `F90.0`·불면증 `F51.0` 등)은 `data/diagnoses.js` 의 `note` 에 명시했습니다.
> 대표 코드 28종 큐레이션이므로, 실제 청구 전 공식 KCD-8 코드북으로 재확인을 권장합니다.

- 컴포넌트는 `data/api.js` 함수만 호출 → DB row를 기존과 **동일한 shape**로 매핑하므로 컴포넌트 수정 0.
- `data/mock.js` 가 seed의 single source of truth. 데이터 수정 후 `node scripts/gen-seed.mjs` 로 `seed.sql` 재생성.
- 사이드바/시스템 상태 등 순수 UI 설정은 `data/config.js` (DB 아님).

> ⚠️ **보안 메모**
> `0002_auth_rls.sql` 적용 후에는 비로그인 접근이 차단되고 역할 기반 RLS가 적용됩니다.
> 다만 실제 환자정보(PHI) 운영 시에는 추가로 **감사로그, MFA, 세션 정책, 백업·암호화,
> 개인정보보호법·의료법(전자의무기록 보존 등) 요건**을 별도 검토해야 합니다.
> 현재 데이터는 전부 가상의 학습/프로토타입용입니다.
> (0002 를 적용하지 않으면 0001 의 데모용 anon 전체 읽기 정책이 남아 있으니 주의.)
