import { useState } from 'react'
import Icon from '../Icon'

const FIELDS = [
  { key: 's', label: 'S)', name: '주관적 (S)', placeholder: '환자 호소·증상·경과…' },
  { key: 'o', label: 'O)', name: '객관적 (O)', placeholder: 'MSE·활력징후·척도 점수…' },
  { key: 'a', label: 'A)', name: '평가 (A)', placeholder: '진단·상병코드(F)…' },
  { key: 'p', label: 'P)', name: '계획 (P)', placeholder: '약물·치료·다음 내원…' },
]

export default function NotesTab({ detail, onAddNote }) {
  const [open, setOpen] = useState(false)
  const [vals, setVals] = useState({ s: '', o: '', a: '', p: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setVals((prev) => ({ ...prev, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    const segments = FIELDS.filter((f) => vals[f.key].trim()).map((f) => ({
      label: f.label,
      text: ' ' + vals[f.key].trim(),
    }))
    if (!segments.length) {
      setErr('한 항목 이상 입력하세요.')
      return
    }
    setBusy(true)
    setErr('')
    try {
      await onAddNote(segments)
      setVals({ s: '', o: '', a: '', p: '' })
      setOpen(false)
    } catch (e2) {
      setErr(e2.message || '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pane">
      <div className="note-head">
        <span className="note-title">경과 · 면담 기록</span>
        {!open && (
          <button className="btn note-add-btn" onClick={() => setOpen(true)}>
            <Icon name="plus" size={13} />
            노트 작성
          </button>
        )}
      </div>

      {open && (
        <form className="note-form" onSubmit={submit}>
          <div className="note-form-grid">
            {FIELDS.map((f) => (
              <label key={f.key} className="note-field">
                <span>{f.name}</span>
                <textarea
                  value={vals[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={2}
                />
              </label>
            ))}
          </div>
          {err && <div className="note-err">{err}</div>}
          <div className="note-form-actions">
            <button type="button" className="btn" onClick={() => setOpen(false)} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? '저장 중…' : '노트 저장'}
            </button>
          </div>
        </form>
      )}

      {detail.notes.map((note, i) => (
        <div className="note" key={i}>
          <div className="nh">
            <b>
              {note.author} · {note.dept}
            </b>
            <span>{note.datetime}</span>
          </div>
          <p>
            {note.segments.map((seg, j) => (
              <span key={j}>
                <span className="soap">{seg.label}</span>
                {seg.text}
                {j < note.segments.length - 1 && <br />}
              </span>
            ))}
          </p>
        </div>
      ))}
    </div>
  )
}
