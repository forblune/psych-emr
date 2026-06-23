-- ════════════════════════════════════════════════════════════════
-- 메디코어 EMR · 평가척도 / 검사 수정 권한
--
-- 0006(입력·삭제)에 update 정책 추가 → 척도·검사 완전 CRUD.
-- owns_patient() 로 담당의 본인 환자에 한해 허용.
--
-- 적용 순서:  0001 → … → 0006 → 0007 → seed
-- ════════════════════════════════════════════════════════════════

drop policy if exists scales_update on rating_scales;
create policy scales_update on rating_scales
  for update to authenticated
  using (owns_patient(patient_id))
  with check (owns_patient(patient_id));

grant update on rating_scales to authenticated;

drop policy if exists labs_update on labs;
create policy labs_update on labs
  for update to authenticated
  using (owns_patient(patient_id))
  with check (owns_patient(patient_id));

grant update on labs to authenticated;
