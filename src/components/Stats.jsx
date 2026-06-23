import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'

// ── 집계 헬퍼 ─────────────────────────────────────────────────────
function countBy(arr, key) {
  const m = new Map()
  arr.forEach((x) => {
    const k = typeof key === 'function' ? key(x) : x[key]
    if (k == null || k === '') return
    m.set(k, (m.get(k) || 0) + 1)
  })
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

function scaleAverages(queue) {
  const acc = {}
  queue.forEach((p) =>
    (p.detail?.scales || []).forEach((s) => {
      acc[s.name] = acc[s.name] || { sum: 0, n: 0, max: s.max, tag: s.tag }
      acc[s.name].sum += s.value
      acc[s.name].n += 1
    })
  )
  return Object.entries(acc).map(([name, v]) => ({ name, tag: v.tag, avg: v.sum / v.n, max: v.max }))
}

function sevClass(name, avg) {
  // 대략적 중증도 색 (PHQ-9/GAD-7/ISI 류 공통 근사)
  const r = avg / 27
  if (r >= 0.55) return 'sev'
  if (r >= 0.37) return 'mod'
  if (r >= 0.18) return 'mild'
  return 'min'
}

// 진단 분포 — 코드 칩 + KCD 한글명을 한 줄로, 막대는 아래(긴 진단명 수용).
function DxBars({ data, color = 'acc' }) {
  const top = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="dxbars">
      {data.length === 0 && <div className="queue-empty">데이터 없음</div>}
      {data.map((d) => (
        <div className="dxbar-row" key={d.label} title={d.name ? `${d.label} · ${d.name}` : d.label}>
          <div className="dxbar-head">
            <span className="dx">{d.label}</span>
            <span className="dxbar-name">{d.name || '미분류'}</span>
            <span className="num dxbar-n">{d.value}</span>
          </div>
          <span className="bar-track"><i className={`bar-fill bf-${color}`} style={{ width: `${(d.value / top) * 100}%` }} /></span>
        </div>
      ))}
    </div>
  )
}

// 진단군(F-블록) 집계 — 코드 칩 없이 군 이름 + 막대.
function GroupBars({ data, color = 'warn' }) {
  const top = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="dxbars">
      {data.length === 0 && <div className="queue-empty">데이터 없음</div>}
      {data.map((d) => (
        <div className="dxbar-row" key={d.label} title={`${d.label} · ${d.value}건`}>
          <div className="dxbar-head">
            <span className="dxbar-name">{d.label}</span>
            <span className="num dxbar-n">{d.value}</span>
          </div>
          <span className="bar-track"><i className={`bar-fill bf-${color}`} style={{ width: `${(d.value / top) * 100}%` }} /></span>
        </div>
      ))}
    </div>
  )
}

function Bars({ data, max, color = 'acc' }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="bars">
      {data.length === 0 && <div className="queue-empty">데이터 없음</div>}
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span className="bar-label">{d.label}</span>
          <span className="bar-track">
            <i className={`bar-fill bf-${color}`} style={{ width: `${(d.value / top) * 100}%` }} />
          </span>
          <span className="bar-val num">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

// 위험도 도넛 (canvas, 로드 시 스윕)
function RiskDonut({ segments }) {
  const ref = useRef(null)
  const { theme } = useTheme()
  const total = segments.reduce((n, s) => n + s.value, 0)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf, start = null
    const fit = () => {
      const r = cv.getBoundingClientRect()
      cv.width = r.width * 2
      cv.height = r.height * 2
      ctx.setTransform(2, 0, 0, 2, 0, 0)
    }
    const draw = (prog) => {
      fit()
      const w = cv.width / 2, h = cv.height / 2
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 4, rin = R * 0.62
      ctx.clearRect(0, 0, w, h)
      let a0 = -Math.PI / 2
      const drawn = total === 0 ? [{ value: 1, color: 'rgba(120,140,160,.2)' }] : segments
      const tot = total === 0 ? 1 : total
      drawn.forEach((s) => {
        const a1 = a0 + (s.value / tot) * Math.PI * 2 * prog
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, R, a0, a1)
        ctx.closePath()
        ctx.fillStyle = s.color
        ctx.fill()
        a0 += (s.value / tot) * Math.PI * 2
      })
      // 가운데 구멍
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(cx, cy, rin, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      // 중앙 숫자
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#111'
      ctx.font = 'bold 22px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(total), cx, cy - 4)
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink-3').trim() || '#888'
      ctx.font = '10px sans-serif'
      ctx.fillText('명', cx, cy + 13)
    }
    const anim = (ts) => {
      if (start === null) start = ts
      const p = Math.min(1, (ts - start) / 700)
      draw(1 - Math.pow(1 - p, 3))
      if (p < 1) raf = requestAnimationFrame(anim)
    }
    if (reduce) draw(1)
    else raf = requestAnimationFrame(anim)
    const onR = () => draw(1)
    window.addEventListener('resize', onR)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR) }
  }, [segments, total, theme])

  return <canvas ref={ref} className="donut-cv" />
}

