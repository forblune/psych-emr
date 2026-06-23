# 개발일지 — 메디코어 EMR (정신건강의학과 진료센터)

> 나중에 이어서 작업할 때 이 문서부터 읽으면 됩니다.
> 코드 구조는 `README.md`, 작업 맥락·결정·다음 단계는 이 문서.

---

## 한 줄 요약
ERP 스타일 정신과 진료 대시보드. HTML 목업 → React 컴포넌트화 → Supabase 연동 →
역할 기반 Auth/RLS 까지 완료. 현재 **읽기 전용**, 데이터는 가상.

---

## 진행 타임라인

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 단일 HTML 목업 (내과 → **정신과**로 전환, 다크모드, 이모지 제거) | ✅ |
| 2 | **React + Vite 컴포넌트화** + mock 데이터 | ✅ |
| 3 | **Supabase 연동** — 정규화 스키마 13테이블 + seed | ✅ |
| 4 | **Auth + 역할 기반 RLS** — 로그인, 담당의별 환자 격리 | ✅ |
| 5 | git/배포(GitHub Pages) + 개발일지 | ✅ |

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
- **E2E (Playwright/Chromium, mock 모드)**: `npm test` → **8/8 통과, 콘솔 에러 0**
  - 렌더 / 환자 클릭 전환 / 탭4 / 테마 토글 / 검색(이름·F코드·빈상태) / 정렬 / **노트 작성**
  - ⚠️ viewport는 1440×900 고정(`playwright.config.js`) — 720px면 밀집 레이아웃에서 탭과 겹쳐 클릭 인터셉트됨
- **배포 사이트 렌더**: https://forblune.github.io/psych-emr/ 헤드리스 확인 — KPI6·행7·정수민·다크·에러0
- 테스트 코드: `tests/e2e.spec.js`, `playwright.config.js`

## 구현 완료 (실동작)
- **검색** — TopBar 입력으로 대기열 필터(이름·차트번호·F코드·주민번호). Ctrl+K 포커스, Esc/× 초기화, 빈 상태 표시. 상태는 App→TopBar/PatientQueue로 흐름.
- **정렬** — 대기순(대기시간 desc, 상담중 상단) / 접수순(접수시각 asc) / 위험도(고위험→중등도→일반). `PatientQueue.jsx` COMPARATORS.
- **노트 작성(쓰기)** — 경과·면담 탭의 SOAP 폼 → `api.addNote()` → DB insert(또는 mock 메모리). 작성 즉시 목록 최상단. 작성자/진료과는 로그인 의사·진료과 자동 기입.
  - RLS: `0003_note_write.sql` insert 정책 `with check (owns_patient(patient_id))` — **로컬 검증 완료**(담당의 작성 성공 / 타 의사 `RLS policy violation` 거부).

## 아직 안 된 것
- 새로고침·"신규 진료 시작" 버튼 = **UI만, 동작 미구현**
- 처방 쓰기(노트와 동일 패턴으로 확장 가능 — 0003 참고)
- 쓰기 기능 없음(노트/처방 작성). 0002 하단에 RLS 쓰기 정책 *예시*만 주석.
- Realtime 구독 없음(대기열 수동).
- KPI는 큐레이션 값(집계 뷰 아님).
- 테스트 코드 없음.

---

## 다음 단계 (우선순위)

1. **실 Supabase 적용 검증** — 0001 → 0002 → seed 순서로 실행, 로그인 후 환자 7명 확인.
2. **쓰기 기능** — 면담 노트 작성(insert). `0002_auth_rls.sql` 하단 `notes_write` 정책 주석 해제부터.
3. **검색/정렬 실제 동작** — 대기열 필터링, 위험도순 정렬(`PatientQueue.jsx` 세그먼트).
4. **Realtime** — `supabase.channel().on('postgres_changes', ...)` 로 대기열 자동 갱신.
5. **권한 시연** — nurse/admin 계정 만들어 전체 조회 vs 담당의 격리 비교.
6. **KPI 집계 뷰** — `kpis` 테이블 → SQL view 로 대체(대기열에서 실시간 계산).
7. 화면 추가: 입원 병동, 통계 지표, 청구·수납.

---

## 이어서 하는 법 (resume)

```bash
cd /Users/gh/psych-emr
npm install            # 의존성
npm run dev            # http://localhost:5173  (env 없으면 mock)

# Supabase 붙이려면 (README 3~5단계):
cp .env.example .env   # URL/anon key 채우기
# SQL Editor: 0001_init.sql → 0002_auth_rls.sql → seed.sql 실행
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
- 백엔드 쿼리/매핑 → `src/data/api.js`
- DB 스키마/정책 → `supabase/migrations/*.sql`
- 인증 흐름 → `src/context/AuthContext.jsx`, `src/components/Login.jsx`
- 화면 컴포넌트 → `src/components/**`
