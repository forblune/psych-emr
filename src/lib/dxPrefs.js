// 진단 선택기 개인 설정 — 즐겨찾기 + 최근 사용.
// 사용자별 UI 선호라 localStorage 에 보관(mock/supabase 동일 동작, 스키마 변경 없음).
// 코드 문자열(ICD-10/KCD)만 저장; 표시는 diagnoses 마스터와 매칭해 해석.

const FAV = 'psy-emr.dx.favorites'
const RECENT = 'psy-emr.dx.recent'
const MAX_RECENT = 8

function read(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode / 미지원 — 무시 */
  }
}

export function getFavorites() {
  return read(FAV)
}
export function toggleFavorite(code) {
  const cur = read(FAV)
  const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]
  write(FAV, next)
  return next
}

export function getRecent() {
  return read(RECENT)
}
export function pushRecent(code) {
  const next = [code, ...read(RECENT).filter((c) => c !== code)].slice(0, MAX_RECENT)
  write(RECENT, next)
  return next
}
