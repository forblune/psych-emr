import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

function useClock() {
  const [time, setTime] = useState('--:--:--')
  useEffect(() => {
    const pad = (n) => String(n).padStart(2, '0')
    const tick = () => {
      const d = new Date()
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function TopBar({ clinic, doctor }) {
  const { theme, toggle } = useTheme()
  const { signOut } = useAuth()
  const time = useClock()

  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark">ψ</span>
        <span>
          {clinic.hospital} <small>EMR</small>
        </span>
      </div>
      <div className="dept-pill">
        진료과{' '}
        <b>
          {clinic.department} · {clinic.room}
        </b>
      </div>
      <div className="topsearch">
        <Icon name="search" size={14} />
        <input type="text" placeholder="환자명 · 차트번호 · 주민번호 앞자리로 검색  (Ctrl+K)" />
      </div>
      <div className="top-right">
        <button className="icobtn" onClick={toggle} title="테마 전환" aria-label="테마 전환">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button className="icobtn" title="알림">
          <Icon name="bell" />
          <span className="dot">4</span>
        </button>
        <div className="clock">
          <b>{time}</b>
          <br />
          <span>{clinic.date}</span>
        </div>
        <div className="me">
          <span className="av">{doctor.initial}</span>
          <span className="who">
            <b>{doctor.name}</b>
            <span>
              {doctor.title} · ID {doctor.id}
            </span>
          </span>
          {isSupabaseConfigured && (
            <button className="icobtn" onClick={signOut} title="로그아웃" aria-label="로그아웃">
              <Icon name="logout" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
