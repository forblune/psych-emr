-- ════════════════════════════════════════════════════════════════
-- 메디코어 EMR · 정신건강의학과  ·  초기 스키마
-- 정규화된 임상 데이터 모델. mock.js 의 구조를 관계형으로 옮긴 것.
--
-- 적용:  Supabase 대시보드 > SQL Editor 에 붙여넣고 실행
--   또는  supabase db push   (Supabase CLI 사용 시)
--
-- ⚠️ 주의: 아래 RLS 정책은 데모/프로토타입용으로 anon(비로그인)에게
--    전체 읽기를 허용합니다. 실제 환자정보(PHI) 운영 시에는 반드시
--    인증 기반 정책으로 교체하고 개인정보보호법·의료법 요건을 검토하세요.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── 기관 / 의료진 ────────────────────────────────────────────────
create table if not exists clinics (
  id          uuid primary key default gen_random_uuid(),
  hospital    text not null,
  department  text not null,
  room        text not null,
  session     text not null,
  display_date text not null
);

create table if not exists doctors (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  title     text not null,
  ext_id    text not null,           -- 화면 표시용 사번
  initial   text not null            -- 아바타 글자
);

-- ── 환자 (인구학적 정보) ─────────────────────────────────────────
create table if not exists patients (
  id           uuid primary key default gen_random_uuid(),
  chart_no     text not null unique,
  name         text not null,
  sex          text not null,
  age          int  not null,
  rrn          text not null,        -- 마스킹된 주민번호
  initial      text not null,
  primary_tags text[] not null default '{}'
);

-- ── 진료 대기열 (오늘의 내원/방문 단위) ──────────────────────────
create table if not exists queue_entries (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  position    int  not null,                       -- 정렬 순서
  no          text not null,                        -- 'A-08'
  visit_type  text not null,                        -- 초진/재진/응급
  status      text not null,                        -- 상담중/대기/위기...
  status_cls  text not null,                        -- 배지 표현 클래스
  dx          text not null,                        -- 주상병 F코드
  received    text not null,                        -- 접수시각 'HH:MM'
  wait        text not null,                        -- 대기시간 표시
  risk        text not null default '',             -- '' | 'md' | 'hi'
  visit_date  date not null default current_date
);

-- ── 자살위험 등 안전성 평가 (환자당 현재 1건) ────────────────────
create table if not exists safety_assessments (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  level       text not null,         -- 'hi' | 'md'
  sev         text not null,         -- 'C-SSRS\n중등도'
  bold        text not null,         -- 강조 문구
  body        text not null,         -- 본문
  assessed_at timestamptz not null default now()
);

-- ── 평가척도 (PHQ-9, GAD-7, ISI ...) ─────────────────────────────
create table if not exists rating_scales (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients(id) on delete cascade,
  sort           int  not null default 0,
  name           text not null,      -- PHQ-9
  tag            text not null,      -- 우울
  value          int  not null,
  max            int  not null,
  pct            int  not null,
  severity       text not null,      -- min | mild | mod | sev
  severity_label text not null       -- 중등도
);

-- ── 증상 경과 추이 (시계열) ──────────────────────────────────────
create table if not exists trend_points (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  sort        int  not null default 0,
  label       text not null,         -- '3/30'
  phq         int,
  gad         int
);

-- ── 검사 결과 / 약물농도 ─────────────────────────────────────────
create table if not exists labs (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  sort        int  not null default 0,
  lab_group   text not null,         -- '약물 혈중농도 모니터링'
  name        text not null,
  value       text not null,
  ref_range   text not null,
  flag        text not null,         -- H/L/N/↑/미시행...
  flag_type   text not null,         -- f-h | f-l | f-n | ref
  collected   text not null default '06/22'
);

-- ── 처방 / 오더 ──────────────────────────────────────────────────
create table if not exists prescriptions (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  sort        int  not null default 0,
  drug_class  text not null,         -- 'SSRI · 항우울제'
  class_warn  boolean not null default false,
  name        text not null,
  brand       text not null default '',
  dose        text not null,
  sub         text not null default '',
  sub_bold    text not null default '',
  qty         text not null default '',
  price       text not null default '',
  is_new      boolean not null default false
);

-- ── 경과 / 면담 기록 (SOAP) ──────────────────────────────────────
create table if not exists clinical_notes (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  sort        int  not null default 0,
  author      text not null,
  dept        text not null,
  noted_at    text not null,         -- '2026-06-22 13:40'
  segments    jsonb not null         -- [{label, text}, ...]
);

-- ── 환자 상세 메타 (요약 + 처방 경고) ────────────────────────────
create table if not exists patient_detail_meta (
  patient_id     uuid primary key references patients(id) on delete cascade,
  summary        text not null default '',
  rx_warn_title  text not null default '',
  rx_warn_body   text not null default ''
);

-- ── 진료 일정 ────────────────────────────────────────────────────
create table if not exists appointments (
  id           uuid primary key default gen_random_uuid(),
  sort         int  not null default 0,
  start_time   text not null,        -- '13:00'
  patient_name text not null,
  description  text not null,        -- '재진 · 공황장애'
  bar          text not null,        -- sl-mut | sl-acc | sl-warn
  badge_cls    text,                 -- 'b-done' (있으면 배지로)
  badge_label  text,
  tail         text,                 -- 배지 없을 때 우측 텍스트
  is_now       boolean not null default false
);

-- ── KPI 스냅샷 (당장은 큐레이션 값. 추후 집계 뷰로 대체 가능) ─────
create table if not exists kpis (
  id     uuid primary key default gen_random_uuid(),
  sort   int  not null default 0,
  tone   text not null,        -- t-acc | t-warn | t-crit | t-ok
  label  text not null,
  value  text not null,
  sub    text not null default '',
  delta  text,
  delta_tone text                -- up | dn
);

-- 자주 쓰는 조회 인덱스
create index if not exists idx_queue_position on queue_entries(position);
create index if not exists idx_scales_patient on rating_scales(patient_id, sort);
create index if not exists idx_labs_patient   on labs(patient_id, sort);
create index if not exists idx_rx_patient     on prescriptions(patient_id, sort);
create index if not exists idx_notes_patient  on clinical_notes(patient_id, sort);
create index if not exists idx_trend_patient  on trend_points(patient_id, sort);

-- ════════════════════════════════════════════════════════════════
-- RLS — 데모용 읽기 허용 (운영 전 반드시 교체)
-- ════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'clinics','doctors','patients','queue_entries','safety_assessments',
    'rating_scales','trend_points','labs','prescriptions','clinical_notes',
    'patient_detail_meta','appointments','kpis'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists demo_read on %I;', t);
    execute format(
      'create policy demo_read on %I for select to anon, authenticated using (true);', t
    );
  end loop;
end $$;
