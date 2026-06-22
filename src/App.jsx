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
          <PatientDetail patient={selected} />
          <Schedule schedule={data.schedule} />
        </div>
      </main>
    </div>
  )
}
