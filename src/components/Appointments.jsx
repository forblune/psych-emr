import { useState } from 'react'
import Icon from './Icon'
import { apptPresentation } from '../data/mock'

const STATUSES = ['예약', '진행중', '완료', '취소', '노쇼']
const FILTERS = ['전체', ...STATUSES]

function StatusBadge({ status, now }) {
  const p = apptPresentation(status, now)
  return p.badgeLabel ? <span className={`badge ${p.badgeCls}`}>{p.badgeLabel}</span> : <span className="badge b-wait">예약</span>
}

export default function Appointments({ schedule, onAdd, onSetStatus, onDelete, onStartVisit }) {
  const slots = schedule.slots
  const [filter, setFilter] = useState('전체')
  const [adding, setAdding] = useState(false)
  const [vals, setVals] = useState({ time: '', name: '', desc: '', status: '예약' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }))

  const rows = slots.map((s, idx) => ({ s, idx })).filter(({ s }) => filter === '전체' || s.status === filter)
  const counts = STATUSES.reduce((m, st) => ({ ...m, [st]: slots.filter((s) => s.status === st).length }), {})

  async function submit(e) {
    e.preventDefault()
    if (!vals.time.trim() || !vals.name.trim()) return setErr('시간과 환자명은 필수입니다.')
    setBusy(true)
    setErr('')
    try {
      await onAdd({ time: vals.time.trim(), name: vals.name.trim(), desc: vals.desc.trim() || '재진', status: vals.status })
      setVals({ time: '', name: '', desc: '', status: '예약' })
      setAdding(false)
    } catch (e2) {
      setErr(e2.message || '추가에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="main">
      <div className="crumb">
        <h1>예약 관리</h1>
        <span className="path">
          <b>정신건강의학과</b> / 제2진료실 · 2026-06-23 · 예약 {slots.length}건
        </span>
        <div className="crumb-actions">
          {!adding && (
            <button className="btn primary" onClick={() => setAdding(true)}>
              <Icon name="plus" size={13} />
              예약 추가
            </button>
          )}
        </div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: `repeat(${STATUSES.length + 1}, 1fr)` }}>
        <div className="kpi t-acc"><span className="tick" /><span className="lab">전체 예약</span><span className="val">{slots.length}</span><span className="sub">금일</span></div>
        {STATUSES.map((st) => (
          <div className={`kpi ${st === '완료' ? 't-ok' : st === '취소' || st === '노쇼' ? 't-crit' : st === '진행중' ? 't-acc' : 't-warn'}`} key={st}>
            <span className="tick" />
            <span className="lab">{st}</span>
            <span className="val">{counts[st]}</span>
            <span className="sub">건</span>
          </div>
        ))}
      </div>

      <div className="search-screen">
        <section className="card" style={{ flex: 1, minHeight: 0 }}>
          <div className="hd">
            <h3>예약 목록</h3>
            <span className="meta">{rows.length}건</span>
            <div className="right">
              <div className="seg">
                {FILTERS.map((f) => (
                  <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {adding && (
            <form className="note-form ward-form" onSubmit={submit}>
              <div className="note-form-grid">
                <label className="note-field"><span>시간 *</span>
                  <input value={vals.time} onChange={(e) => set('time', e.target.value)} placeholder="14:30" />
                </label>
                <label className="note-field"><span>환자명 *</span>
                  <input value={vals.name} onChange={(e) => set('name', e.target.value)} placeholder="홍길동" />
                </label>
                <label className="note-field" style={{ gridColumn: '1 / -1' }}><span>내용</span>
                  <input value={vals.desc} onChange={(e) => set('desc', e.target.value)} placeholder="재진 · 우울장애" />
                </label>
                <label className="note-field"><span>상태</span>
                  <select value={vals.status} onChange={(e) => set('status', e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              {err && <div className="note-err">{err}</div>}
              <div className="note-form-actions">
                <button type="button" className="btn" onClick={() => setAdding(false)} disabled={busy}>취소</button>
                <button type="submit" className="btn primary" disabled={busy}>{busy ? '추가 중…' : '예약 추가'}</button>
              </div>
            </form>
          )}

          <div className="scroll">
            <table>
              <thead>
                <tr><th>시간</th><th>환자</th><th>내용</th><th>상태</th><th>상태 변경</th><th aria-label="작업" /></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={6} className="queue-empty">해당 상태의 예약이 없습니다.</td></tr>}
                {rows.map(({ s, idx }) => (
                  <tr key={s.id ?? s.time + idx} className={s.now ? 'lab-editing' : undefined}>
                    <td><span className="qno">{s.time}</span></td>
                    <td><span className="pname">{s.name}</span></td>
                    <td className="ref">{s.desc}</td>
                    <td><StatusBadge status={s.status} now={s.now} /></td>
                    <td>
                      <select className="appt-status" value={s.status} onChange={(e) => onSetStatus(idx, e.target.value)}>
                        {STATUSES.map((st) => <option key={st}>{st}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className="row-actions">
                        {onStartVisit && (s.status === '예약' || s.status === '진행중') && (
                          <button className="row-act" onClick={() => onStartVisit(idx)}>진료 시작</button>
                        )}
                        <button className="row-act danger" onClick={() => onDelete(idx)}>삭제</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
