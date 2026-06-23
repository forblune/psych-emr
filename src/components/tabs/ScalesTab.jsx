import { useState } from 'react'
import TrendChart from '../TrendChart'
import Icon from '../Icon'
import { SCALE_DEFS, SCALE_NAMES, classifyScale } from '../../lib/scales'

export default function ScalesTab({ detail, onAddScale, onDeleteScale, onUpdateScale }) {
  const { safety, scales, trend, summary } = detail
  const [mode, setMode] = useState(null) // null | 'add' | <index>
  const [name, setName] = useState(SCALE_NAMES[0])
  const [score, setScore] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [opErr, setOpErr] = useState('')

  const max = SCALE_DEFS[name].max
  const preview = score !== '' ? classifyScale(name, score) : null

  const openAdd = () => {
    setMode('add')
    setName(SCALE_NAMES[0])
    setScore('')
    setErr('')
  }
  const openEdit = (i) => {
    setMode(i)
    setName(scales[i].name)
    setScore(String(scales[i].value))
    setErr('')
    setOpErr('')
  }
  const close = () => setMode(null)

  async function submit(e) {
    e.preventDefault()
    if (score === '' || Number.isNaN(Number(score))) return setErr('점수를 입력하세요.')
    setBusy(true)
    setErr('')
    try {
      const scale = classifyScale(name, score)
      if (mode === 'add') await onAddScale(scale)
      else await onUpdateScale(mode, scale)
      close()
    } catch (e2) {
      setErr(e2.message || '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(i) {
    if (!window.confirm('이 척도를 삭제할까요?')) return
    try {
      await onDeleteScale(i)
    } catch (e2) {
      setOpErr(e2.message || '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="pane">
      <div className={`safety${safety.level === 'md' ? ' md' : ''}`}>
        <span className="sev">
          {safety.sev.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i === 0 && <br />}
            </span>
          ))}
        </span>
        <span className="txt">
          <b>{safety.bold}</b>
          {safety.text.replace(safety.bold, '')}
        </span>
      </div>

      <div className="note-head">
        <span className="note-title">평가척도</span>
        {mode === null && (
          <button className="btn note-add-btn" onClick={openAdd}>
            <Icon name="plus" size={13} />
            척도 입력
          </button>
        )}
      </div>

      {mode !== null && (
        <form className="note-form" onSubmit={submit}>
          <div className="scale-form-row">
            <label className="note-field">
              <span>척도{mode !== 'add' ? ' (수정)' : ''}</span>
              <select value={name} onChange={(e) => setName(e.target.value)}>
                {SCALE_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n} ({SCALE_DEFS[n].tag})
                  </option>
                ))}
              </select>
            </label>
            <label className="note-field">
              <span>점수 (0–{max})</span>
              <input
                type="number"
                min="0"
                max={max}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="예: 14"
              />
            </label>
            <div className="scale-preview">
              {preview && (
                <span className={`sl lv-${preview.cls}`}>
                  {preview.label} · {preview.pct}%
                </span>
              )}
            </div>
          </div>
          {err && <div className="note-err">{err}</div>}
          <div className="note-form-actions">
            <button type="button" className="btn" onClick={close} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? '저장 중…' : mode === 'add' ? '척도 저장' : '수정 저장'}
            </button>
          </div>
        </form>
      )}

      {opErr && <div className="note-err" style={{ marginBottom: 8 }}>{opErr}</div>}

      <div className="scales">
        {scales.map((s, i) => (
          <div className="scale" key={s.id ?? i}>
            <span className="scale-actions">
              {SCALE_DEFS[s.name] && (
                <button className="scale-act" onClick={() => openEdit(i)} aria-label="수정" title="수정">
                  수정
                </button>
              )}
              <button className="scale-act del" onClick={() => remove(i)} aria-label="삭제" title="삭제">
                ×
              </button>
            </span>
            <div className="st">
              <span className="sn">
                {s.name} <small>{s.tag}</small>
              </span>
              <span className="sv">
                {s.value}
                <small>/{s.max}</small>
              </span>
            </div>
            <div className="meter">
              <i className={`m-${s.cls}`} style={{ width: `${s.pct}%` }} />
            </div>
            <span className={`sl lv-${s.cls}`}>{s.label}</span>
          </div>
        ))}
      </div>

      <TrendChart trend={trend} />

      <div className="summary">
        <b>평가 요약</b> — {summary}
      </div>
    </div>
  )
}
