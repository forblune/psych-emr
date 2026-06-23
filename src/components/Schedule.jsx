import { apptPresentation } from '../data/mock'

export default function Schedule({ schedule }) {
  return (
    <section className="card" style={{ gridRow: 2, gridColumn: 2 }}>
      <div className="hd">
        <h3>오늘 진료 일정</h3>
        <span className="meta">{schedule.range}</span>
        <div className="right">
          <span className="badge b-prog">진행 중</span>
        </div>
      </div>
      <div className="scroll">
        {schedule.slots.map((s, i) => {
          const p = apptPresentation(s.status, s.now)
          return (
            <div className={`slot${s.now ? ' now' : ''}`} key={s.id ?? i}>
              <span className="tm">{s.time}</span>
              <div className={`bar ${p.bar}`}>
                <b>{s.name}</b> {s.desc}
                {p.badgeLabel ? (
                  <span className={`t badge ${p.badgeCls}`}>{p.badgeLabel}</span>
                ) : (
                  <span className="t">{p.tail}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
