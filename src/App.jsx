import { useEffect, useState } from 'react'
import Icon from './components/Icon'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import KpiStrip from './components/KpiStrip'
import PatientQueue from './components/PatientQueue'
import PatientDetail from './components/PatientDetail'
import Schedule from './components/Schedule'
import Ward from './components/Ward'
import Stats from './components/Stats'
import PatientSearch from './components/PatientSearch'
import Appointments from './components/Appointments'
import Billing from './components/Billing'
import Medications from './components/Medications'
import ScaleDemo from './components/ScaleDemo'
import NewVisit from './components/NewVisit'
import Login from './components/Login'
import { useAuth } from './context/AuthContext'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  getClinic,
  getDoctor,
  getKpis,
  getNavGroups,
  getQueue,
  getSchedule,
  getSystemStatus,
  getWards,
  getAdmissions,
  getWardSummary,
  addAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  addAdmission,
  updateAdmission,
  deleteAdmission,
  summarizeWard,
  addNote,
  addPrescription,
  updateNote,
  deleteNote,
  updatePrescription,
  deletePrescription,
  addScale,
  deleteScale,
  updateScale,
  addLab,
  deleteLab,
  updateLab,
  startVisit,
  getBillings,
  getBillingSummary,
  markBillingPaid,
  summarizeBilling,
  addBilling,
  getMedications,
  getMedSummary,
  summarizeMeds,
  addMedication,
  updateMedStock,
  deleteMedication,
  getMedLogs,
  addMedLog,
  parseRxQty,
  matchMedicationIndex,
  getDiagnoses,
} from './data/api'

// 'MM-DD HH:MM' — mock 모드 로그 시각(브라우저 로컬).
function nowShort() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function loadAll() {
  const [clinic, doctor, kpis, navGroups, queue, schedule, systemStatus, wards, admissions, wardSummary, billings, billingSummary, medications, medSummary, diagnoses, medLogs] =
    await Promise.all([
      getClinic(), getDoctor(), getKpis(), getNavGroups(), getQueue(),
      getSchedule(), getSystemStatus(), getWards(), getAdmissions(), getWardSummary(),
      getBillings(), getBillingSummary(), getMedications(), getMedSummary(), getDiagnoses(), getMedLogs(),
    ])
  return { clinic, doctor, kpis, navGroups, queue, schedule, systemStatus, wards, admissions, wardSummary, billings, billingSummary, medications, medSummary, diagnoses, medLogs }
}

