import Icon from './Icon'

export default function Sidebar({ navGroups, systemStatus }) {
  return (
    <aside className="side">
      {navGroups.map((group) => (
        <div className="nav-group" key={group.title}>
          <h6>{group.title}</h6>
          {group.items.map((item) => (
            <button className={`nav-item${item.active ? ' on' : ''}`} key={item.label}>
              <Icon name={item.icon} />
              {item.label}
              {item.count != null && <span className={`ct${item.crit ? ' crit' : ''}`}>{item.count}</span>}
            </button>
          ))}
        </div>
      ))}
      <div className="side-foot">
        {systemStatus.map((s) => (
          <div className="row" key={s.label}>
            <span>{s.label}</span>
            <span className={s.ok ? 'ok' : 'num'}>{s.ok ? '● 정상' : s.value}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
