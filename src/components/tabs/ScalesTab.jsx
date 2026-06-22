import TrendChart from '../TrendChart'

export default function ScalesTab({ detail }) {
  const { safety, scales, trend, summary } = detail
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

      <div className="scales">
        {scales.map((s) => (
          <div className="scale" key={s.name}>
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
