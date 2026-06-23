# 개발일지 — 메디코어 EMR (정신건강의학과 진료센터)

> 나중에 이어서 작업할 때 이 문서부터 읽으면 됩니다.
> 코드 구조는 `README.md`, 작업 맥락·결정·다음 단계는 이 문서.

---

## 한 줄 요약
ERP 스타일 정신과 진료 EMR. HTML 목업 → React → Supabase → 역할 기반 Auth/RLS →
임상 데이터 CRUD(노트·처방·척도·검사) → Realtime → 입원·병동 + 입퇴원 CRUD →
KPI 집계뷰 → 예약·청구 모듈 → **화면 7종(대시보드·예약·병동·통계·검색·청구·약품)** 까지 완료.
데이터는 전부 가상. 라이브 데모: https://forblune.github.io/psych-emr/

---

## 진행 타임라인

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 단일 HTML 목업 (내과 → **정신과**로 전환, 다크모드, 이모지 제거) | ✅ |
| 2 | **React + Vite 컴포넌트화** + mock 데이터 | ✅ |
| 3 | **Supabase 연동** — 정규화 스키마 13테이블 + seed | ✅ |
| 4 | **Auth + 역할 기반 RLS** — 로그인, 담당의별 환자 격리 | ✅ |
| 5 | git/배포(GitHub Pages) + 개발일지 | ✅ |
| 6 | 실 SQL/RLS 로컬 검증(PG16 + auth shim) + E2E(Playwright) 도입 | ✅ |
| 7 | 대기열 **검색·정렬** 실동작 | ✅ |
| 8 | 노트·처방·척도·검사 **완전 CRUD** + 각 단계 RLS·E2E 검증 | ✅ |
| 9 | **Realtime 대기열 자동 갱신** (postgres_changes 구독, RLS 필터) | ✅ |
| 10 | **KPI 집계 뷰** (security_invoker → 역할별 RLS 집계) | ✅ |
| 11 | **입원·병동 모듈** (병동 보드 + 입원유형 + 집계, 사이드바 네비) | ✅ |
| 12 | **입원 CRUD** (입원 등록·수정·퇴원, attending 자동 + 쓰기 RLS) | ✅ |
| 13 | **새로고침 + 신규 진료 시작**(신규 환자 접수) | ✅ |
| 14 | **Realtime 확장** — 노트·처방·입원까지 구독 | ✅ |
| 15 | **통계 지표 화면** (클라이언트 집계 차트, RLS 데이터 기준) | ✅ |
| 16 | **환자 검색 화면** (외래·입원 통합 검색 → 화면 이동) | ✅ |
| 17 | **예약 관리 화면** (예약 상태 모델링 + 상태변경·추가·삭제) | ✅ |
| 18 | **청구·수납 모듈** (보험·본인부담금·수납 처리 + 집계) | ✅ |

## 개발 진행 요약 (커밋 이력)

| 커밋 | 내용 |
|---|---|
| `acd5918` | 정신과 EMR 대시보드 (React + Supabase + 역할기반 RLS) |
| `deae6d1` | SQL/RLS 로컬 검증 결과 기록 (PG16 + auth shim) |
| `4a3defa` | Playwright E2E 스위트 + 전체 테스트 통과 |
| `1c6f989` | 대기열 검색·정렬 실동작 |
| `aa55e07` | 경과 노트 작성(쓰기) |
| `58c4f81` | 처방 추가(쓰기) |
| `a130f53` | 노트·처방 수정·삭제 |
| `1c7b945` | 척도·검사 입력·삭제 |
| `895414c` | 척도·검사 수정 (완전 CRUD) |
| `4795034` | 개발일지 정리 |
| `729e122` | Realtime 대기열 자동 갱신 |
| `556b644` | 역할 권한 시연 (nurse/admin) + demo_roles.sql |
| `df4e4d8` | KPI 집계 뷰 (security_invoker → 역할별 RLS 집계) |
| `9d93591` | 입원·병동 모듈 |
| `651fce5` | 입원 CRUD (입원 등록·수정·퇴원) |
| `e1509ea` | 새로고침 + 신규 진료 시작(신규 환자 접수) |
| `213b612` | Realtime 확장 (노트·처방·입원) |
| `eb79d4e` | 통계 지표 화면 |
| `19f3ac6` | 환자 검색 화면 |
| `b6426d5` | 예약 관리 화면 (예약 상태 모델링) |
| `bc65427` | 청구·수납 모듈 |

