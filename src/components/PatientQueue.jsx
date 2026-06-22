import { useMemo, useState } from 'react'

function RiskDot({ risk }) {
  if (!risk) return null
  return <span className={`risk-dot ${risk === 'hi' ? 'risk-hi' : 'risk-md'}`} />
}

// '-' (상담중) = 진료 중이라 대기 아님 → 맨 위로. 그 외 '12분' → 12.
function waitMinutes(w) {
  if (!w || w === '-') return Infinity
  const n = parseInt(w, 10)
  return Number.isNaN(n) ? -1 : n
}
function receivedMinutes(r) {
  const [h, m] = String(r).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const RISK_RANK = { hi: 2, md: 1, '': 0 }

const COMPARATORS = {
  대기순: (a, b) => waitMinutes(b.wait) - waitMinutes(a.wait),
  접수순: (a, b) => receivedMinutes(a.received) - receivedMinutes(b.received),
  위험도: (a, b) =>
    (RISK_RANK[b.risk] ?? 0) - (RISK_RANK[a.risk] ?? 0) || waitMinutes(b.wait) - waitMinutes(a.wait),
}

function matches(p, query) {
  const s = query.trim().toLowerCase()
  if (!s) return true
  return [p.name, p.chart, p.dx, p.rrn].some((v) => String(v || '').toLowerCase().includes(s))
}

export default function PatientQueue({ patients, selectedId, onSelect, search = '' }) {
  const [sort, setSort] = useState('대기순')
  const sorts = ['대기순', '접수순', '위험도']

  const view = useMemo(() => {
    const filtered = patients.filter((p) => matches(p, search))
    return filtered.sort(COMPARATORS[sort] || COMPARATORS['대기순'])
  }, [patients, search, sort])

  const q = search.trim()

  return (
    <section className="card queue">
      <div className="hd">
        <h3>진료 대기열</h3>
        <span className="meta">
          {q ? `"${q}" — ${view.length}건` : `${patients.length}명 대기 · 12:41`}
        </span>
        <div className="right">
          <div className="seg">
            {sorts.map((s) => (
              <button key={s} className={sort === s ? 'on' : ''} onClick={() => setSort(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>환자</th>
              <th>유형</th>
              <th>진단(F)</th>
              <th>접수</th>
              <th>대기</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr>
                <td colSpan={7} className="queue-empty">
                  "{q}" 검색 결과가 없습니다.
                </td>
              </tr>
            )}
            {view.map((p) => {
              const long = parseInt(p.wait, 10) >= 25
              return (
                <tr
                  key={p.chart}
                  className={`qrow${p.chart === selectedId ? ' sel' : ''}`}
                  onClick={() => onSelect(p.chart)}
                >
                  <td>
                    <span className="qno">{p.no}</span>
                  </td>
                  <td>
                    <div className="pname">
                      {p.name} <span className="meta">{p.sex}·{p.age}</span>
                      <RiskDot risk={p.risk} />
                    </div>
                    <span className="chartno">{p.chart}</span>
                  </td>
                  <td>{p.type}</td>
                  <td>
                    <span className="dx">{p.dx}</span>
                  </td>
                  <td className="ref">{p.received}</td>
                  <td>
                    <span className={`wait-t${long ? ' long' : ''}`}>{p.wait}</span>
                  </td>
                  <td>
                    <span className={`badge ${p.statusCls}`}>{p.status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
