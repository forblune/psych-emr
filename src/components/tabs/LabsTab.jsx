import { useState } from 'react'
import Icon from '../Icon'

const FLAGS = [
  { v: 'N', type: 'f-n', label: '정상 (N)' },
  { v: 'H', type: 'f-h', label: '높음 (H)' },
  { v: 'L', type: 'f-l', label: '낮음 (L)' },
]
const EMPTY = { group: '추가 검사', name: '', val: '', ref: '', flag: 'N' }

function todayMMDD() {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
const sameRow = (m, gi, ri) => m && typeof m === 'object' && m.gi === gi && m.ri === ri

export default function LabsTab({ detail, onAddLab, onDeleteLab, onUpdateLab }) {
  const [mode, setMode] = useState(null) // null | 'add' | {gi, ri}
  const [vals, setVals] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [opErr, setOpErr] = useState('')

  const set = (k, v) => setVals((prev) => ({ ...prev, [k]: v }))
  const editing = mode && typeof mode === 'object'

  const openAdd = () => {
    setMode('add')
    setVals(EMPTY)
    setErr('')
  }
  const openEdit = (gi, ri, groupName, row) => {
    setMode({ gi, ri })
    setVals({
      group: groupName,
      name: row.name,
      val: row.val,
      ref: row.ref,
      flag: FLAGS.some((f) => f.v === row.flag) ? row.flag : 'N',
    })
    setErr('')
    setOpErr('')
  }
  const close = () => setMode(null)

  async function submit(e) {
    e.preventDefault()
    if (!vals.name.trim() || !vals.val.trim()) return setErr('항목명과 결과는 필수입니다.')
    const flag = FLAGS.find((f) => f.v === vals.flag)
    const fields = {
      name: vals.name.trim(),
      val: vals.val.trim(),
      ref: vals.ref.trim() || '—',
      flag: flag.v,
      flagType: flag.type,
    }
    setBusy(true)
    setErr('')
    try {
      if (mode === 'add') {
        await onAddLab({ group: vals.group.trim() || '추가 검사', ...fields, date: todayMMDD() })
      } else {
        await onUpdateLab(mode.gi, mode.ri, fields)
      }
      close()
    } catch (e2) {
      setErr(e2.message || '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(gi, ri) {
    if (!window.confirm('이 검사 항목을 삭제할까요?')) return
    try {
      await onDeleteLab(gi, ri)
    } catch (e2) {
      setOpErr(e2.message || '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="pane">
      <div className="note-head">
        <span className="note-title">검사 · 약물농도</span>
        {mode === null && (
          <button className="btn note-add-btn" onClick={openAdd}>
            <Icon name="plus" size={13} />
            검사 입력
          </button>
        )}
      </div>

      {mode !== null && (
        <form className="note-form" onSubmit={submit}>
          <div className="note-form-grid">
            <label className="note-field">
              <span>검사 분류</span>
              <input value={vals.group} onChange={(e) => set('group', e.target.value)} disabled={editing} placeholder="대사 · 안전성 모니터링" />
            </label>
            <label className="note-field">
              <span>항목명 *</span>
              <input value={vals.name} onChange={(e) => set('name', e.target.value)} placeholder="공복혈당" />
            </label>
            <label className="note-field">
              <span>결과 *</span>
              <input value={vals.val} onChange={(e) => set('val', e.target.value)} placeholder="108" />
            </label>
            <label className="note-field">
              <span>참고치</span>
              <input value={vals.ref} onChange={(e) => set('ref', e.target.value)} placeholder="70–100 mg/dL" />
            </label>
            <label className="note-field">
              <span>판정</span>
              <select value={vals.flag} onChange={(e) => set('flag', e.target.value)}>
                {FLAGS.map((f) => (
                  <option key={f.v} value={f.v}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {err && <div className="note-err">{err}</div>}
          <div className="note-form-actions">
            <button type="button" className="btn" onClick={close} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? '저장 중…' : editing ? '수정 저장' : '검사 저장'}
            </button>
          </div>
        </form>
      )}

      {opErr && <div className="note-err" style={{ marginBottom: 8 }}>{opErr}</div>}

      <table>
        <thead>
          <tr>
            <th>항목</th>
            <th>결과</th>
            <th>참고치</th>
            <th>판정</th>
            <th>채취</th>
            <th aria-label="작업" />
          </tr>
        </thead>
        <tbody>
          {detail.labs.map((group, gi) => (
            <Group key={group.group + gi} group={group} gi={gi} editingKey={mode} onEdit={openEdit} onRemove={remove} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Group({ group, gi, editingKey, onEdit, onRemove }) {
  return (
    <>
      <tr>
        <td colSpan={6} className="lab-group">
          {group.group}
        </td>
      </tr>
      {group.rows.map((r, ri) => (
        <tr key={r.id ?? r.name + ri} className={sameRow(editingKey, gi, ri) ? 'lab-editing' : undefined}>
          <td>{r.name}</td>
          <td className="lab-val">{r.val}</td>
          <td className="ref">{r.ref}</td>
          <td>
            {r.flagType === 'ref' ? (
              <span className="ref">{r.flag}</span>
            ) : (
              <span className={`lab-flag ${r.flagType}`}>{r.flag}</span>
            )}
          </td>
          <td className="ref">{r.date || '06/22'}</td>
          <td>
            <span className="row-actions">
              <button className="row-act" onClick={() => onEdit(gi, ri, group.group, r)} aria-label="수정" title="수정">
                수정
              </button>
              <button className="row-act danger lab-del" onClick={() => onRemove(gi, ri)} aria-label="삭제" title="삭제">
                ×
              </button>
            </span>
          </td>
        </tr>
      ))}
    </>
  )
}