export default function Stats({ queue, admissions, wards, diagnoses = [] }) {
  const dxName = new Map(diagnoses.map((d) => [d.code, d.ko]))
  const dxGroupOf = new Map(diagnoses.map((d) => [d.code, d.group]))
  const withName = (rows) => rows.map((d) => ({ ...d, name: dxName.get(d.label) || '' }))
  const dxOut = withName(countBy(queue, 'dx'))
  const dxAdm = withName(countBy(admissions, 'dx'))
  // 진단군(F-블록)별 집계 — 외래+입원 합산
  const dxGroup = countBy([...queue, ...admissions], (p) => dxGroupOf.get(p.dx) || '기타 · 미분류')
  const legal = countBy(admissions, 'legal')
  const scales = scaleAverages(queue)
  const risk = {
    hi: queue.filter((p) => p.risk === 'hi').length,
    md: queue.filter((p) => p.risk === 'md').length,
    none: queue.filter((p) => !p.risk).length,
  }
  const riskSeg = [
    { label: '고위험', value: risk.hi, color: '#f4736f' },
    { label: '중등도', value: risk.md, color: '#e2a93c' },
    { label: '일반', value: risk.none, color: '#5d7180' },
  ]
  const totalBeds = wards.reduce((n, w) => n + w.total_beds, 0)
  const occPct = totalBeds ? Math.round((admissions.length / totalBeds) * 100) : 0
  const avgLos = admissions.length ? Math.round(admissions.reduce((n, a) => n + a.dayNo, 0) / admissions.length) : 0
  const phq = scales.find((s) => s.name === 'PHQ-9')
  const gad = scales.find((s) => s.name === 'GAD-7')
  const occByWard = wards.map((w) => ({ label: w.code, value: admissions.filter((a) => a.ward === w.code).length, total: w.total_beds }))

  const strip = [
    { tone: 't-acc', label: '관리 환자', value: String(queue.length + admissions.length), sub: `외래 ${queue.length} · 입원 ${admissions.length}` },
    { tone: 't-warn', label: '평균 PHQ-9', value: phq ? phq.avg.toFixed(1) : '—', sub: '우울 척도' },
    { tone: 't-warn', label: '평균 GAD-7', value: gad ? gad.avg.toFixed(1) : '—', sub: '불안 척도' },
    { tone: 't-crit', label: '고위험 비율', value: queue.length ? `${Math.round((risk.hi / queue.length) * 100)}%` : '0%', sub: `${risk.hi}명` },
    { tone: 't-ok', label: '병상 가동률', value: `${occPct}%`, sub: `${admissions.length}/${totalBeds}` },
    { tone: 't-acc', label: '평균 재원일수', value: `${avgLos}일`, sub: '입원 환자' },
  ]

  return (
    <main className="main">
      <div className="crumb">
        <h1>통계 · 지표</h1>
        <span className="path">
          <b>정신건강의학과</b> / 담당 환자 기준 · 2026-06-23
        </span>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: `repeat(${strip.length}, 1fr)` }}>
        {strip.map((k) => (
          <div className={`kpi ${k.tone}`} key={k.label}>
            <span className="tick" />
            <span className="lab">{k.label}</span>
            <span className="val">{k.value}</span>
            <span className="sub">{k.sub}</span>
          </div>
        ))}
      </div>

      <div className="stats-grid">
        <section className="card stat-card">
          <div className="hd"><h3>외래 진단 분포</h3><span className="meta">주상병 · KCD</span></div>
          <div className="stat-body"><DxBars data={dxOut} color="acc" /></div>
        </section>

        <section className="card stat-card">
          <div className="hd"><h3>위험도 분포</h3><span className="meta">대기열</span></div>
          <div className="stat-body donut-wrap">
            <RiskDonut segments={riskSeg} />
            <div className="donut-legend">
              {riskSeg.map((s) => (
                <div key={s.label}><i style={{ background: s.color }} />{s.label} <b className="num">{s.value}</b></div>
              ))}
            </div>
          </div>
        </section>

        <section className="card stat-card">
          <div className="hd"><h3>평가척도 평균</h3><span className="meta">담당 환자</span></div>
          <div className="stat-body">
            <div className="bars">
              {scales.length === 0 && <div className="queue-empty">데이터 없음</div>}
              {scales.map((s) => (
                <div className="bar-row" key={s.name}>
                  <span className="bar-label">{s.name} <small style={{ color: 'var(--ink-3)' }}>{s.tag}</small></span>
                  <span className="bar-track">
                    <i className={`bar-fill m-${sevClass(s.name, s.avg)}`} style={{ width: `${(s.avg / s.max) * 100}%` }} />
                  </span>
                  <span className="bar-val num">{s.avg.toFixed(1)}<small style={{ color: 'var(--ink-3)' }}>/{s.max}</small></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card stat-card">
          <div className="hd"><h3>입원유형 분포</h3><span className="meta">자의/보호/행정</span></div>
          <div className="stat-body"><Bars data={legal} color="warn" /></div>
        </section>

        <section className="card stat-card">
          <div className="hd"><h3>병동 가동 현황</h3><span className="meta">병상</span></div>
          <div className="stat-body">
            <div className="bars">
              {occByWard.map((w) => (
                <div className="bar-row" key={w.label}>
                  <span className="bar-label">{w.label}</span>
                  <span className="bar-track">
                    <i className="bar-fill bf-acc" style={{ width: `${w.total ? (w.value / w.total) * 100 : 0}%` }} />
                  </span>
                  <span className="bar-val num">{w.value}/{w.total}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card stat-card">
          <div className="hd"><h3>입원 진단 분포</h3><span className="meta">주상병 · KCD</span></div>
          <div className="stat-body"><DxBars data={dxAdm} color="ok" /></div>
        </section>

        <section className="card stat-card">
          <div className="hd"><h3>진단군 분포</h3><span className="meta">F-블록 · 외래+입원</span></div>
          <div className="stat-body"><GroupBars data={dxGroup} color="warn" /></div>
        </section>
      </div>
    </main>
  )
}
