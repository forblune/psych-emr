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

export async function getKpis() {
  if (!isSupabaseConfigured) return mock.kpis
  const { data, error } = await supabase
    .from('kpis')
    .select('sort, tone, label, value, sub, delta, delta_tone')
    .order('sort')
  if (error) throw error
  return data.map((k) => ({
    tone: k.tone,
    label: k.label,
    value: k.value,
    sub: k.sub,
    delta: k.delta ?? undefined,
    deltaTone: k.delta_tone ?? undefined,
  }))
}

export async function getSchedule() {
  if (!isSupabaseConfigured) return mock.schedule
  const { data, error } = await supabase
    .from('appointments')
    .select('sort, start_time, patient_name, description, bar, badge_cls, badge_label, tail, is_now')
    .order('sort')
  if (error) throw error
  return {
    range: '오후 · 13:00–18:00',
    slots: data.map((s) => ({
      time: s.start_time,
      name: s.patient_name,
      desc: s.description,
      bar: s.bar,
      badge: s.badge_cls ? { cls: s.badge_cls, label: s.badge_label } : undefined,
      tail: s.tail ?? undefined,
      now: s.is_now,
    })),
  }
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