> 마이그레이션 `0001~0017`, E2E **37/37**, **화면 7종**(대시보드·예약·병동·통계·검색·청구·약품), 임상 데이터 4종 + 입원 CRUD + 신규 접수 + 예약·청구 + 약품·재고(입고·불출·등록·삭제, 처방 시 재고 자동 차감) + 담당의별 RLS + Realtime(큐·노트·처방·입원).

---

## 아키텍처 (현재)

```
React(Vite)  ──>  data/api.js (seam)  ──>  Supabase  (env 있을 때)
                                      └──>  data/mock.js (env 없으면 폴백)

인증:  AuthContext ─ supabase.auth ─ 세션 없으면 Login 화면, 데이터 차단
권한:  profiles(role, doctor_id) + patients.attending_id + RLS 헬퍼
       app_role() / app_doctor_id() / owns_patient(pid)
```

- 컴포넌트는 `data/api.js` 함수만 호출 → DB row를 mock과 **동일 shape**로 매핑하므로
  백엔드 교체에도 컴포넌트 수정이 없음.
- `data/mock.js` = seed의 single source of truth. 수정 후 `node scripts/gen-seed.mjs`.

---

## 핵심 결정 & 이유

- **정규화 스키마** (JSONB 한 덩어리 대신) — 실제 EMR처럼 환자/방문/척도/검사/처방/노트
  분리. PostgREST 임베딩으로 한 번에 조회하고 api.js에서 기존 shape로 재조립.
- **api.js seam + mock 폴백** — 백엔드 없이도 항상 실행 가능. 데모/오프라인/CI에 유리.
- **RLS 헬퍼를 security definer 로** — `profiles` 자기참조 정책의 무한재귀 회피.
- **담당의 격리는 patients.attending_id 기준** — 환자를 못 보면 종속 임상 데이터도
  `owns_patient()` 로 전부 차단(검사·처방·노트까지).
- **배포는 GitHub Pages** — vercel/netlify 미설치. Actions + GITHUB_TOKEN으로 무로그인 배포.
  env 미설정이라 공개 데모는 mock 데이터로 동작(시크릿 노출 없음).

---

## 현재 동작하는 것
- 대기열 행 클릭 → 환자 패널(척도/검사/처방/노트/추이차트) 전체 갱신
- 탭 4개 전환, 다크/라이트 토글, 실시간 시계
- 증상 경과 추이 차트(canvas, 환자·테마 변경 시 재드로우)
- (env 설정 시) 로그인/가입, 세션 게이트, 담당의별 환자 격리

## SQL/RLS 검증 (2026-06-22, 로컬 PG16 + Supabase auth shim)
✅ **실행 검증 완료** — `0001 → 0002 → seed` 무에러 적용, RLS 격리 매트릭스 통과:
| 주체 | patients/queue/scales/notes |
|---|---|
| 담당의(서연우) | 7 / 7 / 28 / 9 ✅ |
| 타 의사(담당환자 0) | 0 / 0 / 0 / 0 ✅ (격리) |
| admin | 7 / 7 / 28 / 9 ✅ |
| anon(비로그인) | 0 ✅ (RLS deny) |
- 공용데이터(clinics/kpis/appointments) 로그인 사용자 전체 읽기 OK, 신규가입 트리거→profile 자동생성 OK, profiles 자기참조 재귀 없음 확인.
- 검증 스크립트: scratchpad의 `00_supabase_shim.sql` + `verify_rls.sql` (세션 일시적).
- 미검증(서비스 레이어, SQL 아님): 호스팅 GoTrue 이메일 인증 흐름, PostgREST 임베딩 응답 shape, 네트워크. → 본인 Supabase에 올린 뒤 로그인 1회로 확인 권장.

