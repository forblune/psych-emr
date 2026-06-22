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
        {schedule.slots.map((s, i) => (
          <div className={`slot${s.now ? ' now' : ''}`} key={i}>
            <span className="tm">{s.time}</span>
            <div className={`bar ${s.bar}`}>
              <b>{s.name}</b> {s.desc}
              {s.badge ? (
                <span className={`t badge ${s.badge.cls}`}>{s.badge.label}</span>
              ) : (
                <span className="t">{s.tail}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
