import { useEffect, useState } from 'react'
import Icon from './components/Icon'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import KpiStrip from './components/KpiStrip'
import PatientQueue from './components/PatientQueue'
import PatientDetail from './components/PatientDetail'
import Schedule from './components/Schedule'
import Login from './components/Login'
import { useAuth } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import {
  getClinic,
  getDoctor,
  getKpis,
  getNavGroups,
  getQueue,
  getSchedule,
  getSystemStatus,
  addNote,
  addPrescription,
  updateNote,
  deleteNote,
  updatePrescription,
  deletePrescription,
} from './data/api'

export default function App() {
  const { session, loading } = useAuth()
  const [data, setData] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')

  // With Supabase, RLS needs an authenticated session before any read.
  const authed = !isSupabaseConfigured || Boolean(session)

  useEffect(() => {
    if (!authed) {
      setData(null)
      return
    }
    let active = true
    Promise.all([
      getClinic(),
      getDoctor(),
      getKpis(),
      getNavGroups(),
      getQueue(),
      getSchedule(),
      getSystemStatus(),
    ]).then(([clinic, doctor, kpis, navGroups, queue, schedule, systemStatus]) => {
      if (!active) return
      setData({ clinic, doctor, kpis, navGroups, queue, schedule, systemStatus })
      setSelectedId(queue[0]?.chart ?? null)
    })
    return () => {
      active = false
    }
  }, [authed])

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

  if (loading) return null
  if (isSupabaseConfigured && !session) return <Login />
  if (!data) return null

  const selected = data.queue.find((p) => p.chart === selectedId) ?? data.queue[0]

  return (
    <div className="app">
      <TopBar clinic={data.clinic} doctor={data.doctor} search={search} onSearch={setSearch} />
      <Sidebar navGroups={data.navGroups} systemStatus={data.systemStatus} />
      <main className="main">
        <div className="crumb">
          <h1>진료 대시보드</h1>
          <span className="path">
            <b>{data.clinic.department}</b> / {data.clinic.room} / {data.clinic.session}
          </span>
          <div className="crumb-actions">
            <button className="btn">
              <Icon name="refresh" size={13} />
              새로고침
            </button>
            <button className="btn primary">
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
          />
          <PatientDetail
            patient={selected}
            onAddNote={handleAddNote}
            onAddRx={handleAddRx}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onUpdateRx={handleUpdateRx}
            onDeleteRx={handleDeleteRx}
          />
          <Schedule schedule={data.schedule} />
        </div>
      </main>
    </div>
  )
}
