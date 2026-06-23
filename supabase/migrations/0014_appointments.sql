-- ════════════════════════════════════════════════════════════════
-- 메디코어 EMR · 예약 관리 (상태 모델링 + CRUD)
--
-- appointments 에 status(예약/진행중/완료/취소/노쇼) 추가 → 표현은 파생.
-- 예약 쓰기 RLS(인증 사용자 — 클리닉 스케줄), dashboard_kpis 의 완료 집계를
-- status 기준으로 변경.
--
-- 적용 순서:  0001 → … → 0013 → 0014 → seed
-- ════════════════════════════════════════════════════════════════

alter table appointments
  add column if not exists status      text not null default '예약',
  add column if not exists visit_type  text,
  add column if not exists appt_date   date not null default current_date;

-- 예약 쓰기 (인증 사용자 = 진료/원무 공용 스케줄)
drop policy if exists appt_write on appointments;
create policy appt_write on appointments for insert to authenticated with check (true);
drop policy if exists appt_update on appointments;
create policy appt_update on appointments for update to authenticated using (true) with check (true);
drop policy if exists appt_delete on appointments;
create policy appt_delete on appointments for delete to authenticated using (true);

grant insert, update, delete on appointments to authenticated;

-- 금일 예약 '완료' 집계를 status 기준으로 (기존 badge_cls 대신)
create or replace view dashboard_kpis
with (security_invoker = true) as
select
  (select count(*) from appointments)                                   as appt_total,
  (select count(*) from appointments where status = '완료')             as appt_done,
  (select count(*) from queue_entries where status in ('대기','신규','위기')) as waiting,
  (select count(*) from queue_entries where status = '상담중')           as in_consult,
  (select count(*) from queue_entries)                                   as visits_today,
  (select count(*) from queue_entries where risk = 'hi')                 as high_risk,
  (select count(*) from queue_entries where risk = 'md')                 as mid_risk,
  (select count(*) from prescriptions where is_new)                      as new_rx,
  (select count(*) from admissions)                                      as admitted;
