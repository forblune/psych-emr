export default function NotesTab({ detail }) {
  return (
    <div className="pane">
      {detail.notes.map((note, i) => (
        <div className="note" key={i}>
          <div className="nh">
            <b>
              {note.author} · {note.dept}
            </b>
            <span>{note.datetime}</span>
          </div>
          <p>
            {note.segments.map((seg, j) => (
              <span key={j}>
                <span className="soap">{seg.label}</span>
                {seg.text}
                {j < note.segments.length - 1 && <br />}
              </span>
            ))}
          </p>
        </div>
      ))}
    </div>
  )
}
