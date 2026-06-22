# 메디코어 EMR · 정신건강의학과 진료센터 (React)

ERP 스타일 정신과 진료 대시보드. 단일 HTML 목업을 React 컴포넌트 + mock 데이터 구조로 변환한 버전.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 프로덕션 빌드 → dist/
```

## 구조

```
src/
  main.jsx              앱 진입점 (ThemeProvider 주입)
  App.jsx               레이아웃 조립 + 선택 환자 상태
  theme.css             다크/라이트 테마 (CSS 변수)
  context/
    ThemeContext.jsx    다크모드 토글 (data-theme 속성 제어)
  data/
    mock.js             API 응답 형태의 목 데이터 (환자/척도/검사/처방/일정)
    api.js              데이터 접근 seam — 여기만 Supabase로 교체하면 됨
  components/
    Icon.jsx            라인 아이콘 세트 (이모지 없음)
    TopBar.jsx          상단바 + 실시간 시계 + 테마 토글
    Sidebar.jsx         좌측 내비게이션 + 시스템 상태
    KpiStrip.jsx        상단 KPI 6종
    PatientQueue.jsx    진료 대기열 (행 클릭 → 환자 선택)
    PatientDetail.jsx   선택 환자 패널 + 탭 컨테이너
    TrendChart.jsx      증상 경과 추이 차트 (canvas, draw-in 애니메이션)
    Schedule.jsx        오늘 진료 일정
    tabs/
      ScalesTab.jsx     평가척도 (PHQ-9/GAD-7/ISI 등) + 자살위험 안전배너
      LabsTab.jsx       검사·약물농도 (리튬 농도, 대사 모니터링 등)
      RxTab.jsx         처방·오더 + 상호작용 경고
      NotesTab.jsx      경과·면담 기록 (MSE 포함 SOAP)
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
1) supabase/migrations/0001_init.sql   # 테이블 + 인덱스
2) supabase/migrations/0002_auth_rls.sql  # 프로필 + 역할 기반 RLS + 트리거
3) supabase/seed.sql                    # 데모 데이터(담당의 연결 포함)
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
- 쓰기(노트·처방 작성) 정책 예시는 `0002_auth_rls.sql` 하단 주석 참고.

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
appointments                     진료 일정
kpis                             대시보드 지표 (추후 집계 뷰로 대체 가능)
```

- 컴포넌트는 `data/api.js` 함수만 호출 → DB row를 기존과 **동일한 shape**로 매핑하므로 컴포넌트 수정 0.
- `data/mock.js` 가 seed의 single source of truth. 데이터 수정 후 `node scripts/gen-seed.mjs` 로 `seed.sql` 재생성.
- 사이드바/시스템 상태 등 순수 UI 설정은 `data/config.js` (DB 아님).

> ⚠️ **보안 메모**
> `0002_auth_rls.sql` 적용 후에는 비로그인 접근이 차단되고 역할 기반 RLS가 적용됩니다.
> 다만 실제 환자정보(PHI) 운영 시에는 추가로 **감사로그, MFA, 세션 정책, 백업·암호화,
> 개인정보보호법·의료법(전자의무기록 보존 등) 요건**을 별도 검토해야 합니다.
> 현재 데이터는 전부 가상의 학습/프로토타입용입니다.
> (0002 를 적용하지 않으면 0001 의 데모용 anon 전체 읽기 정책이 남아 있으니 주의.)
