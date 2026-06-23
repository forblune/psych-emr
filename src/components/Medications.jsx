import { useState } from 'react'
import Icon from './Icon'
import { expiryThreshold, medFlags } from '../data/api'

const CLASSES = ['SSRI', 'SNRI', '항정신병', '기분조절제', '벤조디아제핀', '수면제', '정신자극제', '기타']
const UNITS = ['정', '캡슐', '시럽', '주사', '패치']
const FILTERS = ['전체', '재고부족', '유효임박', '향정신성']
const LOG_KIND_CLS = { 입고: 'b-done', 불출: 'b-new', 조제: 'b-wait' }

// 분류 칩 색: 향정신성 계열은 경고색, 그 외 중립.
const CLASS_CLS = { 벤조디아제핀: 'lg-pro', 수면제: 'lg-pro', 정신자극제: 'lg-pro' }

export default function Medications({ medications, summary, logs = [], clinicDate, onAdd, onAdjust, onDelete }) {
  const threshold = expiryThreshold(clinicDate)
  const [filter, setFilter] = useState('전체')
  const [adding, setAdding] = useState(false)
  const [vals, setVals] = useState({ code: '', name: '', drugClass: 'SSRI', unit: '정', stock: '', min: '', expiry: '', controlled: false })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [qty, setQty] = useState({}) // index → 입·출고 수량(문자열)
  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }))

  const rows = medications
    .map((m, idx) => ({ m, idx, f: medFlags(m, threshold) }))
    .filter(({ f }) =>
      filter === '전체' ||
      (filter === '재고부족' && f.low) ||
      (filter === '유효임박' && f.expiring) ||
      (filter === '향정신성' && f.controlled)
    )

  const stats = [
    { tone: 't-acc', label: '총 품목', value: String(summary.total), sub: '약제 마스터' },
    { tone: 't-crit', label: '재고부족', value: String(summary.low), sub: '안전재고 이하' },
    { tone: 't-warn', label: '유효임박', value: String(summary.expiring), sub: `${threshold} 이전` },
    { tone: 't-acc', label: '향정신성', value: String(summary.controlled), sub: '별도 관리' },
    { tone: 't-ok', label: '총 재고수량', value: summary.totalUnits.toLocaleString(), sub: '전체 합계' },
  ]

  async function submit(e) {
    e.preventDefault()
    const stock = Number(vals.stock)
    const min = Number(vals.min)
    if (!vals.name.trim() || !vals.code.trim()) return setErr('약품명과 보험코드는 필수입니다.')
    if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(min) || min < 0) return setErr('재고·안전재고는 0 이상의 숫자여야 합니다.')
    if (vals.expiry && !/^\d{4}-\d{2}$/.test(vals.expiry.trim())) return setErr('유효기간은 YYYY-MM 형식입니다.')
    setBusy(true)
    setErr('')
    try {
      await onAdd({
        code: vals.code.trim(), name: vals.name.trim(), drugClass: vals.drugClass, unit: vals.unit,
        stock, min, expiry: vals.expiry.trim(), controlled: vals.controlled,
      })
      setVals({ code: '', name: '', drugClass: 'SSRI', unit: '정', stock: '', min: '', expiry: '', controlled: false })
      setAdding(false)
    } catch (e2) {
      setErr(e2.message || '추가에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  function adjust(idx, dir) {
    const step = Math.max(1, Math.floor(Number(qty[idx]) || 10))
    onAdjust(idx, dir * step)
  }

  return (
    <main className="main">
      <div className="crumb">
        <h1>약품 · 재고</h1>
        <span className="path">
          <b>정신건강의학과</b> / 약제팀 · 2026-06-23 · 약품 {summary.total}품목
        </span>
        <div className="crumb-actions">
          {!adding && (
            <button className="btn primary" onClick={() => setAdding(true)}>
              <Icon name="plus" size={13} />
              약품 등록
            </button>
          )}
        </div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
        {stats.map((k) => (
          <div className={`kpi ${k.tone}`} key={k.label}>
            <span className="tick" />
            <span className="lab">{k.label}</span>
            <span className="val">{k.value}</span>
            <span className="sub">{k.sub}</span>
          </div>
        ))}
      </div>

      <div className="search-screen">
        <section className="card med-list-card" style={{ flex: 1, minHeight: 0 }}>
          <div className="hd">
            <h3>약품 목록</h3>
            <span className="meta">{rows.length}품목</span>
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
                <label className="note-field" style={{ gridColumn: '1 / -1' }}><span>약품명 *</span>
                  <input value={vals.name} onChange={(e) => set('name', e.target.value)} placeholder="에스시탈로프람 10mg" />
                </label>
                <label className="note-field"><span>보험코드 *</span>
                  <input value={vals.code} onChange={(e) => set('code', e.target.value)} placeholder="A11800231" />
                </label>
                <label className="note-field"><span>분류</span>
                  <select value={vals.drugClass} onChange={(e) => set('drugClass', e.target.value)}>
                    {CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="note-field"><span>단위</span>
                  <select value={vals.unit} onChange={(e) => set('unit', e.target.value)}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </label>
                <label className="note-field"><span>유효기간</span>
                  <input value={vals.expiry} onChange={(e) => set('expiry', e.target.value)} placeholder="2027-05" />
                </label>
                <label className="note-field"><span>재고 *</span>
                  <input type="number" min="0" value={vals.stock} onChange={(e) => set('stock', e.target.value)} placeholder="500" />
                </label>
                <label className="note-field"><span>안전재고</span>
                  <input type="number" min="0" value={vals.min} onChange={(e) => set('min', e.target.value)} placeholder="100" />
                </label>
                <label className="note-field chk-field">
                  <input type="checkbox" checked={vals.controlled} onChange={(e) => set('controlled', e.target.checked)} />
                  <span>향정신성의약품</span>
                </label>
              </div>
              {err && <div className="note-err">{err}</div>}
              <div className="note-form-actions">
                <button type="button" className="btn" onClick={() => { setAdding(false); setErr('') }} disabled={busy}>취소</button>
                <button type="submit" className="btn primary" disabled={busy}>{busy ? '등록 중…' : '약품 등록'}</button>
              </div>
            </form>
          )}

          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>약품명 · 분류</th><th>보험코드</th><th>단위</th>
                  <th className="ta-r">재고</th><th className="ta-r">안전재고</th><th>유효기간</th>
                  <th>상태</th><th>입 · 출고</th><th aria-label="작업" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={9} className="queue-empty">해당 조건의 약품이 없습니다.</td></tr>}
                {rows.map(({ m, idx, f }) => (
                  <tr key={m.id ?? m.code} className={f.low ? 'lab-editing' : undefined}>
                    <td>
                      <div className="pname">{m.name}</div>
                      <span className={`legal ${CLASS_CLS[m.drugClass] || ''}`}>{m.drugClass}</span>
                    </td>
                    <td><span className="chartno">{m.code}</span></td>
                    <td className="ref">{m.unit}</td>
                    <td className="ta-r num" style={{ fontWeight: 700, color: f.low ? 'var(--crit)' : undefined }}>
                      {m.stock.toLocaleString()}
                    </td>
                    <td className="ta-r num">{m.min.toLocaleString()}</td>
                    <td className="ref">{m.expiry || '—'}</td>
                    <td>
                      <div className="badge-stack">
                        {f.low && <span className="badge b-emg">재고부족</span>}
                        {f.expiring && <span className="badge b-new">유효임박</span>}
                        {f.controlled && <span className="badge b-wait">향정</span>}
                        {!f.low && !f.expiring && !f.controlled && <span className="badge b-done">정상</span>}
                      </div>
                    </td>
                    <td>
                      <div className="stock-adj">
                        <input
                          type="number" min="1" className="appt-status stock-qty"
                          value={qty[idx] ?? ''} placeholder="10"
                          onChange={(e) => setQty((p) => ({ ...p, [idx]: e.target.value }))}
                        />
                        <button className="row-act" onClick={() => adjust(idx, +1)}>입고</button>
                        <button className="row-act" onClick={() => adjust(idx, -1)} disabled={m.stock <= 0}>불출</button>
                      </div>
                    </td>
                    <td>
                      <button className="row-act danger" onClick={() => onDelete(idx)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card med-log-card">
          <div className="hd">
            <h3>입 · 출고 이력</h3>
            <span className="meta">{logs.length}건</span>
          </div>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>시각</th><th>약품</th><th>구분</th>
                  <th className="ta-r">수량</th><th className="ta-r">변경 후</th><th>사유 · 담당</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && <tr><td colSpan={6} className="queue-empty">입·출고 이력이 없습니다.</td></tr>}
                {logs.map((l, i) => (
                  <tr key={l.id ?? l.at + i}>
                    <td className="ref num">{l.at}</td>
                    <td><span className="pname">{l.med}</span></td>
                    <td><span className={`badge ${LOG_KIND_CLS[l.kind] || 'b-wait'}`}>{l.kind}</span></td>
                    <td className="ta-r num" style={{ fontWeight: 700, color: l.kind === '입고' ? 'var(--ok)' : 'var(--crit)' }}>
                      {l.kind === '입고' ? '+' : '−'}{l.qty.toLocaleString()}
                    </td>
                    <td className="ta-r num">{l.after.toLocaleString()}</td>
                    <td className="ref">{l.reason}{l.actor ? ` · ${l.actor}` : ''}</td>
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
