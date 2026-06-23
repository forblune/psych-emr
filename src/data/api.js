// ─────────────────────────────────────────────────────────────
// Data-access seam. Components call THESE functions only.
//
//  • If VITE_SUPABASE_URL/ANON_KEY are set → live Supabase queries.
//  • Otherwise → local mock data, so the app still runs unconfigured.
//
// The Supabase rows are mapped back to the SAME shapes the
// components already consume, so no component code changes.
// ─────────────────────────────────────────────────────────────
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import * as mock from './mock'
import { navGroups, systemStatus } from './config'
import { diagnoses as dxMaster } from './diagnoses'

const ok = (v) => Promise.resolve(v)
const bySort = (a, b) => a.sort - b.sort

// UI chrome — always local config, never the DB.
export const getNavGroups = () => ok(navGroups)
export const getSystemStatus = () => ok(systemStatus)

// ── clinic / doctor / kpis / schedule ───────────────────────────
export async function getClinic() {
  if (!isSupabaseConfigured) return mock.clinic
  const { data, error } = await supabase
    .from('clinics')
    .select('hospital, department, room, session, display_date')
    .limit(1)
    .single()
  if (error) throw error
  return { ...data, date: data.display_date }
}

export async function getDoctor() {
  if (!isSupabaseConfigured) return mock.doctor

  // Prefer the logged-in user's profile (joined to their doctor record).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, title, initial, doctor:doctors(name, title, ext_id, initial)')
      .eq('id', user.id)
      .maybeSingle()
    if (prof) {
      const d = prof.doctor ?? {}
      return {
        name: prof.full_name ?? d.name ?? '의료진',
        title: prof.title ?? d.title ?? '',
        id: d.ext_id ?? '',
        initial: prof.initial ?? d.initial ?? '의',
      }
    }
  }

  // Fallback: first doctor record.
  const { data, error } = await supabase
    .from('doctors')
    .select('name, title, ext_id, initial')
    .limit(1)
    .single()
  if (error) throw error
  return { name: data.name, title: data.title, id: data.ext_id, initial: data.initial }
}

// Shape the raw aggregate counts into the 6 KPI cards.
function kpiCards(r) {
  return [
    { tone: 't-acc', label: '금일 예약', value: String(r.apptTotal), sub: `완료 ${r.apptDone} · 잔여 ${r.apptTotal - r.apptDone}` },
    { tone: 't-warn', label: '대기 환자', value: String(r.waiting), sub: `금일 내원 ${r.visitsToday}` },
    { tone: 't-acc', label: '상담 중', value: String(r.inConsult), sub: '진행 중' },
    { tone: 't-crit', label: '고위험 환자', value: String(r.highRisk), sub: '중등도', delta: String(r.midRisk), deltaTone: 'dn' },
    { tone: 't-ok', label: '금일 내원', value: String(r.visitsToday), sub: `대기 ${r.waiting}` },
    { tone: 't-warn', label: '신규 처방', value: String(r.newRx), sub: '검토 대기' },
    { tone: 't-ok', label: '담당 입원', value: String(r.admitted ?? 0), sub: '폐쇄·개방병동' },
  ]
}

// Mock-mode: compute the same aggregates the SQL view computes.
function computeKpiRaw(queue, schedule, admissions) {
  const slots = schedule.slots || []
  const inSet = (s) => ['대기', '신규', '위기'].includes(s)
  return {
    apptTotal: slots.length,
    apptDone: slots.filter((s) => s.status === '완료').length,
    waiting: queue.filter((p) => inSet(p.status)).length,
    inConsult: queue.filter((p) => p.status === '상담중').length,
    visitsToday: queue.length,
    highRisk: queue.filter((p) => p.risk === 'hi').length,
    midRisk: queue.filter((p) => p.risk === 'md').length,
    newRx: queue.reduce((n, p) => n + (p.detail?.rx?.items || []).filter((r) => r.isNew).length, 0),
    admitted: (admissions || []).length,
  }
}

