import { useEffect, useState } from 'react'
import Icon from './components/Icon'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import KpiStrip from './components/KpiStrip'
import PatientQueue from './components/PatientQueue'
import PatientDetail from './components/PatientDetail'
import Schedule from './components/Schedule'
import Ward from './components/Ward'
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
} from './data/api'

async function loadAll() {
  const [clinic, doctor, kpis, navGroups, queue, schedule, systemStatus, wards, admissions, wardSummary] =
    await Promise.all([
      getClinic(), getDoctor(), getKpis(), getNavGroups(), getQueue(),
      getSchedule(), getSystemStatus(), getWards(), getAdmissions(), getWardSummary(),
    ])
  return { clinic, doctor, kpis, navGroups, queue, schedule, systemStatus, wards, admissions, wardSummary }
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

  // Realtime: auto-refresh the queue when queue_entries change (Supabase only).
  // RLS filters events so a doctor only receives their own patients' changes.
  useEffect(() => {
    if (!isSupabaseConfigured || !session) return
    let timer
    const refetch = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        Promise.all([getQueue(), getKpis()])
          .then(([q, kpis]) => setData((prev) => (prev ? { ...prev, queue: q, kpis } : prev)))
          .catch(() => {})
      }, 300)
    }
    const channel = supabase
      .channel('queue-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, refetch)
      .subscribe((status) => setRealtimeOn(status === 'SUBSCRIBED'))
    return () => {
      clearTimeout(timer)
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

  async function handleStartVisit(form) {
    const { chart, item } = await startVisit({ ...form, queueLen: data.queue.length })
    if (item) {
      // mock: append locally
      setData((prev) => ({ ...prev, queue: [...prev.queue, item] }))
    } else {
      // supabase: reload to pick up the new entry (RLS)
      await refresh()
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
          onAddAdmission={handleAddAdmission}
          onUpdateAdmission={handleUpdateAdmission}
          onDeleteAdmission={handleDeleteAdmission}
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
          />
          <PatientDetail
            patient={selected}
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
      {showNewVisit && <NewVisit onSubmit={handleStartVisit} onClose={() => setShowNewVisit(false)} />}
    </div>
  )
}
