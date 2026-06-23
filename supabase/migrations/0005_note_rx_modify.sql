-- ════════════════════════════════════════════════════════════════
-- 메디코어 EMR · 노트/처방 수정·삭제 권한
--
-- 작성(0003/0004)과 동일하게 owns_patient() 로 담당의 본인 환자에 한해
-- update / delete 허용.
--
-- 적용 순서:  0001 → 0002 → 0003 → 0004 → 0005 → seed
-- ════════════════════════════════════════════════════════════════

-- 노트
drop policy if exists notes_update on clinical_notes;
create policy notes_update on clinical_notes
  for update to authenticated
  using (owns_patient(patient_id))
  with check (owns_patient(patient_id));

drop policy if exists notes_delete on clinical_notes;
create policy notes_delete on clinical_notes
  for delete to authenticated
  using (owns_patient(patient_id));

grant update, delete on clinical_notes to authenticated;

-- 처방
drop policy if exists rx_update on prescriptions;
create policy rx_update on prescriptions
  for update to authenticated
  using (owns_patient(patient_id))
  with check (owns_patient(patient_id));

drop policy if exists rx_delete on prescriptions;
create policy rx_delete on prescriptions
  for delete to authenticated
  using (owns_patient(patient_id));

grant update, delete on prescriptions to authenticated;
