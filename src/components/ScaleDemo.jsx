import { useMemo, useState } from 'react'
import Icon from './Icon'

const DISCLAIMER = '진단이 아니며 실제 진료 판단에는 전문가 평가가 필요합니다.'

const COMMON_OPTIONS = [
  { label: '전혀 없음', value: 0 },
  { label: '며칠', value: 1 },
  { label: '절반 이상', value: 2 },
  { label: '거의 매일', value: 3 },
]

const sleepOptions = [
  { label: '양호', value: 0 },
  { label: '가끔 불편', value: 1 },
  { label: '자주 불편', value: 2 },
  { label: '매우 불편', value: 3 },
]

const suicideOptions = [
  { label: '없음', value: 0 },
  { label: '스쳐 지나감', value: 1 },
  { label: '반복됨', value: 2 },
  { label: '구체적/조절 어려움', value: 3 },
]

const SCALES = [
  {
    id: 'phq9',
    title: 'PHQ-9',
    subtitle: '우울 증상 참고 체크',
    duration: '약 2분',
    max: 27,
    options: COMMON_OPTIONS,
    thresholds: { low: 4, medium: 14 },
    items: [
      '흥미나 즐거움이 줄어든 느낌',
      '기분이 가라앉거나 희망이 없다고 느낀 정도',
      '잠들기 어렵거나 너무 많이 잔 정도',
      '피곤하거나 기운이 없다고 느낀 정도',
      '식욕 저하 또는 과식이 있었던 정도',
      '자신을 부정적으로 평가한 정도',
      '집중하기 어려웠던 정도',
      '움직임이나 말이 느려지거나 안절부절못한 정도',
      '자신을 해치고 싶다는 생각이 스친 정도',
    ],
  },
  {
    id: 'gad7',
    title: 'GAD-7',
    subtitle: '불안 증상 참고 체크',
    duration: '약 2분',
    max: 21,
    options: COMMON_OPTIONS,
    thresholds: { low: 4, medium: 14 },
    items: [
      '초조하거나 불안하거나 긴장된 느낌',
      '걱정을 멈추거나 조절하기 어려운 정도',
      '여러 가지 일에 대한 과도한 걱정',
      '편하게 있기가 어려운 정도',
      '가만히 있기 어려울 정도로 안절부절못함',
      '쉽게 짜증이 나거나 예민해진 정도',
      '끔찍한 일이 생길 것 같은 두려움',
    ],
  },
  {
    id: 'sleep',
    title: '수면 상태',
    subtitle: '수면 부담 참고 체크',
    duration: '약 1분',
    max: 12,
    options: sleepOptions,
    thresholds: { low: 3, medium: 7 },
    items: [
      '잠들기까지 걸리는 시간이 길었던 정도',
      '중간에 깨거나 이른 새벽에 깬 정도',
      '수면 후에도 회복되지 않는 느낌',
      '낮 동안 졸림이나 기능 저하가 있었던 정도',
    ],
  },
  {
    id: 'suicide',
    title: '자살위험 체크',
    subtitle: '안전 신호 참고 체크',
    duration: '약 1분',
    max: 12,
    options: suicideOptions,
    thresholds: { low: 1, medium: 4 },
    risk: true,
    items: [
      '죽고 싶거나 사라지고 싶다는 생각',
      '자신을 해칠 방법이나 계획을 떠올린 정도',
      '실행 의도나 준비 행동이 있었던 정도',
      '혼자 있을 때 안전을 유지하기 어렵다고 느낀 정도',
    ],
  },
]

function getLevel(scale, score, answers) {
  if (scale.risk) {
    const values = scale.items.map((_, idx) => answers[idx] ?? 0)
    const highSignal = score >= 5 || values.some((v) => v >= 3) || values[1] >= 2 || values[2] >= 2
    if (highSignal) return { key: 'high', label: '높음', note: '즉시 전문가/응급 도움 필요' }
  }
  if (score <= scale.thresholds.low) return { key: 'low', label: '낮음', note: '현재 선택 기준의 참고 구간입니다.' }
  if (score <= scale.thresholds.medium) return { key: 'medium', label: '중간', note: '상태 변화와 생활 기능을 함께 확인하는 참고 구간입니다.' }
  return { key: 'high', label: '높음', note: '전문가 평가가 필요한 참고 구간입니다.' }
}

function scoreOf(scale, answers) {
  return scale.items.reduce((sum, _, idx) => sum + (answers[idx] ?? 0), 0)
}

