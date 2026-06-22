import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setNotice('가입 완료. 이메일 인증이 켜져 있으면 메일함을 확인한 뒤 로그인하세요.')
        setMode('signin')
      }
    } catch (err) {
      setError(translate(err.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="mark">ψ</span>
          <div>
            <b>메디코어 EMR</b>
            <span>정신건강의학과 진료센터</span>
          </div>
        </div>

        <label className="login-label">
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@medicore.kr"
            autoComplete="username"
            required
          />
        </label>
        <label className="login-label">
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
          />
        </label>

        {error && <div className="login-msg err">{error}</div>}
        {notice && <div className="login-msg ok">{notice}</div>}

        <button className="btn primary login-submit" type="submit" disabled={busy}>
          {busy ? '처리 중…' : mode === 'signin' ? '로그인' : '계정 만들기'}
        </button>

        <button
          type="button"
          className="login-switch"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setNotice('')
          }}
        >
          {mode === 'signin' ? '계정이 없으신가요? 가입하기' : '이미 계정이 있으신가요? 로그인'}
        </button>

        <p className="login-foot">의료정보 시스템 · 인가된 의료진만 접근 가능합니다.</p>
      </form>
    </div>
  )
}

function translate(msg = '') {
  if (/Invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (/already registered/i.test(msg)) return '이미 가입된 이메일입니다.'
  if (/Password should be at least/i.test(msg)) return '비밀번호는 6자 이상이어야 합니다.'
  if (/Email not confirmed/i.test(msg)) return '이메일 인증이 필요합니다. 메일함을 확인하세요.'
  return msg || '오류가 발생했습니다.'
}