## 전체 테스트 (2026-06-22)
- **빌드**: `npm run build` 무에러 (89→ 모듈)
- **DB/RLS**: 신규 클러스터에 0001→0002→seed 재적용 무에러 + RLS 매트릭스 재통과(담당의 7 / 타의사 0 / admin 7 / anon 0)
- **E2E (Playwright/Chromium, mock 모드)**: `npm test` → **37/37 통과, 콘솔 에러 0**
  - 렌더 / KPI / 통계 / 환자 검색 / 예약 관리 / 청구·수납(수납 처리) / 새로고침 / 신규 진료 / 입원·병동·등록·퇴원 / 환자 전환 / 탭4 / 테마 / 대기열 검색·정렬 / 노트·처방·척도·검사 CRUD
  - ⚠️ viewport는 1440×900 고정(`playwright.config.js`) — 720px면 밀집 레이아웃에서 탭과 겹쳐 클릭 인터셉트됨
- **배포 사이트 렌더**: https://forblune.github.io/psych-emr/ 헤드리스 확인 — KPI6·행7·정수민·다크·에러0
- 테스트 코드: `tests/e2e.spec.js`, `playwright.config.js`

## 구현 완료 (실동작)
- **검색** — TopBar 입력으로 대기열 필터(이름·차트번호·F코드·주민번호). Ctrl+K 포커스, Esc/× 초기화, 빈 상태 표시. 상태는 App→TopBar/PatientQueue로 흐름.
- **정렬** — 대기순(대기시간 desc, 상담중 상단) / 접수순(접수시각 asc) / 위험도(고위험→중등도→일반). `PatientQueue.jsx` COMPARATORS.
- **노트 작성(쓰기)** — 경과·면담 탭의 SOAP 폼 → `api.addNote()` → DB insert(또는 mock 메모리). 작성 즉시 목록 최상단. 작성자/진료과는 로그인 의사·진료과 자동 기입.
  - RLS: `0003_note_write.sql` insert 정책 `with check (owns_patient(patient_id))` — **로컬 검증 완료**(담당의 작성 성공 / 타 의사 `RLS policy violation` 거부).
- **처방 추가(쓰기)** — 처방·오더 탭의 폼(약물명·분류·용법·수량·약가) → `api.addPrescription()` → DB insert(또는 mock). 추가분은 목록 하단에 `new`(앰버) 표시.
  - RLS: `0004_rx_write.sql` insert 정책 동일 패턴 — **로컬 검증 완료**(담당의 4→5 성공 / 타 의사 거부 / 최종 5).
- **노트/처방 수정·삭제** — 각 항목 인라인 수정 폼 + 삭제(확인 대화상자). 행 단위 작업이라 쿼리·매핑에 DB `id` 노출. `api.updateNote/deleteNote/updatePrescription/deletePrescription`.
  - RLS: `0005_note_rx_modify.sql` update/delete 정책 `using/with check (owns_patient)` — **로컬 검증 완료**(담당의 UPDATE/DELETE 1, 타 의사 0).
- **척도·검사 CRUD** — 평가척도 탭은 점수 입력 시 **중증도 자동 분류**(`src/lib/scales.js` — PHQ-9/GAD-7/ISI/AUDIT 밴드), 검사 탭은 항목·수치·판정 입력. 카드/행 단위 수정·삭제. `api.add/delete/updateScale`, `api.add/delete/updateLab`.
  - 수정 폼은 add/edit 공용(mode). 척도 수정은 SCALE_DEFS에 있는 척도만(미정의 척도는 삭제만). 검사 수정 시 분류(group)는 고정.
  - RLS: `0006`(insert/delete) + `0007`(update) — **로컬 검증 완료**(담당의 성공 / 타 의사 거부·0행). 검증 중 셸 훅의 `claude` 오류가 출력에 끼어들어 한 번 오탐이 있었으나 debug.sql + raw 재실행으로 정상 확정.

