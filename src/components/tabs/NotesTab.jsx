import { useState } from 'react'
import Icon from '../Icon'

const FIELDS = [
  { key: 's', label: 'S)', name: '주관적 (S)', placeholder: '환자 호소·증상·경과…' },
  { key: 'o', label: 'O)', name: '객관적 (O)', placeholder: 'MSE·활력징후·척도 점수…' },
  { key: 'a', label: 'A)', name: '평가 (A)', placeholder: '진단·상병코드(F)…' },
  { key: 'p', label: 'P)', name: '계획 (P)', placeholder: '약물·치료·다음 내원…' },
]

export default function NotesTab({ detail, onAddNote, onUpdateNote, onDeleteNote }) {
  const [open, setOpen] = useState(false)
  const [vals, setVals] = useState({ s: '', o: '', a: '', p: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // edit state
  const [editIdx, setEditIdx] = useState(null)
  const [editSegs, setEditSegs] = useState([])
  const [opErr, setOpErr] = useState('')

  const set = (k, v) => setVals((prev) => ({ ...prev, [k]: v }))

  async function submitNew(e) {
    e.preventDefault()
    const segments = FIELDS.filter((f) => vals[f.key].trim()).map((f) => ({
      label: f.label,
      text: ' ' + vals[f.key].trim(),
    }))
    if (!segments.length) return setErr('한 항목 이상 입력하세요.')
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

  function startEdit(i, note) {
    setOpErr('')
    setEditIdx(i)
    setEditSegs(note.segments.map((s) => ({ label: s.label, text: s.text.replace(/^\s/, '') })))
  }

  async function saveEdit(e) {
    e.preventDefault()
    const segments = editSegs
      .filter((s) => s.text.trim())
      .map((s) => ({ label: s.label, text: ' ' + s.text.trim() }))
    if (!segments.length) return setOpErr('내용을 입력하세요.')
    try {
      await onUpdateNote(editIdx, segments)
      setEditIdx(null)
    } catch (e2) {
      setOpErr(e2.message || '수정에 실패했습니다.')
    }
  }

  async function remove(i) {
    if (!window.confirm('이 노트를 삭제할까요?')) return
    try {
      await onDeleteNote(i)
    } catch (e2) {
      setOpErr(e2.message || '삭제에 실패했습니다.')
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
        <form className="note-form" onSubmit={submitNew}>
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

      {opErr && <div className="note-err" style={{ marginBottom: 8 }}>{opErr}</div>}

      {detail.notes.map((note, i) =>
        editIdx === i ? (
          <form className="note-form" key={i} onSubmit={saveEdit}>
            <div className="note-edit-grid">
              {editSegs.map((seg, j) => (
                <label key={j} className="note-field">
                  <span>{seg.label}</span>
                  <textarea
                    value={seg.text}
                    onChange={(e) =>
                      setEditSegs((prev) => prev.map((s, k) => (k === j ? { ...s, text: e.target.value } : s)))
                    }
                    rows={2}
                  />
                </label>
              ))}
            </div>
            {opErr && <div className="note-err">{opErr}</div>}
            <div className="note-form-actions">
              <button type="button" className="btn" onClick={() => setEditIdx(null)}>
                취소
              </button>
              <button type="submit" className="btn primary">
                수정 저장
              </button>
            </div>
          </form>
        ) : (
          <div className="note" key={i}>
            <div className="nh">
              <b>
                {note.author} · {note.dept}
              </b>
              <span className="nh-right">
                {note.datetime}
                <span className="row-actions">
                  <button className="row-act" onClick={() => startEdit(i, note)}>
                    수정
                  </button>
                  <button className="row-act danger" onClick={() => remove(i)}>
                    삭제
                  </button>
                </span>
              </span>
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
        )
      )}
    </div>
  )
}
