import { useState } from 'react'
import DiagnosisPicker from './DiagnosisPicker'

export default function NewVisit({ onSubmit, onClose, diagnoses = [], prefill = null }) {
  const [vals, setVals] = useState({
    name: prefill?.name || '', sex: '남', age: '', type: '초진', dx: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!vals.name.trim()) return setErr('환자명은 필수입니다.')
    if (!vals.dx.trim()) return setErr('진단을 DSM-5 진단명에서 선택하세요.')
    setBusy(true)
    setErr('')
    try {
      await onSubmit({ name: vals.name.trim(), sex: vals.sex, age: Number(vals.age) || 0, type: vals.type, dx: vals.dx.trim() })
    } catch (e2) {
      setErr(e2.message || '접수에 실패했습니다.')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal-card" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="modal-title">신규 진료 시작 · 환자 접수{prefill?.name ? ' (예약 연동)' : ''}</h2>
        <div className="note-form-grid">
          <label className="note-field" style={{ gridColumn: '1 / -1' }}>
            <span>환자명 *</span>
            <input value={vals.name} onChange={(e) => set('name', e.target.value)} placeholder="홍길동" autoFocus />
          </label>
          <label className="note-field">
            <span>성별</span>
            <select value={vals.sex} onChange={(e) => set('sex', e.target.value)}>
              <option>남</option>
              <option>여</option>
            </select>
          </label>
          <label className="note-field">
            <span>나이</span>
            <input type="number" value={vals.age} onChange={(e) => set('age', e.target.value)} placeholder="34" />
          </label>
          <label className="note-field">
            <span>유형</span>
            <select value={vals.type} onChange={(e) => set('type', e.target.value)}>
              <option>초진</option>
              <option>재진</option>
            </select>
          </label>
          <label className="note-field" style={{ gridColumn: '1 / -1' }}>
            <span>진단 (DSM-5 선택 → ICD-10/KCD 저장) *</span>
            <DiagnosisPicker diagnoses={diagnoses} value={vals.dx} onChange={(code) => set('dx', code)} />
          </label>
        </div>
        {err && <div className="note-err">{err}</div>}
        <div className="note-form-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? '접수 중…' : '접수하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