export async function getKpis() {
  if (!isSupabaseConfigured) return kpiCards(computeKpiRaw(mock.queue, mock.schedule, mock.admissions))
  const { data, error } = await supabase.from('dashboard_kpis').select('*').single()
  if (error) throw error
  return kpiCards({
    apptTotal: data.appt_total,
    apptDone: data.appt_done,
    waiting: data.waiting,
    inConsult: data.in_consult,
    visitsToday: data.visits_today,
    highRisk: data.high_risk,
    midRisk: data.mid_risk,
    newRx: data.new_rx,
    admitted: data.admitted,
  })
}

// ── 청구 · 수납 ─────────────────────────────────────────────────
function billingSummary(rows) {
  const sum = (f) => rows.filter(f).reduce((n, b) => n + b.copay, 0)
  return {
    total: rows.length,
    paid: rows.filter((b) => b.status === '수납완료').length,
    unpaid: rows.filter((b) => b.status === '미수납').length,
    paidAmount: sum((b) => b.status === '수납완료'),
    outstanding: sum((b) => b.status === '미수납'),
  }
}

export async function getBillings() {
  if (!isSupabaseConfigured) return mock.billings.map((b) => ({ ...b }))
  const { data, error } = await supabase
    .from('billings')
    .select('id, sort, dx, insurance, consult_fee, drug_fee, test_fee, copay, status, patient:patients(name, chart_no)')
    .order('sort')
  if (error) throw error
  return data.map((b) => ({
    id: b.id, name: b.patient?.name, chart: b.patient?.chart_no, dx: b.dx, insurance: b.insurance,
    consult: b.consult_fee, drug: b.drug_fee, test: b.test_fee, copay: b.copay, status: b.status,
  }))
}

export async function getBillingSummary() {
  if (!isSupabaseConfigured) return billingSummary(mock.billings)
  const { data, error } = await supabase.from('billing_summary').select('*').single()
  if (error) throw error
  return {
    total: data.total, paid: data.paid, unpaid: data.unpaid,
    paidAmount: data.paid_amount, outstanding: data.outstanding,
  }
}

export function summarizeBilling(rows) {
  return billingSummary(rows)
}

// 진료 시작 시 청구 자동 생성. billing 은 UI 청구 shape(chart·name·dx·수가…).
export async function addBilling({ billing, sort = 0 }) {
  if (!isSupabaseConfigured) return { ...billing }
  let pid = null
  if (billing.chart) {
    const { data: p } = await supabase.from('patients').select('id').eq('chart_no', billing.chart).maybeSingle()
    pid = p?.id ?? null
  }
  const { data, error } = await supabase
    .from('billings')
    .insert({
      sort, patient_id: pid, dx: billing.dx, insurance: billing.insurance,
      consult_fee: billing.consult, drug_fee: billing.drug, test_fee: billing.test,
      copay: billing.copay, status: billing.status,
      // attending_id 는 트리거가 현재 의사로 설정
    })
    .select('id, dx, insurance, consult_fee, drug_fee, test_fee, copay, status, patient:patients(name, chart_no)')
    .single()
  if (error) throw error
  return {
    id: data.id, name: data.patient?.name ?? billing.name, chart: data.patient?.chart_no ?? billing.chart,
    dx: data.dx, insurance: data.insurance, consult: data.consult_fee, drug: data.drug_fee,
    test: data.test_fee, copay: data.copay, status: data.status,
  }
}

