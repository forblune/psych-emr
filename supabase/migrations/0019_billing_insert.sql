-- ════════════════════════════════════════════════════════════════
-- 메디코어 EMR · 청구 생성(진료→청구 자동 연동)
--
-- 0015 는 청구의 읽기·수납(update)만 허용했음 → 진료 시작 시 청구를
-- 자동 생성하려면 insert 가 필요. 입원(0011)과 동일 패턴:
--  • set_billing_attending: 담당의(attending_id) 자동 설정(트리거)
--  • billing_insert 정책 + insert grant
--
-- 적용 순서:  0001 → … → 0018 → 0019 → seed
-- ════════════════════════════════════════════════════════════════

-- 청구 생성 시 담당의를 현재 사용자로 자동 설정(미지정일 때).
create or replace function set_billing_attending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.attending_id is null then
    new.attending_id := app_doctor_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_billing_attending on billings;
create trigger trg_set_billing_attending
  before insert on billings
  for each row execute function set_billing_attending();

-- insert 정책: 담당의 본인 청구 또는 admin/nurse. (WITH CHECK 는 트리거 적용 후 평가)
drop policy if exists billing_insert on billings;
create policy billing_insert on billings for insert to authenticated
  with check (app_role() in ('admin','nurse') or attending_id = app_doctor_id());

grant insert on billings to anon, authenticated;
