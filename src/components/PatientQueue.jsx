import { useState } from 'react'

function RiskDot({ risk }) {
  if (!risk) return null
  return <span className={`risk-dot ${risk === 'hi' ? 'risk-hi' : 'risk-md'}`} />
}

export default function PatientQueue({ patients, selectedId, onSelect }) {
  const [sort, setSort] = useState('대기순')
  const sorts = ['대기순', '접수순', '위험도']

  return (
    <section className="card queue">
      <div className="hd">
        <h3>진료 대기열</h3>
        <span className="meta">자동 호출 · 12:41 갱신</span>
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
            {patients.map((p) => {
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
