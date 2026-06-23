-- ════════════════════════════════════════════════════════════════
-- 메디코어 EMR · 신규 환자 접수 (신규 진료 시작)
--
-- 환자 등록 시 attending_id 자동 설정 트리거 + patients/queue_entries/
-- safety_assessments insert RLS. 등록한 의사가 본인 환자로 소유 → 즉시 조회 가능.
--
-- 적용 순서:  0001 → … → 0011 → 0012 → seed
-- ════════════════════════════════════════════════════════════════

-- 환자 등록 시 담당의 자동 설정
create or replace function set_patient_attending()
returns trigger language plpgsql as $$
begin
  if new.attending_id is null then
    new.attending_id := app_doctor_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_patient_attending on patients;
create trigger trg_patient_attending
  before insert on patients
  for each row execute function set_patient_attending();

-- 환자 insert (담당의 본인 또는 nurse/admin)
drop policy if exists patients_write on patients;
create policy patients_write on patients
  for insert to authenticated
  with check (app_role() in ('admin','nurse') or attending_id = app_doctor_id());

-- 대기열 등록 (해당 환자를 볼 수 있는 사람만)
drop policy if exists queue_write on queue_entries;
create policy queue_write on queue_entries
  for insert to authenticated
  with check (owns_patient(patient_id));

-- 안전성 평가 초기 레코드
drop policy if exists safety_write on safety_assessments;
create policy safety_write on safety_assessments
  for insert to authenticated
  with check (owns_patient(patient_id));

grant insert on patients, queue_entries, safety_assessments to authenticated;