## 구현 완료 (이번)
- **Realtime 대기열 자동 갱신** — `supabase.channel().on('postgres_changes', {table:'queue_entries'})` 구독 → 변경 시 큐+KPI 재조회(300ms 디바운스). RLS(`clinical_read=owns_patient`)로 본인 환자 변경만 수신. 구독되면 대기열 헤더에 **"● 실시간"** 펄스 배지. mock 모드/비로그인은 무동작·배지 없음.
  - `0008_realtime.sql`: `queue_entries` 를 `supabase_realtime` publication 에 추가(가드로 vanilla PG no-op, 멱등). **로컬 검증 완료**.
  - ⚠️ 실제 실시간 수신은 호스팅 Supabase 필요(로컬 검증 불가). publication SQL·구독 코드·RLS 필터는 검증됨.
- **KPI 집계 뷰** — `0009_kpis_view.sql` `dashboard_kpis` 뷰(`security_invoker=true`)로 지표 라이브 집계. RLS 적용 → 의사는 본인 환자, 간호사/관리자는 전체 기준. `getKpis()`가 뷰 조회, mock은 동일 정의로 큐에서 계산(`computeKpiRaw`). 기존 `kpis` 테이블은 레거시(미사용).
  - **로컬 검증**: 담당의/간호사 = 대기6·상담중1·내원7·고위험1·신규처방2 / 담당0명 의사 = 예약9(공용)·나머지 0.
- **입원·병동 모듈** — `0010_ward.sql`: `wards`+`admissions`(정신과 입원유형 자의/보호/행정, 격리·관찰, acuity). 사이드바 "입원·폐쇄병동" → 병동 화면 전환(`App.view` 상태, `Ward.jsx`). 병동 가동률 바 + 재원 환자 보드(병동 필터) + 요약 stat. `ward_summary` 뷰 + `dashboard_kpis` 에 **담당 입원** KPI 복원(둘 다 security_invoker → RLS). mock 폴백 9명.
  - **로컬 검증**: 담당의 입원 9(격리1·관찰1·중증2·병상20) / 담당0명 의사 0 / 간호사 9. 입원 RLS는 `attending_id` 기준.
- **입원 CRUD** — `0011_admission_write.sql`: 입원 등록 시 `attending_id` 를 현재 의사로 자동 설정하는 BEFORE INSERT 트리거(`set_admission_attending`) + insert/update/delete RLS. `Ward.jsx` 입원 등록/수정 폼(병동·병실·환자·입원유형·상태·중증도·메모, 입원일→재원일수 자동) + 행별 수정·퇴원(확인). `api.add/update/deleteAdmission`, 변경 시 `summarizeWard`로 요약·담당입원 KPI 즉시 재계산.
  - **로컬 검증**: A 등록 시 attending 자동=서연우 / 타 의사 수정·퇴원 0행(격리) / 본인 1행. mock은 인메모리.
- **새로고침** — `loadAll()` 재호출로 전체 재조회(`refreshing` 스핀, 선택 환자 유지). **신규 진료 시작** — 모달(`NewVisit.jsx`)에서 신규 환자 접수 → `startVisit()`(환자+안전성+대기열 insert, attending 트리거) → mock은 인메모리 append, Supabase는 refresh 후 선택.
  - `0012_patient_intake.sql`: patients/queue_entries/safety insert RLS + 환자 attending 트리거. **로컬 검증**: A 접수 시 환자/대기열+1·attending 자동 / 타 의사 0(격리).
