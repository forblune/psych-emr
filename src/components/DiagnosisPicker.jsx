import { useMemo, useRef, useState } from 'react'
import { getFavorites, getRecent, pushRecent, toggleFavorite } from '../lib/dxPrefs'

// DSM-5 진단명으로 검색·선택 → 상위에는 ICD-10(KCD) code 만 올려보낸다.
// value = 선택된 code, onChange(code) = 선택 콜백.
// 검색어가 없으면 즐겨찾기 · 최근 사용 · 전체 섹션을 보여준다(localStorage 영속).
export default function DiagnosisPicker({ diagnoses, value, onChange, autoFocus }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [favorites, setFavorites] = useState(getFavorites)
  const [recent, setRecent] = useState(getRecent)
  const blurTimer = useRef(null)

  const byCode = useMemo(() => new Map(diagnoses.map((d) => [d.code, d])), [diagnoses])
  const selected = byCode.get(value) || null
  const isFav = (code) => favorites.includes(code)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return diagnoses
    return diagnoses.filter(
      (d) => d.dsm.toLowerCase().includes(q) || d.ko.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
    )
  }, [diagnoses, query])

  // 코드 배열 → 마스터에 존재하는 진단 객체만(삭제/구코드 방어)
  const resolve = (codes) => codes.map((c) => byCode.get(c)).filter(Boolean)
  const favItems = resolve(favorites)
  const recentItems = resolve(recent)

  function pick(d) {
    onChange(d.code)
    setRecent(pushRecent(d.code))
    setQuery('')
    setOpen(false)
  }
  function onToggleFav(e, code) {
    e.stopPropagation()
    setFavorites(toggleFavorite(code))
  }

  // mousedown on an option fires before input blur — guard blur close with a timer.
  const onBlur = () => { blurTimer.current = setTimeout(() => setOpen(false), 140) }
  const cancelBlur = () => { if (blurTimer.current) clearTimeout(blurTimer.current) }

  // prefix 로 key 를 유일화 — 같은 code 가 여러 섹션(최근·전체)에 동시에 나와도 충돌 방지.
  const Row = (d, prefix) => (
    <li className="dx-li" key={`${prefix}-${d.code}`}>
      <button type="button" className={`dx-opt${d.code === value ? ' on' : ''}`} onClick={() => pick(d)}>
        <span className="code num">{d.code}</span>
        <span className="dsm">{d.dsm}</span>
        <span className="ko">{d.ko}</span>
      </button>
      <button
        type="button"
        className={`dx-star${isFav(d.code) ? ' on' : ''}`}
        onClick={(e) => onToggleFav(e, d.code)}
        aria-label={isFav(d.code) ? '즐겨찾기 해제' : '즐겨찾기'}
        title={isFav(d.code) ? '즐겨찾기 해제' : '즐겨찾기'}
      >
        {isFav(d.code) ? '★' : '☆'}
      </button>
    </li>
  )
  const Section = (title, items, prefix) =>
    items.length > 0 ? [<li className="dx-sec" key={`sec-${prefix}`}>{title}</li>, ...items.map((d) => Row(d, prefix))] : []

  return (
    <div className="dx-picker">
      <input
        className="dx-search"
        value={query}
        autoFocus={autoFocus}
        placeholder="DSM-5 진단명 검색 (예: anxiety · 우울 · F41)"
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { cancelBlur(); setOpen(true) }}
        onBlur={onBlur}
      />

      {selected && (
        <div className="dx-selected">
          <span className="legal lg-vol">{selected.code}</span>
          <span className="dx-sel-name">{selected.dsm}</span>
          <span className="dx-sel-ko">· {selected.ko}</span>
        </div>
      )}

      {open && (
        <ul className="dx-list" onMouseDown={cancelBlur}>
          {query ? (
            filtered.length === 0
              ? <li className="dx-empty">일치하는 진단이 없습니다.</li>
              : filtered.map((d) => Row(d, 'q'))
          ) : (
            [...Section('즐겨찾기', favItems, 'fav'), ...Section('최근 사용', recentItems, 'recent'), ...Section('전체', diagnoses, 'all')]
          )}
        </ul>
      )}
    </div>
  )
}
