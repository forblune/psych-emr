-- ════════════════════════════════════════════════════════════════
-- 메디코어 EMR · 약품 · 재고 모듈
--
-- medications(약품 마스터/재고) — 분류·단위·재고·안전재고·유효기간 +
-- 향정신성(controlled) 플래그. 병원 공용 참조 데이터이므로
-- 읽기는 모든 인증 사용자, 쓰기(입고·불출·등록·삭제)는 admin/nurse(약제).
-- med_summary 집계 뷰(security_invoker). 유효임박 = 임상일 + 3개월 이내.
--
-- 적용 순서:  0001 → … → 0015 → 0016 → seed
-- ════════════════════════════════════════════════════════════════

create table if not exists medications (
  id          uuid primary key default gen_random_uuid(),
  sort        int  not null default 0,
  code        text not null,               -- 보험/EDI 코드
  name        text not null,               -- 약품명(성분 + 용량)
  drug_class  text not null,               -- SSRI / 항정신병 / 기분조절제 / 벤조디아제핀 …
  unit        text not null default '정',  -- 정 / 캡슐 / 시럽 / 주사 / 패치
  stock       int  not null default 0,     -- 현재 재고 수량
  min_stock   int  not null default 0,     -- 안전(최소) 재고
  expiry      text,                        -- 유효기간 'YYYY-MM'
  controlled  boolean not null default false, -- 향정신성의약품 여부
  updated_at  timestamptz not null default now()
);

create index if not exists idx_med_sort on medications(sort);

-- ── RLS ──────────────────────────────────────────────────────────
alter table medications enable row level security;

drop policy if exists med_read on medications;
create policy med_read on medications for select to authenticated using (true);

drop policy if exists med_write on medications;
create policy med_write on medications for insert to authenticated
  with check (app_role() in ('admin','nurse'));

drop policy if exists med_update on medications;
create policy med_update on medications for update to authenticated
  using (app_role() in ('admin','nurse'))
  with check (app_role() in ('admin','nurse'));

drop policy if exists med_delete on medications;
create policy med_delete on medications for delete to authenticated
  using (app_role() in ('admin','nurse'));

grant select, insert, update, delete on medications to anon, authenticated;

-- ── 약품·재고 요약 뷰 (security_invoker) ─────────────────────────
-- 유효임박: expiry(YYYY-MM) <= 임상일 + 3개월. 텍스트 사전식 비교가 곧 시간순.
create or replace view med_summary
with (security_invoker = true) as
select
  (select count(*) from medications)                                            as total,
  (select count(*) from medications where stock <= min_stock)                   as low,
  (select count(*) from medications
     where expiry is not null
       and expiry <= to_char(current_date + interval '3 months', 'YYYY-MM'))    as expiring,
  (select count(*) from medications where controlled)                           as controlled,
  (select coalesce(sum(stock),0) from medications)                              as total_units;

grant select on med_summary to anon, authenticated;