- **Realtime 확장** — `0013_realtime_expand.sql`로 clinical_notes·prescriptions·admissions 를 publication 에 추가. App 구독 채널이 4개 테이블 수신: 노트/처방/큐 변경 → 큐+KPI 재조회, 입원 변경 → 병동+KPI 재조회(각 300ms 디바운스). RLS로 본인 데이터만. **로컬 검증**: publication 4테이블 등록·no-op·멱등.
- **통계 지표 화면** (`Stats.jsx`) — 사이드바 "통계·지표" → 화면 전환. 이미 로드된 RLS 필터 데이터(큐·입원·병동)로 **클라이언트 집계**(새 마이그레이션 없음, Realtime 자동 반응). 상단 지표 6종(관리환자·평균 PHQ-9/GAD-7·고위험비율·병상가동률·평균재원일수) + 카드 6종(외래/입원 진단 분포 CSS바, 위험도 분포 canvas 도넛 스윕, 평가척도 평균, 입원유형 분포, 병동 가동). 도넛은 prefers-reduced-motion 존중.
- **환자 검색 화면** (`PatientSearch.jsx`) — 사이드바 "환자 검색" → 화면 전환. 외래(큐)+입원(admissions) **통합 검색**(이름·차트·F코드), 구분 필터(전체/외래/입원). 결과 "열기" → 외래는 대시보드+환자 선택, 입원은 병동으로 이동(`onOpen(view, chart)` → App `setView/setSelectedId`). TopBar 글로벌 검색어를 초기값으로 이어받음. 클라이언트 집계, 새 마이그레이션 없음.
- **예약 관리 화면** (`Appointments.jsx`) — `0014_appointments.sql`: appointments 에 status(예약/진행중/완료/취소/노쇼) + 쓰기 RLS. **상태가 단일 소스** → 표현(배지/바)은 `apptPresentation()`으로 대시보드 일정·예약관리 공용 파생. 상태 카운트 stat + 행별 상태변경(select)·삭제 + 예약 추가. `dashboard_kpis` 의 금일예약 완료 집계를 status='완료' 기준으로 변경. **로컬 검증**: 상태변경/추가/삭제 시 KPI 즉시 반영.
- **청구·수납 모듈** (`Billing.jsx`) — `0015_billing.sql`: billings(진찰료/약제비/검사료 + 보험유형 + 본인부담금 + 수납상태) + RLS(담당의) + billing_summary 뷰. 요약 stat 5종(청구건수·수납완료·미수납·금일 수납액·미수금) + 보험 배지 + 행별 **수납 처리**(update). 변경 시 요약 즉시 재계산. **로컬 검증**: 총7·완료3·미수금₩104,649 → 수납 시 미수금 감소 / 타 의사 0건·UPDATE 0(격리).
- **약품·재고 모듈** (`Medications.jsx`) — `0016_medications.sql`: medications(분류·단위·재고·안전재고·유효기간 + 향정신성 controlled) + RLS(읽기 전체, 쓰기 admin/nurse) + med_summary 뷰. 요약 stat 5종(총품목·재고부족·유효임박·향정신성·총 재고수량) + 분류 칩 + 상태 배지(재고부족/유효임박/향정/정상). 행별 **입고·불출**(수량 입력 → 절대재고 update, 음수 방지) + **약품 등록**(insert) + **삭제**. `재고부족`=stock≤안전재고, `유효임박`=expiry≤임상일+3개월(YYYY-MM 사전식 비교). 변경 시 요약 즉시 재계산. mock 11품목(재고부족 2·유효임박 2·향정 4).
- **처방 → 재고 자동 차감** (`api.js` `matchMedicationIndex`/`parseRxQty`, `App.handleAddRx`→`dispenseForRx`) — 처방 추가 시 약물명이 약품 마스터명과 **정확히 일치(용량 포함)** 하고 수량>0 이면 해당 약품 재고를 처방 수량만큼 차감(0 하한). 약물명에서 정수 추출('30T'→30), 불일치/수량0이면 무동작. 차감 후 재고 화면·요약 즉시 반영. 처방 수정·삭제는 재고 미반영(차감은 조제 1회 이벤트로 한정).
- **진단: DSM-5 선택 → ICD-10(KCD) 저장** (`0017_diagnoses.sql`, `data/diagnoses.js`, `DiagnosisPicker.jsx`) — diagnoses 마스터 28종(읽기전용 RLS). 신규 접수 시 자유 텍스트 대신 **DSM-5 진단명/한글명/코드로 검색·선택**하면 `dx` 에는 ICD-10=**KCD-8** 코드가 저장됨(스키마 변경 없음·하위호환). 코드는 koicd.kr/kcdcode.kr로 확인. **DSM↔KCD 분기 명시**: 양극성 II형 `F31.8`(CM의 F31.81 아님)·ADHD `F90.0`(CM F90.2 아님)·불면증 `F51.0`(DSM-5-TR F51.01 아님)·조현병 아형 유지(DSM-5는 폐지). ⚠ 특정자에 따라 다코드로 갈리는 대표 코드 큐레이션 — 청구 전 공식 KCD-8 코드북 재확인 권장.
- **진단 한글명 동반 표시** (`PatientDetail.jsx`, `PatientQueue.jsx`) — diagnoses 마스터를 코드→엔트리 매핑으로 받아, 환자 패널 헤더에 진단(코드 칩 + KCD 한글명 + DSM-5명)을 노출하고 대기열 dx 셀에도 코드 아래 한글명을 함께 표시(미매칭 코드는 코드만, title 툴팁 보강). App 이 `data.diagnoses` 를 두 컴포넌트에 전달.

