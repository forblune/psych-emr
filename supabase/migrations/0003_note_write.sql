-- ════════════════════════════════════════════════════════════════
-- 메디코어 EMR · 경과 노트 쓰기 권한
--
-- 담당의(또는 nurse/admin)가 본인이 볼 수 있는 환자에 한해 노트 작성 가능.
-- owns_patient() 헬퍼(0002)를 with check 에 그대로 재사용.
--
-- 적용 순서:  0001 → 0002 → 0003 → seed
-- ════════════════════════════════════════════════════════════════

drop policy if exists notes_write on clinical_notes;
create policy notes_write on clinical_notes
  for insert to authenticated
  with check (owns_patient(patient_id));

-- INSERT 시 RETURNING/후속 select 가 가능하도록 (clinical_read SELECT 정책은 0002 에 이미 존재)
grant insert on clinical_notes to authenticated;
