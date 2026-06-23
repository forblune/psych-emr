import { useState } from 'react'
import Icon from '../Icon'

const EMPTY = { name: '', klass: '', brand: '', dose: '', sub: '', qty: '', price: '' }
const fromRx = (rx) => ({
  name: rx.name || '',
  klass: rx.klass || '',
  brand: rx.brand || '',
  dose: rx.dose || '',
  sub: rx.sub || '',
  qty: rx.qty || '',
  price: rx.price || '',
})

export default function RxTab({ detail, onAddRx, onUpdateRx, onDeleteRx }) {
  const { items, warn } = detail.rx
  const [mode, setMode] = useState(null) // null | 'add' | <index>
  const [vals, setVals] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [opErr, setOpErr] = useState('')

  const set = (k, v) => setVals((prev) => ({ ...prev, [k]: v }))
  const openAdd = () => {
    setMode('add')
    setVals(EMPTY)
    setErr('')
  }
  const openEdit = (i) => {
    setMode(i)
    setVals(fromRx(items[i]))
    setErr('')
    setOpErr('')
  }
  const close = () => setMode(null)

  async function submit(e) {
    e.preventDefault()
    if (!vals.name.trim() || !vals.dose.trim()) return setErr('약물명과 용법은 필수입니다.')
    const fields = {
      name: vals.name.trim(),
      klass: vals.klass.trim() || '처방',
      brand: vals.brand.trim(),
      dose: vals.dose.trim(),
      sub: vals.sub.trim(),
      qty: vals.qty.trim(),
      price: vals.price.trim(),
    }
    setBusy(true)
    setErr('')
    try {
      if (mode === 'add') await onAddRx({ ...fields, isNew: true })
      else await onUpdateRx(mode, fields)
      close()
    } catch (e2) {
      setErr(e2.message || '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(i) {
    if (!window.confirm('이 처방을 삭제할까요?')) return
    try {
      await onDeleteRx(i)
    } catch (e2) {
      setOpErr(e2.message || '삭제에 실패했습니다.')
    }
  }

  const form = (
    <form className="note-form" onSubmit={submit}>
      <div className="note-form-grid">
        <label className="note-field" style={{ gridColumn: '1 / -1' }}>
          <span>약물명 *</span>
          <input value={vals.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 에스시탈로프람 10mg" />
        </label>
        <label className="note-field">
          <span>성분·분류</span>
          <input value={vals.klass} onChange={(e) => set('klass', e.target.value)} placeholder="SSRI · 항우울제" />
        </label>
        <label className="note-field">
          <span>제품명</span>
          <input value={vals.brand} onChange={(e) => set('brand', e.target.value)} placeholder="(렉사프로정)" />
        </label>
        <label className="note-field" style={{ gridColumn: '1 / -1' }}>
          <span>용법 *</span>
          <input value={vals.dose} onChange={(e) => set('dose', e.target.value)} placeholder="1일 1회 1정 · 아침 식후" />
        </label>
        <label className="note-field" style={{ gridColumn: '1 / -1' }}>
          <span>비고</span>
          <input value={vals.sub} onChange={(e) => set('sub', e.target.value)} placeholder="적응증 · 처방일수 등" />
        </label>
        <label className="note-field">
          <span>수량</span>
          <input value={vals.qty} onChange={(e) => set('qty', e.target.value)} placeholder="30T" />
        </label>
        <label className="note-field">
          <span>약가</span>
          <input value={vals.price} onChange={(e) => set('price', e.target.value)} placeholder="₩4,200" />
        </label>
      </div>
      {err && <div className="note-err">{err}</div>}
      <div className="note-form-actions">
        <button type="button" className="btn" onClick={close} disabled={busy}>
          취소
        </button>
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? '저장 중…' : mode === 'add' ? '처방 추가' : '수정 저장'}
        </button>
      </div>
    </form>
  )

  return (
    <div className="pane">
      <div className="note-head">
        <span className="note-title">처방 · 오더</span>
        {mode === null && (
          <button className="btn note-add-btn" onClick={openAdd}>
            <Icon name="plus" size={13} />
            처방 추가
          </button>
        )}
      </div>

      {mode === 'add' && form}
      {opErr && <div className="note-err" style={{ marginBottom: 8 }}>{opErr}</div>}

      {items.map((rx, i) =>
        mode === i ? (
          <div key={i}>{form}</div>
        ) : (
          <div className={`rx${rx.isNew ? ' new' : ''}`} key={i}>
            <span className="pill" />
            <div className="info">
              <span className="klass" style={rx.klassWarn ? { color: 'var(--warn)' } : undefined}>
                {rx.klass}
              </span>
              <br />
              <b>{rx.name}</b> {rx.brand && <span className="d">{rx.brand}</span>}
              <div className="d">{rx.dose}</div>
              <div className="s">
                {rx.sub}
                {rx.subBold && <b style={{ color: 'var(--warn)' }}>{rx.subBold}</b>}
              </div>
              <span className="row-actions">
                <button className="row-act" onClick={() => openEdit(i)}>
                  수정
                </button>
                <button className="row-act danger" onClick={() => remove(i)}>
                  삭제
                </button>
              </span>
            </div>
            <div className="qty">
              {rx.qty}
              <br />
              {rx.price}
            </div>
          </div>
        )
      )}

      {(warn.title || warn.text) && (
        <div className="warnbox">
          <span style={{ color: 'var(--warn)' }}>
            <Icon name="warning" />
          </span>
          <span>
            <b>{warn.title}</b> — {warn.text}
          </span>
        </div>
      )}
    </div>
  )
}
