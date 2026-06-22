import { useState } from 'react'
import ScalesTab from './tabs/ScalesTab'
import LabsTab from './tabs/LabsTab'
import RxTab from './tabs/RxTab'
import NotesTab from './tabs/NotesTab'

const TABS = [
  { key: 'sc', label: '평가척도', Comp: ScalesTab },
  { key: 'lab', label: '검사·약물농도', Comp: LabsTab },
  { key: 'rx', label: '처방·오더', Comp: RxTab },
  { key: 'note', label: '경과·면담', Comp: NotesTab },
]

export default function PatientDetail({ patient }) {
  const [tab, setTab] = useState('sc')
  if (!patient) return null
  const Active = TABS.find((t) => t.key === tab).Comp

  return (
    <section className="card" style={{ gridRow: 1 }}>
      <div className="pt-hd">
        <div className="pt-top">
          <div className="pt-av">{patient.initial}</div>
          <div className="pt-id">
            <h2>{patient.name}</h2>
            <div className="line">
              {patient.sex} · <span className="num">{patient.age}세</span> · 차트{' '}
              <span className="num">{patient.chart}</span> · 주민 <span className="num">{patient.rrn}</span>
            </div>
            <div className="pt-tags">
              {patient.tags.map((t) => (
                <span className={`tag${/위험|위기|응급|의심/.test(t) ? ' risk' : ''}`} key={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="pt-actions">
            <button className="btn primary" style={{ padding: '6px 14px' }}>
              상담 시작
            </button>
            <button className="btn" style={{ padding: '5px 12px' }}>
              차트 열기
            </button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="panes">
        <Active detail={patient.detail} key={patient.chart + tab} />
      </div>
    </section>
  )
}
