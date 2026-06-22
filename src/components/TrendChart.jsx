import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'

const MAX_Y = 27

// Symptom-severity trajectory. The one orchestrated motion in the app:
// the lines draw in on mount and whenever the selected patient changes.
export default function TrendChart({ trend }) {
  const ref = useRef(null)
  const { theme } = useTheme()
  const { labels, phq, gad } = trend

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf
    let start = null

    const fit = () => {
      const r = canvas.getBoundingClientRect()
      if (!r.width) return
      canvas.width = r.width * 2
      canvas.height = r.height * 2
      ctx.setTransform(2, 0, 0, 2, 0, 0)
    }

    const inkColor = getComputedStyle(document.documentElement).getPropertyValue('--ink-3').trim() || '#647688'

    const draw = (prog) => {
      fit()
      const w = canvas.width / 2
      const h = canvas.height / 2
      const padL = 26, padR = 10, padT = 8, padB = 20
      const pw = w - padL - padR
      const ph = h - padT - padB
      const xAt = (i, n) => padL + (n <= 1 ? pw : (i / (n - 1)) * pw)
      const yAt = (v) => padT + ph - (v / MAX_Y) * ph

      ctx.clearRect(0, 0, w, h)

      // grid + y labels
      ctx.strokeStyle = 'rgba(120,160,180,.15)'
      ctx.lineWidth = 1
      ctx.fillStyle = inkColor
      ctx.font = '9px ui-monospace, monospace'
      ctx.textAlign = 'right'
      ;[0, 5, 10, 15, 20, 25].forEach((g) => {
        const y = yAt(g)
        ctx.beginPath()
        ctx.moveTo(padL, y)
        ctx.lineTo(w - padR, y)
        ctx.stroke()
        ctx.fillText(g, padL - 5, y + 3)
      })

      // x labels
      ctx.textAlign = 'center'
      labels.forEach((l, i) => ctx.fillText(l, xAt(i, labels.length), h - 6))

      const plot = (data, color) => {
        if (!data.length) return
        const n = Math.max(1, Math.floor(prog * (data.length - 1)) + 1)
        ctx.strokeStyle = color
        ctx.lineWidth = 2.2
        ctx.lineJoin = 'round'
        ctx.shadowColor = color
        ctx.shadowBlur = 7
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const x = xAt(i, data.length)
          const y = yAt(data[i])
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.shadowBlur = 0
        for (let j = 0; j < n; j++) {
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(xAt(j, data.length), yAt(data[j]), 2.6, 0, 7)
          ctx.fill()
        }
        if (n >= data.length) {
          const last = data[data.length - 1]
          ctx.fillStyle = color
          ctx.font = 'bold 11px ui-monospace, monospace'
          ctx.textAlign = 'left'
          ctx.fillText(last, xAt(data.length - 1, data.length) - 16, yAt(last) - 7)
        }
      }

      plot(gad, '#e2a93c')
      plot(phq, '#2dd4bf')
    }

    const animate = (ts) => {
      if (start === null) start = ts
      const p = Math.min(1, (ts - start) / 1400)
      const eased = 1 - Math.pow(1 - p, 3)
      draw(eased)
      if (p < 1) raf = requestAnimationFrame(animate)
    }

    if (reduce) draw(1)
    else raf = requestAnimationFrame(animate)

    const onResize = () => draw(1)
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [labels, phq, gad, theme])

  return (
    <div className="trend-card">
      <div className="trend-top">
        <span>증상 경과 추이 · 최근 {labels.length}회 내원</span>
        <div className="legend">
          <i>
            <b style={{ background: '#2dd4bf' }} />
            PHQ-9
          </i>
          <i>
            <b style={{ background: '#e2a93c' }} />
            GAD-7
          </i>
        </div>
      </div>
      <canvas ref={ref} />
    </div>
  )
}