export default function ScaleDemo() {
  const [activeId, setActiveId] = useState(null)
  const [answers, setAnswers] = useState({})
  const activeScale = SCALES.find((scale) => scale.id === activeId) ?? null
  const activeAnswers = activeScale ? answers[activeScale.id] ?? {} : {}

  const summaries = useMemo(() => (
    Object.fromEntries(SCALES.map((scale) => {
      const scaleAnswers = answers[scale.id] ?? {}
      const answered = Object.keys(scaleAnswers).length
      const score = scoreOf(scale, scaleAnswers)
      const level = answered === scale.items.length ? getLevel(scale, score, scaleAnswers) : null
      return [scale.id, { answered, score, level }]
    }))
  ), [answers])

  function setAnswer(scaleId, itemIdx, value) {
    setAnswers((prev) => ({
      ...prev,
      [scaleId]: {
        ...(prev[scaleId] ?? {}),
        [itemIdx]: value,
      },
    }))
  }

  function resetScale(scaleId) {
    setAnswers((prev) => ({ ...prev, [scaleId]: {} }))
  }

  const activeScore = activeScale ? scoreOf(activeScale, activeAnswers) : 0
  const activeAnswered = activeScale ? Object.keys(activeAnswers).length : 0
  const isComplete = activeScale ? activeAnswered === activeScale.items.length : false
  const activeLevel = activeScale && isComplete ? getLevel(activeScale, activeScore, activeAnswers) : null

  return (
    <main className="main">
      <div className="crumb">
        <h1>심리평가 · 척도</h1>
        <span className="path">
          <b>정신건강의학과</b> / 데모용 샘플 검사 · 저장 안 함
        </span>
      </div>

      <div className="scale-demo-wrap">
        <section className="card scale-demo-info">
          <div className="hd">
            <h3>샘플 척도 안내</h3>
            <span className="meta">Frontend state only</span>
          </div>
          <div className="scale-demo-copy">
            <p>포트폴리오 MVP에서 검사 흐름을 확인하기 위한 데모 화면입니다.</p>
            <div className="scale-demo-disclaimer">
              <Icon name="warning" size={15} />
              <span>{DISCLAIMER}</span>
            </div>
            <dl>
              <div><dt>제공 척도</dt><dd>PHQ-9, GAD-7, 수면 상태, 자살위험 체크</dd></div>
              <div><dt>저장 방식</dt><dd>백엔드/DB 저장 없이 현재 브라우저 상태만 사용</dd></div>
              <div><dt>결과 표시</dt><dd>낮음/중간/높음 참고 구간만 표시</dd></div>
            </dl>
          </div>
        </section>

        <section className="scale-demo-grid" aria-label="데모용 샘플 척도 목록">
          {SCALES.map((scale) => {
            const summary = summaries[scale.id]
            return (
              <button className="scale-demo-card" type="button" key={scale.id} onClick={() => setActiveId(scale.id)}>
                <span className="scale-demo-card-top">
                  <span>
                    <b>{scale.title}</b>
                    <small>{scale.subtitle}</small>
                  </span>
                  <span className={scale.risk ? 'badge b-emg' : 'badge b-wait'}>{scale.items.length}문항</span>
                </span>
                <span className="scale-demo-card-body">
                  <span>{scale.duration}</span>
                  <span>최대 {scale.max}점</span>
                  <span>{summary.answered}/{scale.items.length} 응답</span>
                </span>
                <span className="scale-demo-card-foot">
                  {summary.level ? (
                    <span className={`scale-result-chip ${summary.level.key}`}>
                      {summary.score}점 · {summary.level.label}
                    </span>
                  ) : (
                    <span className="scale-result-chip muted">미완료</span>
                  )}
                  <span className="scale-open">검사 열기</span>
                </span>
              </button>
            )
          })}
        </section>
      </div>

      {activeScale && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setActiveId(null)
        }}>
          <section className="modal-card scale-demo-modal" role="dialog" aria-modal="true" aria-labelledby="scale-demo-title">
            <div className="scale-demo-modal-head">
              <div>
                <h2 className="modal-title" id="scale-demo-title">{activeScale.title}</h2>
                <p>{activeScale.subtitle} · {activeScale.items.length}문항 · 저장 안 함</p>
              </div>
              <button className="scale-modal-close" type="button" onClick={() => setActiveId(null)} aria-label="닫기">×</button>
            </div>

            <div className="scale-demo-disclaimer compact">
              <Icon name="warning" size={14} />
              <span>{DISCLAIMER}</span>
            </div>

            <div className="scale-demo-items">
              {activeScale.items.map((item, idx) => (
                <div className="scale-demo-question" key={item}>
                  <div className="scale-demo-question-text">
                    <span>{String(idx + 1).padStart(2, '0')}</span>
                    <b>{item}</b>
                  </div>
                  <div className="scale-demo-options">
                    {activeScale.options.map((option) => (
                      <button
                        className={activeAnswers[idx] === option.value ? 'scale-choice on' : 'scale-choice'}
                        type="button"
                        key={option.label}
                        onClick={() => setAnswer(activeScale.id, idx, option.value)}
                      >
                        <span>{option.label}</span>
                        <b>{option.value}</b>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="scale-demo-result">
              <div>
                <span className="scale-demo-result-label">총점</span>
                <strong>{activeScore}<small> / {activeScale.max}</small></strong>
                <span className="scale-demo-result-sub">{activeAnswered}/{activeScale.items.length} 응답 완료</span>
              </div>
              {activeLevel ? (
                <div className={`scale-demo-level ${activeLevel.key}`}>
                  <span>참고 구간</span>
                  <b>{activeLevel.label}</b>
                  <small>{activeLevel.note}</small>
                </div>
              ) : (
                <div className="scale-demo-level pending">
                  <span>참고 구간</span>
                  <b>응답 대기</b>
                  <small>모든 문항 선택 시 결과가 계산됩니다.</small>
                </div>
              )}
            </div>

            {activeScale.risk && activeLevel?.key === 'high' && (
              <div className="scale-risk-card">
                <b>즉시 전문가/응급 도움 필요</b>
                <span>
                  이 결과는 진단이 아니라 안전 확인 신호입니다. 실제 위험 가능성이 있으면 혼자 판단하지 말고 즉시 전문가 또는 응급 도움을 요청해야 합니다.
                </span>
              </div>
            )}

            <div className="scale-demo-actions">
              <button className="btn" type="button" onClick={() => resetScale(activeScale.id)}>응답 초기화</button>
              <button className="btn primary" type="button" onClick={() => setActiveId(null)}>닫기</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
