export default function LabsTab({ detail }) {
  return (
    <div className="pane">
      <table>
        <thead>
          <tr>
            <th>항목</th>
            <th>결과</th>
            <th>참고치</th>
            <th>판정</th>
            <th>채취</th>
          </tr>
        </thead>
        <tbody>
          {detail.labs.map((group) => (
            <Group key={group.group} group={group} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Group({ group }) {
  return (
    <>
      <tr>
        <td colSpan={5} className="lab-group">
          {group.group}
        </td>
      </tr>
      {group.rows.map((r) => (
        <tr key={r.name}>
          <td>{r.name}</td>
          <td className="lab-val">{r.val}</td>
          <td className="ref">{r.ref}</td>
          <td>
            {r.flagType === 'ref' ? (
              <span className="ref">{r.flag}</span>
            ) : (
              <span className={`lab-flag ${r.flagType}`}>{r.flag}</span>
            )}
          </td>
          <td className="ref">{r.date || '06/22'}</td>
        </tr>
      ))}
    </>
  )
}