export async function markBillingPaid({ id }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase
    .from('billings')
    .update({ status: '수납완료', paid_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ── 약품 · 재고 ─────────────────────────────────────────────────
// 유효임박 기준 = 임상일 + 3개월. expiry 는 'YYYY-MM' 텍스트(사전식 = 시간순).
export function expiryThreshold(clinicDate) {
  const [y, m] = String(clinicDate || '2026-06').split('-').map(Number)
  const t = m + 3
  return `${y + Math.floor((t - 1) / 12)}-${String(((t - 1) % 12) + 1).padStart(2, '0')}`
}

// 단일 약품의 파생 상태(목록 칩·필터에서 사용).
export function medFlags(m, threshold) {
  return {
    low: m.stock <= m.min,
    expiring: Boolean(m.expiry) && m.expiry <= threshold,
    controlled: Boolean(m.controlled),
  }
}

function medSummaryRows(rows, threshold) {
  return {
    total: rows.length,
    low: rows.filter((m) => m.stock <= m.min).length,
    expiring: rows.filter((m) => m.expiry && m.expiry <= threshold).length,
    controlled: rows.filter((m) => m.controlled).length,
    totalUnits: rows.reduce((n, m) => n + (m.stock || 0), 0),
  }
}

// mock 합계는 임상일(mock.clinic.date) 기준 임박을 계산.
export function summarizeMeds(rows, threshold = expiryThreshold(mock.clinic.date)) {
  return medSummaryRows(rows, threshold)
}

export async function getMedications() {
  if (!isSupabaseConfigured) return mock.medications.map((m) => ({ ...m }))
  const { data, error } = await supabase
    .from('medications')
    .select('id, code, name, drug_class, unit, stock, min_stock, expiry, controlled')
    .order('sort')
  if (error) throw error
  return data.map((m) => ({
    id: m.id, code: m.code, name: m.name, drugClass: m.drug_class, unit: m.unit,
    stock: m.stock, min: m.min_stock, expiry: m.expiry, controlled: m.controlled,
  }))
}

export async function getMedSummary() {
  if (!isSupabaseConfigured) return summarizeMeds(mock.medications)
  const { data, error } = await supabase.from('med_summary').select('*').single()
  if (error) throw error
  return {
    total: data.total, low: data.low, expiring: data.expiring,
    controlled: data.controlled, totalUnits: data.total_units,
  }
}

export async function addMedication({ med, sort = 0 }) {
  if (!isSupabaseConfigured) return { ...med }
  const { data, error } = await supabase
    .from('medications')
    .insert({
      sort, code: med.code, name: med.name, drug_class: med.drugClass, unit: med.unit,
      stock: med.stock, min_stock: med.min, expiry: med.expiry || null, controlled: med.controlled,
    })
    .select('id, code, name, drug_class, unit, stock, min_stock, expiry, controlled')
    .single()
  if (error) throw error
  return {
    id: data.id, code: data.code, name: data.name, drugClass: data.drug_class, unit: data.unit,
    stock: data.stock, min: data.min_stock, expiry: data.expiry, controlled: data.controlled,
  }
}

// 입고(+)·불출(−) 후의 절대 재고를 저장. 음수 방지는 호출부에서.
export async function updateMedStock({ id, stock }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase
    .from('medications')
    .update({ stock, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteMedication({ id }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase.from('medications').delete().eq('id', id)
  if (error) throw error
}

// ── 처방 → 재고 연동 ────────────────────────────────────────────
// 처방 수량 문자열에서 정수 추출. '30T' → 30, '180T' → 180, '—'/'' → 0.
export function parseRxQty(qty) {
  const m = String(qty ?? '').match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

// 처방 약물명이 약품 마스터명과 정확히 일치하는 항목의 인덱스(없으면 -1).
// 용량까지 같아야 동일 품목 — '쿠에티아핀 25mg' ≠ '쿠에티아핀 100mg'.
export function matchMedicationIndex(medications, rxName) {
  const name = String(rxName ?? '').trim()
  if (!name) return -1
  return medications.findIndex((m) => m.name.trim() === name)
}

// ── 진단 마스터 (DSM-5 → ICD-10/KCD) ────────────────────────────
export async function getDiagnoses() {
  if (!isSupabaseConfigured) return dxMaster.map((d) => ({ ...d }))
  const { data, error } = await supabase
    .from('diagnoses')
    .select('code, dsm_name, ko_name, dx_group, note')
    .order('sort')
  if (error) throw error
  return data.map((d) => ({ code: d.code, dsm: d.dsm_name, ko: d.ko_name, group: d.dx_group, note: d.note }))
}

// ── 신규 환자 접수 (신규 진료 시작) ─────────────────────────────
function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function blankDetail(type) {
  return {
    safety: { level: 'md', sev: 'C-SSRS\n미평가', text: '미평가 — 초기 자살위험 스크리닝 필요.', bold: '미평가' },
    scales: [],
    trend: { labels: [], phq: [], gad: [] },
    summary: '신규 접수 — 평가 입력 전.',
    labs: [],
    rx: { items: [], warn: { title: '', text: '' } },
    notes: [],
  }
}

export async function startVisit({ name, sex, age, type, dx, queueLen = 0 }) {
  const received = nowHHMM()
  if (!isSupabaseConfigured) {
    const chart = String(700001 + queueLen).padStart(8, '0')
    const item = {
      no: `A-${20 + queueLen}`, patientId: chart, name, sex, age, chart, rrn: '———',
      type, statusCls: 'b-new', status: '신규', dx, received, wait: '0분', risk: '',
      initial: name.charAt(0) || '환', tags: [type], detail: blankDetail(type),
    }
    return { chart, item }
  }

  // 1) 환자 (attending 은 트리거가 설정)
  const chart = String(700001 + queueLen).padStart(8, '0')
  const { data: p, error: pe } = await supabase
    .from('patients')
    .insert({ chart_no: chart, name, sex, age, rrn: '———', initial: name.charAt(0) || '환', primary_tags: [type] })
    .select('id, chart_no')
    .single()
  if (pe) throw pe

  // 2) 초기 안전성 평가
  await supabase.from('safety_assessments').insert({
    patient_id: p.id, level: 'md', sev: 'C-SSRS\n미평가', bold: '미평가',
    body: '미평가 — 초기 자살위험 스크리닝 필요.',
  })

  // 3) 대기열 등록
  const { error: qe } = await supabase.from('queue_entries').insert({
    patient_id: p.id, position: 1000 + queueLen, no: `A-${20 + queueLen}`,
    visit_type: type, status: '신규', status_cls: 'b-new', dx, received, wait: '0분', risk: '',
  })
  if (qe) throw qe
  return { chart: p.chart_no }
}

// ── ward / admissions ───────────────────────────────────────────
export async function getWards() {
  if (!isSupabaseConfigured) return mock.wards.map((w) => ({ ...w }))
  const { data, error } = await supabase.from('wards').select('code, name, total_beds').order('sort')
  if (error) throw error
  return data
}

export async function getAdmissions() {
  if (!isSupabaseConfigured) {
    return mock.admissions.map((a) => ({
      ward: a.ward, room: a.room, bed: a.bed, name: a.name, sex: a.sex, age: a.age,
      chart: a.chart, legal: a.legal, status: a.status, dx: a.dx,
      admittedOn: a.admittedOn, dayNo: a.dayNo, acuity: a.acuity, memo: a.memo,
    }))
  }
  const { data, error } = await supabase
    .from('admissions')
    .select('id, sort, patient_name, sex, age, chart_no, room, bed, legal_status, status, dx, admitted_on, day_no, acuity, memo, ward:wards(code, name)')
    .order('sort')
  if (error) throw error
  return data.map(mapAdmission)
}

function mapAdmission(a) {
  return {
    id: a.id, ward: a.ward?.code, wardName: a.ward?.name, room: a.room, bed: a.bed,
    name: a.patient_name, sex: a.sex, age: a.age, chart: a.chart_no,
    legal: a.legal_status, status: a.status, dx: a.dx,
    admittedOn: a.admitted_on, dayNo: a.day_no, acuity: a.acuity, memo: a.memo,
  }
}

// Inpatient admit / edit / discharge. `a` uses the UI admission shape.
export async function addAdmission({ a }) {
  if (!isSupabaseConfigured) return { ...a }
  const { data: w, error: we } = await supabase.from('wards').select('id').eq('code', a.ward).single()
  if (we) throw we
  const { data, error } = await supabase
    .from('admissions')
    .insert({
      ward_id: w.id, patient_name: a.name, sex: a.sex, age: a.age, chart_no: a.chart,
      room: a.room, bed: a.bed, legal_status: a.legal, status: a.status, dx: a.dx,
      admitted_on: a.admittedOn, day_no: a.dayNo, acuity: a.acuity, memo: a.memo,
      // attending_id 는 트리거가 현재 사용자로 설정
    })
    .select('id, sort, patient_name, sex, age, chart_no, room, bed, legal_status, status, dx, admitted_on, day_no, acuity, memo, ward:wards(code, name)')
    .single()
  if (error) throw error
  return mapAdmission(data)
}

export async function updateAdmission({ id, fields }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase
    .from('admissions')
    .update({
      room: fields.room, bed: fields.bed, legal_status: fields.legal,
      status: fields.status, dx: fields.dx, acuity: fields.acuity, memo: fields.memo,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteAdmission({ id }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase.from('admissions').delete().eq('id', id)
  if (error) throw error
}

export function summarizeWard(wards, adms) {
  const totalBeds = wards.reduce((n, w) => n + (w.total_beds || 0), 0)
  return {
    totalBeds,
    occupied: adms.length,
    isolation: adms.filter((a) => a.status === '격리').length,
    observation: adms.filter((a) => a.status === '관찰').length,
    dischargePlanned: adms.filter((a) => a.status === '퇴원예정').length,
    acute: adms.filter((a) => a.acuity === '중증').length,
  }
}

export async function getWardSummary() {
  if (!isSupabaseConfigured) return summarizeWard(mock.wards, mock.admissions)
  const { data, error } = await supabase.from('ward_summary').select('*').single()
  if (error) throw error
  return {
    totalBeds: data.total_beds,
    occupied: data.occupied,
    isolation: data.isolation,
    observation: data.observation,
    dischargePlanned: data.discharge_planned,
    acute: data.acute,
  }
}

export async function getSchedule() {
  if (!isSupabaseConfigured) {
    return { range: mock.schedule.range, slots: mock.schedule.slots.map((s) => ({ ...s })) }
  }
  const { data, error } = await supabase
    .from('appointments')
    .select('id, sort, start_time, patient_name, description, status, is_now')
    .order('sort')
  if (error) throw error
  return {
    range: '오후 · 13:00–18:00',
    slots: data.map((s) => ({
      id: s.id, time: s.start_time, name: s.patient_name, desc: s.description, status: s.status, now: s.is_now,
    })),
  }
}

export async function addAppointment({ a, sort = 0 }) {
  if (!isSupabaseConfigured) return { ...a }
  const { data, error } = await supabase
    .from('appointments')
    .insert({ sort, start_time: a.time, patient_name: a.name, description: a.desc, status: a.status || '예약', bar: 'sl-mut', is_now: false })
    .select('id, start_time, patient_name, description, status, is_now')
    .single()
  if (error) throw error
  return { id: data.id, time: data.start_time, name: data.patient_name, desc: data.description, status: data.status, now: data.is_now }
}

export async function updateAppointmentStatus({ id, status }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteAppointment({ id }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase.from('appointments').delete().eq('id', id)
  if (error) throw error
}

// ── queue (+ embedded patient detail) ───────────────────────────
const QUEUE_SELECT = `
  no, visit_type, status, status_cls, dx, received, wait, risk, position,
  patient:patients!inner (
    id, chart_no, name, sex, age, rrn, initial, primary_tags,
    safety:safety_assessments ( level, sev, bold, body ),
    scales:rating_scales ( id, sort, name, tag, value, max, pct, severity, severity_label ),
    trend:trend_points ( sort, label, phq, gad ),
    labs ( id, sort, lab_group, name, value, ref_range, flag, flag_type, collected ),
    rx:prescriptions ( id, sort, drug_class, class_warn, name, brand, dose, sub, sub_bold, qty, price, is_new ),
    notes:clinical_notes ( id, sort, author, dept, noted_at, segments ),
    meta:patient_detail_meta ( summary, rx_warn_title, rx_warn_body )
  )
`

export async function getQueue() {
  if (!isSupabaseConfigured) return mock.queue
  const { data, error } = await supabase.from('queue_entries').select(QUEUE_SELECT).order('position')
  if (error) throw error
  return data.map(mapQueueRow)
}

function mapQueueRow(row) {
  const p = row.patient
  return {
    no: row.no,
    patientId: p.id,
    name: p.name,
    sex: p.sex,
    age: p.age,
    chart: p.chart_no,
    rrn: p.rrn,
    type: row.visit_type,
    statusCls: row.status_cls,
    status: row.status,
    dx: row.dx,
    received: row.received,
    wait: row.wait,
    risk: row.risk,
    initial: p.initial,
    tags: p.primary_tags ?? [],
    detail: mapDetail(p),
  }
}

function mapDetail(p) {
  const safety = p.safety?.[0]
  const meta = p.meta?.[0] ?? {}
  const scales = [...(p.scales ?? [])].sort(bySort)
  const trend = [...(p.trend ?? [])].sort(bySort)
  const labRows = [...(p.labs ?? [])].sort(bySort)
  const rxRows = [...(p.rx ?? [])].sort(bySort)
  const notes = [...(p.notes ?? [])].sort(bySort)

  return {
    safety: safety
      ? { level: safety.level, sev: safety.sev, bold: safety.bold, text: safety.body }
      : { level: 'md', sev: '', bold: '', text: '' },
    scales: scales.map((s) => ({
      id: s.id,
      name: s.name,
      tag: s.tag,
      value: s.value,
      max: s.max,
      pct: s.pct,
      cls: s.severity,
      label: s.severity_label,
    })),
    trend: {
      labels: trend.map((t) => t.label),
      phq: trend.map((t) => t.phq),
      gad: trend.map((t) => t.gad),
    },
    summary: meta.summary ?? '',
    labs: groupLabs(labRows),
    rx: {
      items: rxRows.map((r) => ({
        id: r.id,
        klass: r.drug_class,
        klassWarn: r.class_warn,
        name: r.name,
        brand: r.brand,
        dose: r.dose,
        sub: r.sub,
        subBold: r.sub_bold,
        qty: r.qty,
        price: r.price,
        isNew: r.is_new,
      })),
      warn: { title: meta.rx_warn_title ?? '', text: meta.rx_warn_body ?? '' },
    },
    notes: notes.map((nt) => ({
      id: nt.id,
      author: nt.author,
      dept: nt.dept,
      datetime: nt.noted_at,
      segments: nt.segments,
    })),
  }
}

// ── writes ──────────────────────────────────────────────────────
function nowStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// Create a clinical (SOAP) note. Returns the note in the UI's note shape.
export async function addNote({ patientId, chart, author, dept, segments }) {
  const datetime = nowStamp()
  if (!isSupabaseConfigured) {
    return { author, dept, datetime, segments } // mock: in-memory only
  }

  let pid = patientId
  if (!pid) {
    const { data: p, error } = await supabase.from('patients').select('id').eq('chart_no', chart).single()
    if (error) throw error
    pid = p.id
  }

  const { data, error } = await supabase
    .from('clinical_notes')
    // negative sort → newest first (mapDetail sorts by sort asc)
    .insert({ patient_id: pid, sort: -Date.now(), author, dept, noted_at: datetime, segments })
    .select('author, dept, noted_at, segments')
    .single()
  if (error) throw error
  return { author: data.author, dept: data.dept, datetime: data.noted_at, segments: data.segments }
}

// Create a prescription. Returns it in the UI's rx-item shape.
export async function addPrescription({ patientId, chart, rx }) {
  if (!isSupabaseConfigured) {
    return { isNew: true, ...rx } // mock: in-memory only
  }

  let pid = patientId
  if (!pid) {
    const { data: p, error } = await supabase.from('patients').select('id').eq('chart_no', chart).single()
    if (error) throw error
    pid = p.id
  }

  const { data, error } = await supabase
    .from('prescriptions')
    .insert({
      patient_id: pid,
      sort: Date.now(), // append to end of list
      drug_class: rx.klass,
      class_warn: rx.klassWarn ?? false,
      name: rx.name,
      brand: rx.brand ?? '',
      dose: rx.dose,
      sub: rx.sub ?? '',
      sub_bold: rx.subBold ?? '',
      qty: rx.qty ?? '',
      price: rx.price ?? '',
      is_new: rx.isNew ?? true,
    })
    .select('drug_class, class_warn, name, brand, dose, sub, sub_bold, qty, price, is_new')
    .single()
  if (error) throw error
  return {
    klass: data.drug_class,
    klassWarn: data.class_warn,
    name: data.name,
    brand: data.brand,
    dose: data.dose,
    sub: data.sub,
    subBold: data.sub_bold,
    qty: data.qty,
    price: data.price,
    isNew: data.is_new,
  }
}

// ── updates / deletes (id from DB; no-op in mock) ───────────────
export async function updateNote({ id, segments }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase.from('clinical_notes').update({ segments }).eq('id', id)
  if (error) throw error
}

export async function deleteNote({ id }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase.from('clinical_notes').delete().eq('id', id)
  if (error) throw error
}

export async function updatePrescription({ id, rx }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase
    .from('prescriptions')
    .update({
      drug_class: rx.klass,
      name: rx.name,
      brand: rx.brand ?? '',
      dose: rx.dose,
      sub: rx.sub ?? '',
      qty: rx.qty ?? '',
      price: rx.price ?? '',
    })
    .eq('id', id)
  if (error) throw error
}

export async function deletePrescription({ id }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase.from('prescriptions').delete().eq('id', id)
  if (error) throw error
}

// ── scales / labs add+delete ────────────────────────────────────
async function resolvePid(patientId, chart) {
  if (patientId) return patientId
  const { data, error } = await supabase.from('patients').select('id').eq('chart_no', chart).single()
  if (error) throw error
  return data.id
}

export async function addScale({ patientId, chart, scale }) {
  if (!isSupabaseConfigured) return { ...scale }
  const pid = await resolvePid(patientId, chart)
  const { data, error } = await supabase
    .from('rating_scales')
    .insert({
      patient_id: pid,
      sort: Date.now(),
      name: scale.name,
      tag: scale.tag,
      value: scale.value,
      max: scale.max,
      pct: scale.pct,
      severity: scale.cls,
      severity_label: scale.label,
    })
    .select('id, name, tag, value, max, pct, severity, severity_label')
    .single()
  if (error) throw error
  return {
    id: data.id,
    name: data.name,
    tag: data.tag,
    value: data.value,
    max: data.max,
    pct: data.pct,
    cls: data.severity,
    label: data.severity_label,
  }
}

export async function deleteScale({ id }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase.from('rating_scales').delete().eq('id', id)
  if (error) throw error
}

export async function updateScale({ id, scale }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase
    .from('rating_scales')
    .update({
      name: scale.name,
      tag: scale.tag,
      value: scale.value,
      max: scale.max,
      pct: scale.pct,
      severity: scale.cls,
      severity_label: scale.label,
    })
    .eq('id', id)
  if (error) throw error
}

export async function addLab({ patientId, chart, lab }) {
  if (!isSupabaseConfigured) return { ...lab }
  const pid = await resolvePid(patientId, chart)
  const { data, error } = await supabase
    .from('labs')
    .insert({
      patient_id: pid,
      sort: Date.now(),
      lab_group: lab.group,
      name: lab.name,
      value: lab.val,
      ref_range: lab.ref,
      flag: lab.flag,
      flag_type: lab.flagType,
      collected: lab.date,
    })
    .select('id, lab_group, name, value, ref_range, flag, flag_type, collected')
    .single()
  if (error) throw error
  return {
    id: data.id,
    group: data.lab_group,
    name: data.name,
    val: data.value,
    ref: data.ref_range,
    flag: data.flag,
    flagType: data.flag_type,
    date: data.collected,
  }
}

export async function deleteLab({ id }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase.from('labs').delete().eq('id', id)
  if (error) throw error
}

export async function updateLab({ id, lab }) {
  if (!isSupabaseConfigured || !id) return
  const { error } = await supabase
    .from('labs')
    .update({
      name: lab.name,
      value: lab.val,
      ref_range: lab.ref,
      flag: lab.flag,
      flag_type: lab.flagType,
    })
    .eq('id', id)
  if (error) throw error
}

// flatten lab rows back into ordered [{ group, rows: [...] }]
function groupLabs(rows) {
  const groups = []
  const index = new Map()
  for (const r of rows) {
    if (!index.has(r.lab_group)) {
      index.set(r.lab_group, groups.length)
      groups.push({ group: r.lab_group, rows: [] })
    }
    groups[index.get(r.lab_group)].rows.push({
      id: r.id,
      group: r.lab_group,
      name: r.name,
      val: r.value,
      ref: r.ref_range,
      flag: r.flag,
      flagType: r.flag_type,
      date: r.collected,
    })
  }
  return groups
}
