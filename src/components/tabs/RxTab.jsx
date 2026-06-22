import Icon from '../Icon'

export default function RxTab({ detail }) {
  const { items, warn } = detail.rx
  return (
    <div className="pane">
      {items.map((rx, i) => (
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
          </div>
          <div className="qty">
            {rx.qty}
            <br />
            {rx.price}
          </div>
        </div>
      ))}

      <div className="warnbox">
        <span style={{ color: 'var(--warn)' }}>
          <Icon name="warning" />
        </span>
        <span>
          <b>{warn.title}</b> — {warn.text}
        </span>
      </div>
    </div>
  )
}