export default function App() {
  const { session, loading } = useAuth()
  const [data, setData] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [realtimeOn, setRealtimeOn] = useState(false)
  const [view, setView] = useState('dashboard')
  const [refreshing, setRefreshing] = useState(false)
  const [showNewVisit, setShowNewVisit] = useState(false)
  // 예약에서 진료를 시작한 경우: { index, name } — 제출 시 해당 예약을 완료 처리.
  const [pendingAppt, setPendingAppt] = useState(null)

  // With Supabase, RLS needs an authenticated session before any read.
  const authed = !isSupabaseConfigured || Boolean(session)

  useEffect(() => {
    if (!authed) {
      setData(null)
      return
    }
    let active = true
    loadAll().then((d) => {
      if (!active) return
      setData(d)
      setSelectedId(d.queue[0]?.chart ?? null)
    })
    return () => {
      active = false
    }
  }, [authed])

  // Realtime: auto-refresh on changes (Supabase only). RLS filters events so a
  // doctor only receives their own patients' changes.
  //  • queue/notes/prescriptions → reload queue(+detail) + KPIs
  //  • admissions → reload ward + KPIs
  useEffect(() => {
    if (!isSupabaseConfigured || !session) return
    let t1, t2
    const refetchDash = () => {
      clearTimeout(t1)
      t1 = setTimeout(() => {
        Promise.all([getQueue(), getKpis()])
          .then(([queue, kpis]) => setData((prev) => (prev ? { ...prev, queue, kpis } : prev)))
          .catch(() => {})
      }, 300)
    }
    const refetchWard = () => {
      clearTimeout(t2)
      t2 = setTimeout(() => {
        Promise.all([getAdmissions(), getWardSummary(), getKpis()])
          .then(([admissions, wardSummary, kpis]) =>
            setData((prev) => (prev ? { ...prev, admissions, wardSummary, kpis } : prev))
          )
          .catch(() => {})
      }, 300)
    }
    const pc = (table, fn) => ['postgres_changes', { event: '*', schema: 'public', table }, fn]
    const channel = supabase
      .channel('realtime-changes')
      .on(...pc('queue_entries', refetchDash))
      .on(...pc('clinical_notes', refetchDash))
      .on(...pc('prescriptions', refetchDash))
      .on(...pc('admissions', refetchWard))
      .subscribe((status) => setRealtimeOn(status === 'SUBSCRIBED'))
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      setRealtimeOn(false)
      supabase.removeChannel(channel)
    }
  }, [session])

  async function handleAddNote(chart, segments) {
    const item = data.queue.find((p) => p.chart === chart)
    if (!item) return
    const created = await addNote({
      patientId: item.patientId,
      chart,
      author: data.doctor.name,
      dept: data.clinic.department,
      segments,
    })
    setData((prev) => ({
      ...prev,
      queue: prev.queue.map((p) =>
        p.chart === chart
          ? { ...p, detail: { ...p.detail, notes: [created, ...p.detail.notes] } }
          : p
      ),
    }))
  }

  async function handleAddRx(chart, rx) {
    const item = data.queue.find((p) => p.chart === chart)
    if (!item) return
    const created = await addPrescription({ patientId: item.patientId, chart, rx })
    setData((prev) => ({
      ...prev,
      queue: prev.queue.map((p) =>
        p.chart === chart
          ? { ...p, detail: { ...p.detail, rx: { ...p.detail.rx, items: [...p.detail.rx.items, created] } } }
          : p
      ),
    }))
    // 처방 시 재고 자동 차감 + 조제 이력 (약물명이 약품 마스터와 정확히 일치 + 수량>0 일 때)
    await dispenseForRx(rx, item.name)
  }

  // immutably patch one patient's detail in queue state
  function patchDetail(chart, fn) {
    setData((prev) => ({
      ...prev,
      queue: prev.queue.map((p) => (p.chart === chart ? { ...p, detail: fn(p.detail) } : p)),
    }))
  }

  async function handleUpdateNote(chart, index, segments) {
    const note = data.queue.find((p) => p.chart === chart)?.detail.notes[index]
    if (!note) return
    await updateNote({ id: note.id, segments })
    patchDetail(chart, (d) => ({
      ...d,
      notes: d.notes.map((n, i) => (i === index ? { ...n, segments } : n)),
    }))
  }

  async function handleDeleteNote(chart, index) {
    const note = data.queue.find((p) => p.chart === chart)?.detail.notes[index]
    if (!note) return
    await deleteNote({ id: note.id })
    patchDetail(chart, (d) => ({ ...d, notes: d.notes.filter((_, i) => i !== index) }))
  }

  async function handleUpdateRx(chart, index, fields) {
    const rx = data.queue.find((p) => p.chart === chart)?.detail.rx.items[index]
    if (!rx) return
    await updatePrescription({ id: rx.id, rx: fields })
    patchDetail(chart, (d) => ({
      ...d,
      rx: { ...d.rx, items: d.rx.items.map((it, i) => (i === index ? { ...it, ...fields } : it)) },
    }))
  }

  async function handleDeleteRx(chart, index) {
    const rx = data.queue.find((p) => p.chart === chart)?.detail.rx.items[index]
    if (!rx) return
    await deletePrescription({ id: rx.id })
    patchDetail(chart, (d) => ({ ...d, rx: { ...d.rx, items: d.rx.items.filter((_, i) => i !== index) } }))
  }

  async function handleAddScale(chart, scale) {
    const item = data.queue.find((p) => p.chart === chart)
    if (!item) return
    const created = await addScale({ patientId: item.patientId, chart, scale })
    patchDetail(chart, (d) => ({ ...d, scales: [...d.scales, created] }))
  }

  async function handleDeleteScale(chart, index) {
    const s = data.queue.find((p) => p.chart === chart)?.detail.scales[index]
    if (!s) return
    await deleteScale({ id: s.id })
    patchDetail(chart, (d) => ({ ...d, scales: d.scales.filter((_, i) => i !== index) }))
  }

  async function handleUpdateScale(chart, index, scale) {
    const s = data.queue.find((p) => p.chart === chart)?.detail.scales[index]
    if (!s) return
    await updateScale({ id: s.id, scale })
    patchDetail(chart, (d) => ({
      ...d,
      scales: d.scales.map((it, i) => (i === index ? { ...scale, id: s.id } : it)),
    }))
  }

  async function handleAddLab(chart, lab) {
    const item = data.queue.find((p) => p.chart === chart)
    if (!item) return
    const created = await addLab({ patientId: item.patientId, chart, lab })
    patchDetail(chart, (d) => {
      const labs = d.labs.map((g) => ({ ...g, rows: [...g.rows] }))
      const g = labs.find((x) => x.group === created.group)
      if (g) g.rows.push(created)
      else labs.push({ group: created.group, rows: [created] })
      return { ...d, labs }
    })
  }

  async function handleDeleteLab(chart, groupIdx, rowIdx) {
    const row = data.queue.find((p) => p.chart === chart)?.detail.labs[groupIdx]?.rows[rowIdx]
    if (!row) return
    await deleteLab({ id: row.id })
    patchDetail(chart, (d) => {
      const labs = d.labs
        .map((g, gi) => (gi === groupIdx ? { ...g, rows: g.rows.filter((_, ri) => ri !== rowIdx) } : g))
        .filter((g) => g.rows.length > 0)
      return { ...d, labs }
    })
  }

  async function handleUpdateLab(chart, groupIdx, rowIdx, lab) {
    const row = data.queue.find((p) => p.chart === chart)?.detail.labs[groupIdx]?.rows[rowIdx]
    if (!row) return
    await updateLab({ id: row.id, lab })
    patchDetail(chart, (d) => ({
      ...d,
      labs: d.labs.map((g, gi) =>
        gi === groupIdx ? { ...g, rows: g.rows.map((r, ri) => (ri === rowIdx ? { ...r, ...lab } : r)) } : g
      ),
    }))
  }

  // ── 입원 CRUD ──
  function setAdmissions(next) {
    setData((prev) => ({
      ...prev,
      admissions: next,
      wardSummary: summarizeWard(prev.wards, next),
      kpis: prev.kpis.map((k) => (k.label === '담당 입원' ? { ...k, value: String(next.length) } : k)),
    }))
  }
  async function handleAddAdmission(a) {
    const created = await addAdmission({ a })
    setAdmissions([...data.admissions, created])
  }
  async function handleUpdateAdmission(index, fields) {
    const adm = data.admissions[index]
    if (!adm) return
    await updateAdmission({ id: adm.id, fields })
    setAdmissions(data.admissions.map((it, i) => (i === index ? { ...it, ...fields } : it)))
  }
  async function handleDeleteAdmission(index) {
    const adm = data.admissions[index]
    if (!adm) return
    await deleteAdmission({ id: adm.id })
    setAdmissions(data.admissions.filter((_, i) => i !== index))
  }

  // ── 예약 관리 ──
  function setSlots(next) {
    const done = next.filter((s) => s.status === '완료').length
    setData((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, slots: next },
      kpis: prev.kpis.map((k) =>
        k.label === '금일 예약'
          ? { ...k, value: String(next.length), sub: `완료 ${done} · 잔여 ${next.length - done}` }
          : k
      ),
    }))
  }
  async function handleAddAppt(a) {
    const created = await addAppointment({ a, sort: data.schedule.slots.length })
    setSlots([...data.schedule.slots, created])
  }
  async function handleSetApptStatus(index, status) {
    const slot = data.schedule.slots[index]
    if (!slot) return
    await updateAppointmentStatus({ id: slot.id, status })
    setSlots(data.schedule.slots.map((s, i) => (i === index ? { ...s, status } : s)))
  }
  async function handleDeleteAppt(index) {
    const slot = data.schedule.slots[index]
    if (!slot) return
    await deleteAppointment({ id: slot.id })
    setSlots(data.schedule.slots.filter((_, i) => i !== index))
  }
  // 예약에서 진료 시작: 환자명 프리필로 접수 모달 열기(제출 시 예약 완료 처리).
  function handleStartFromAppt(index) {
    const slot = data.schedule.slots[index]
    if (!slot) return
    setPendingAppt({ index, name: slot.name })
    setShowNewVisit(true)
  }

  async function handleMarkPaid(index) {
    const bl = data.billings[index]
    if (!bl) return
    await markBillingPaid({ id: bl.id })
    const next = data.billings.map((b, i) => (i === index ? { ...b, status: '수납완료' } : b))
    setData((prev) => ({ ...prev, billings: next, billingSummary: summarizeBilling(next) }))
  }

  // ── 약품 · 재고 ──
  function setMeds(next) {
    setData((prev) => ({ ...prev, medications: next, medSummary: summarizeMeds(next) }))
  }
  async function handleAddMed(med) {
    const created = await addMedication({ med, sort: data.medications.length })
    setMeds([...data.medications, created])
  }
  // 재고 변동 1건을 입·출고 이력에 기록(누가·언제·왜).
  async function logStock({ id, med, code, kind, qty, after, reason }) {
    const created = await addMedLog({ log: { medicationId: id, med, code, kind, qty, after, reason, actor: data.doctor.name } })
    const row = created.at ? created : { ...created, at: nowShort(), id: created.id ?? `local-${med}-${after}` }
    setData((prev) => ({ ...prev, medLogs: [row, ...(prev.medLogs || [])] }))
  }

  async function handleAdjustMed(index, delta) {
    const m = data.medications[index]
    if (!m) return
    const stock = Math.max(0, m.stock + delta)
    if (stock === m.stock) return
    await updateMedStock({ id: m.id, stock })
    setMeds(data.medications.map((it, i) => (i === index ? { ...it, stock } : it)))
    await logStock({ id: m.id, med: m.name, code: m.code, kind: delta > 0 ? '입고' : '불출', qty: Math.abs(delta), after: stock, reason: '수기 조정' })
  }
  async function handleDeleteMed(index) {
    const m = data.medications[index]
    if (!m) return
    await deleteMedication({ id: m.id })
    setMeds(data.medications.filter((_, i) => i !== index))
  }

  // 처방 1건을 약품 마스터와 매칭해 재고 차감 + 조제 이력 기록. 미일치/수량0이면 무동작.
  async function dispenseForRx(rx, patientName = '') {
    const meds = data.medications
    const idx = matchMedicationIndex(meds, rx.name)
    if (idx < 0) return
    const need = parseRxQty(rx.qty)
    if (need <= 0) return
    const m = meds[idx]
    const stock = Math.max(0, m.stock - need)
    if (stock === m.stock) return
    await updateMedStock({ id: m.id, stock })
    setMeds(meds.map((it, i) => (i === idx ? { ...it, stock } : it)))
    await logStock({ id: m.id, med: m.name, code: m.code, kind: '조제', qty: need, after: stock, reason: patientName ? `처방 조제 · ${patientName}` : '처방 조제' })
  }

  async function refresh() {
    setRefreshing(true)
    try {
      const d = await loadAll()
      setData(d)
      setSelectedId((cur) => (d.queue.some((p) => p.chart === cur) ? cur : d.queue[0]?.chart ?? null))
    } finally {
      setRefreshing(false)
    }
  }

  // 진료 시작 → (1) 대기열 등록 (2) 주상병으로 청구 자동 생성 (3) 예약 연동 시 완료 처리.
  // 외래 기본수가: 초진 ₩18,000 / 재진 ₩12,000, 본인부담 30%(건강보험 근사).
  function buildVisitBilling(form, chart) {
    const consult = form.type === '초진' ? 18000 : 12000
    return {
      chart, name: form.name, dx: form.dx, insurance: '건강보험',
      consult, drug: 0, test: 0, copay: Math.round(consult * 0.3), status: '미수납',
    }
  }

  async function handleStartVisit(form) {
    const { chart, item } = await startVisit({ ...form, queueLen: data.queue.length })
    const createdBilling = await addBilling({ billing: buildVisitBilling(form, chart), sort: data.billings.length })
    if (item) {
      // mock: 대기열 + 청구를 로컬에 반영
      setData((prev) => {
        const billings = [...prev.billings, createdBilling]
        return { ...prev, queue: [...prev.queue, item], billings, billingSummary: summarizeBilling(billings) }
      })
    } else {
      // supabase: 재조회로 큐·청구를 모두 반영(RLS)
      await refresh()
    }
    // 예약에서 시작했으면 해당 예약을 완료 처리
    if (pendingAppt != null) {
      await handleSetApptStatus(pendingAppt.index, '완료')
      setPendingAppt(null)
    }
    setSelectedId(chart)
    setShowNewVisit(false)
    setView('dashboard')
  }

  if (loading) return null
  if (isSupabaseConfigured && !session) return <Login />
  if (!data) return null

  const selected = data.queue.find((p) => p.chart === selectedId) ?? data.queue[0]

  return (
    <div className="app">
      <TopBar clinic={data.clinic} doctor={data.doctor} search={search} onSearch={setSearch} />
      <Sidebar navGroups={data.navGroups} systemStatus={data.systemStatus} view={view} onNavigate={setView} />
      {view === 'ward' ? (
        <Ward
          wards={data.wards}
          admissions={data.admissions}
          summary={data.wardSummary}
          diagnoses={data.diagnoses}
          onAddAdmission={handleAddAdmission}
          onUpdateAdmission={handleUpdateAdmission}
          onDeleteAdmission={handleDeleteAdmission}
        />
      ) : view === 'stats' ? (
        <Stats queue={data.queue} admissions={data.admissions} wards={data.wards} diagnoses={data.diagnoses} />
      ) : view === 'appts' ? (
        <Appointments
          schedule={data.schedule}
          onAdd={handleAddAppt}
          onSetStatus={handleSetApptStatus}
          onDelete={handleDeleteAppt}
          onStartVisit={handleStartFromAppt}
        />
      ) : view === 'billing' ? (
        <Billing billings={data.billings} summary={data.billingSummary} diagnoses={data.diagnoses} onMarkPaid={handleMarkPaid} />
      ) : view === 'meds' ? (
        <Medications
          medications={data.medications}
          summary={data.medSummary}
          logs={data.medLogs}
          clinicDate={data.clinic.date}
          onAdd={handleAddMed}
          onAdjust={handleAdjustMed}
          onDelete={handleDeleteMed}
        />
      ) : view === 'scale-demo' ? (
        <ScaleDemo />
      ) : view === 'search' ? (
        <PatientSearch
          queue={data.queue}
          admissions={data.admissions}
          initialQuery={search}
          onOpen={(targetView, chart) => {
            if (chart) setSelectedId(chart)
            setView(targetView)
          }}
        />
      ) : (
      <main className="main">
        <div className="crumb">
          <h1>진료 대시보드</h1>
          <span className="path">
            <b>{data.clinic.department}</b> / {data.clinic.room} / {data.clinic.session}
          </span>
          <div className="crumb-actions">
            <button className="btn" onClick={refresh} disabled={refreshing}>
              <span className={refreshing ? 'spin' : undefined}>
                <Icon name="refresh" size={13} />
              </span>
              {refreshing ? '갱신 중…' : '새로고침'}
            </button>
            <button className="btn primary" onClick={() => setShowNewVisit(true)}>
              <Icon name="plus" size={13} />
              신규 진료 시작
            </button>
          </div>
        </div>

        <KpiStrip kpis={data.kpis} />

        <div className="content">
          <PatientQueue
            patients={data.queue}
            selectedId={selectedId}
            onSelect={setSelectedId}
            search={search}
            live={realtimeOn}
            diagnoses={data.diagnoses}
          />
          <PatientDetail
            patient={selected}
            diagnoses={data.diagnoses}
            onAddNote={handleAddNote}
            onAddRx={handleAddRx}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onUpdateRx={handleUpdateRx}
            onDeleteRx={handleDeleteRx}
            onAddScale={handleAddScale}
            onDeleteScale={handleDeleteScale}
            onUpdateScale={handleUpdateScale}
            onAddLab={handleAddLab}
            onDeleteLab={handleDeleteLab}
            onUpdateLab={handleUpdateLab}
          />
          <Schedule schedule={data.schedule} />
        </div>
      </main>
      )}
      {showNewVisit && (
        <NewVisit
          onSubmit={handleStartVisit}
          onClose={() => { setShowNewVisit(false); setPendingAppt(null) }}
          diagnoses={data.diagnoses}
          prefill={pendingAppt}
        />
      )}
    </div>
  )
}
