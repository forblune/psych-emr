-- ════════════════════════════════════════════════════════════════
-- 메디코어 EMR · 약품 입·출고 이력(감사 로그)
--
-- med_stock_logs — 재고 변동의 누가·언제·왜를 기록. 변동 원인:
--   입고(수기 +), 불출(수기 −), 조제(처방 시 자동 차감).
-- med_name/code 를 함께 저장 → 약품이 삭제돼도 이력은 보존.
-- 병원 공용 약제 운영 로그 → 인증 사용자 읽기·쓰기(운영 행위).
--
-- 적용 순서:  0001 → … → 0019 → 0020 → seed
-- ════════════════════════════════════════════════════════════════

create table if not exists med_stock_logs (
  id            uuid primary key default gen_random_uuid(),
  sort          bigint not null default 0,
  medication_id uuid references medications(id) on delete set null,
  med_name      text not null,               -- 약품명(이력 보존용 스냅샷)
  code          text not null default '',    -- 보험/EDI 코드
  kind          text not null,               -- 입고 / 불출 / 조제
  qty           int  not null,               -- 변동 수량(양수)
  after_stock   int  not null,               -- 변경 후 재고
  reason        text not null default '',    -- 사유(처방 조제 · 환자명 등)
  actor         text not null default '',    -- 처리자
  created_at    timestamptz not null default now()
);

create index if not exists idx_medlog_sort on med_stock_logs(sort desc);

alter table med_stock_logs enable row level security;

drop policy if exists medlog_read on med_stock_logs;
create policy medlog_read on med_stock_logs for select to authenticated using (true);

-- 운영 로그: 재고를 바꾼 주체(의사 조제 포함)가 남기므로 인증 사용자 허용.
drop policy if exists medlog_insert on med_stock_logs;
create policy medlog_insert on med_stock_logs for insert to authenticated with check (true);

grant select, insert on med_stock_logs to anon, authenticated;