## 아직 안 된 것
- 미검증(서비스 레이어, SQL 아님): 호스팅 GoTrue 이메일 인증, PostgREST 임베딩 응답 shape, 실시간 수신 → 본인 Supabase에 올린 뒤 로그인 1회로 확인 권장

---

## 권한 시연 (2026-06-23, 로컬 PG16)
2번째 의사(이준호) 추가 + 강하늘 재배정 후 5개 주체로 RLS 실행:
| 역할 | 보이는 환자 | 강하늘 노트 쓰기 |
|---|---|---|
| 의사 A(서연우) | 6명(강하늘 제외) | 거부 |
| 의사 B(이준호) | 1명(강하늘) | 허용 |
| 간호사 | 7명 | 허용 |
| 관리자 | 7명 | 허용 |
| 비로그인 | 0 | — |
- 호스팅 Supabase 재현용: `supabase/demo_roles.sql` (앱에서 4계정 가입 후 실행).
- 시연 스크립트(로컬): scratchpad `roles_demo.sql`.

## 다음 단계 (우선순위)

1. 환자 검색을 patients 테이블 직접 조회로(현재 오늘 큐+입원 범위).
2. 예약 날짜 선택(현재 당일), 예약↔진료 연동, 청구 자동 생성(진료 시).
3. 입·출고 이력 로그(현재는 재고 수량만 갱신, 누가·언제·왜는 미기록).

---

## 이어서 하는 법 (resume)

```bash
cd /Users/gh/psych-emr
npm install            # 의존성
npm run dev            # http://localhost:5173  (env 없으면 mock)

# Supabase 붙이려면 (README 참고):
cp .env.example .env   # URL/anon key 채우기
# SQL Editor: 0001 → … → 0017 → seed 순서로 실행
# 앱에서 가입 → 로그인

# 데이터 수정 후 seed 재생성:
node scripts/gen-seed.mjs
```

배포(재배포): `npm run deploy` — 빌드 후 `dist/` 를 `gh-pages` 브랜치로 푸시(GitHub Pages).
> 참고: 현재 `gh` 토큰에 `workflow` 스코프가 없어 Actions 워크플로 파일은 푸시 불가.
> CI 자동배포로 바꾸려면 `gh auth refresh -s workflow` 후 워크플로를 추가하면 됨.

---

## 파일 지도 (어디를 고치나)
- 디자인 토큰/테마 → `src/theme.css`
- 데이터 모양 바꾸기 → `src/data/mock.js` (+ `gen-seed.mjs` 재실행)
- 백엔드 쿼리/매핑/쓰기(CRUD) → `src/data/api.js`
- DB 스키마/정책 → `supabase/migrations/*.sql` (0001~0017)
- 인증 흐름 → `src/context/AuthContext.jsx`, `src/components/Login.jsx`
- 화면 전환 → `App.jsx` `view` (dashboard/appts/ward/stats/search/billing/meds), 사이드바 `data/config.js`
- 화면 컴포넌트 → `src/components/**` (탭: `tabs/**`; 화면: `Ward`/`Stats`/`PatientSearch`/`Appointments`/`Billing`/`Medications`/`NewVisit`)
- 척도 중증도 분류 로직 → `src/lib/scales.js`
- 진단 코드(DSM-5↔ICD-10/KCD) 추가·수정 → `src/data/diagnoses.js` (+ `gen-seed.mjs` 재실행), 선택 UI → `src/components/DiagnosisPicker.jsx`(신규접수 `NewVisit.jsx`에서 사용)
- E2E 테스트 → `tests/e2e.spec.js` (`npm test`, viewport 1440×900 고정)
