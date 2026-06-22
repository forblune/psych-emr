-- ════════════════════════════════════════════════════════════════
-- 메디코어 EMR · Auth + 역할 기반 RLS
--
-- 0001_init.sql 의 데모용(anon 전체 읽기) 정책을 제거하고
-- 인증 기반 정책으로 교체합니다.
--
--   • profiles : auth.users 와 1:1, 역할(role) + 담당의(doctor_id) 보관
--   • 신규 가입 시 트리거가 profile 자동 생성 (기본 역할 doctor)
--   • 의사(doctor) : 본인이 담당(attending)인 환자만 조회
--   • 간호사(nurse)/관리자(admin) : 전체 조회
--
-- 적용 순서:  0001_init.sql  →  0002_auth_rls.sql  →  seed.sql
-- ════════════════════════════════════════════════════════════════

-- ── 환자에 담당의 연결 ───────────────────────────────────────────
alter table patients
  add column if not exists attending_id uuid references doctors(id);
create index if not exists idx_patients_attending on patients(attending_id);

-- ── 사용자 프로필 (auth.users ↔ 역할/담당의) ─────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'doctor' check (role in ('doctor','nurse','admin')),
  doctor_id  uuid references doctors(id),
  title      text,
  initial    text
);

-- 신규 가입 → profile 자동 생성. 데모에선 단일 의사에 연결.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare d doctors;
begin
  select * into d from doctors order by ext_id limit 1;
  insert into profiles (id, full_name, role, doctor_id, title, initial)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', d.name, split_part(new.email,'@',1)),
    'doctor',
    d.id,
    d.title,
    coalesce(d.initial, '의')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── RLS 헬퍼 (security definer → profiles 조회 시 재귀 회피) ──────
create or replace function app_role()
returns text language sql security definer stable set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function app_doctor_id()
returns uuid language sql security definer stable set search_path = public as $$
  select doctor_id from profiles where id = auth.uid()
$$;

-- 해당 환자를 볼 권한이 있는가 (관리자/간호사는 전체, 의사는 담당만)
create or replace function owns_patient(pid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select app_role() in ('admin','nurse')
      or exists (
        select 1 from patients
        where id = pid and attending_id = app_doctor_id()
      )
$$;

-- ════════════════════════════════════════════════════════════════
-- 정책 교체
-- ════════════════════════════════════════════════════════════════

-- 1) 데모 정책 제거 (0001 에서 만든 anon 전체 읽기)
do $$
declare t text;
begin
  foreach t in array array[
    'clinics','doctors','patients','queue_entries','safety_assessments',
    'rating_scales','trend_points','labs','prescriptions','clinical_notes',
    'patient_detail_meta','appointments','kpis'
  ]
  loop
    execute format('drop policy if exists demo_read on %I;', t);
  end loop;
end $$;

-- 2) profiles : 본인 또는 관리자만
alter table profiles enable row level security;
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or app_role() = 'admin');

-- 3) 공용 마스터/대시보드 데이터 : 로그인 사용자 전체 읽기
do $$
declare t text;
begin
  foreach t in array array['clinics','doctors','appointments','kpis']
  loop
    execute format('drop policy if exists read_authenticated on %I;', t);
    execute format(
      'create policy read_authenticated on %I for select to authenticated using (true);', t
    );
  end loop;
end $$;

-- 4) 환자 : 담당의 본인(또는 nurse/admin)
drop policy if exists patients_read on patients;
create policy patients_read on patients for select to authenticated
  using (app_role() in ('admin','nurse') or attending_id = app_doctor_id());

-- 5) 환자 종속 임상 데이터 : owns_patient(patient_id)
do $$
declare t text;
begin
  foreach t in array array[
    'queue_entries','safety_assessments','rating_scales','trend_points',
    'labs','prescriptions','clinical_notes','patient_detail_meta'
  ]
  loop
    execute format('drop policy if exists clinical_read on %I;', t);
    execute format(
      'create policy clinical_read on %I for select to authenticated using (owns_patient(patient_id));', t
    );
  end loop;
end $$;

-- ── (참고) 쓰기 정책 예시 — 담당의가 본인 환자 노트 작성 시 ───────
-- create policy notes_write on clinical_notes for insert to authenticated
--   with check (owns_patient(patient_id));
-- create policy rx_write on prescriptions for insert to authenticated
--   with check (owns_patient(patient_id));
