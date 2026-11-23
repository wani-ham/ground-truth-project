import { useEffect, useRef, useState } from 'react'
import { FLAG_CRITERIA, PHASES, PLATFORM_SHARES, WEEKS } from '../data/election'
import { formatNumber, formatShort, type FlaggedSummary } from '../engine/phases'

function useCountUp(value: number) {
  const [shown, setShown] = useState(value)
  const shownRef = useRef(value)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shownRef.current = value
      setShown(value)
      return
    }
    const from = shownRef.current
    const started = performance.now()
    let frame = 0
    const tick = (time: number) => {
      const t = Math.min(1, (time - started) / 600)
      const next = Math.round(from + (value - from) * (1 - (1 - t) ** 3))
      shownRef.current = next
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return shown
}

export function BotCounter({ summary, onReview }: { summary: FlaggedSummary; onReview: () => void }) {
  const shown = useCountUp(summary.total)
  const [criteriaOpen, setCriteriaOpen] = useState(false)
  const maxPhase = Math.max(...Object.values(summary.byPhase), 1)

  return (
    <section className="panel bot-counter" aria-label="Flagged accounts">
      <div className="panel-head">
        <h2>Flagged accounts</h2>
        <button type="button" className="primary" onClick={onReview}>Review and report →</button>
      </div>
      <div className="score-row">
        <div className="score" aria-label={`${formatNumber(summary.total)} likely bot accounts`}>{formatNumber(shown)}</div>
        <p>likely bot accounts flagged since {formatShort(WEEKS[0])}</p>
      </div>
      <p className="mono counter-line">
        +{formatNumber(summary.newThisWeek)} this week · {formatNumber(summary.reported)} reported to platforms · {formatNumber(summary.actioned)} actioned by platforms
      </p>
      <div className="breakdown" title="An account can be active in several phases, so phase totals can exceed the headline.">
        <span className="eyebrow">By phase</span>
        <div className="phase-bars">
          {PHASES.map((def) => (
            <div key={def.id}>
              <span className="mono">P{def.id}</span>
              <div className="meter"><div style={{ width: `${(summary.byPhase[def.id] / maxPhase) * 100}%` }} /></div>
              <span className="mono">{formatNumber(summary.byPhase[def.id])}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="breakdown-line"><span className="eyebrow">By platform</span> <span className="mono">{PLATFORM_SHARES.map(([name]) => `${name} ${formatNumber(summary.byPlatform[name])}`).join(' · ')}</span></p>
      <p className="breakdown-line"><span className="eyebrow">Confidence</span> <span className="mono">High {formatNumber(summary.byConfidence.High)} · Medium {formatNumber(summary.byConfidence.Medium)} · Low {formatNumber(summary.byConfidence.Low)}</span></p>
      <p className="breakdown-line"><span className="eyebrow">Reporting status</span> <span className="mono">Not reported {formatNumber(summary.byStatus['Not reported'])} · Reported {formatNumber(summary.byStatus.Reported)} · Actioned {formatNumber(summary.byStatus.Actioned)}</span></p>
      <button type="button" className="link criteria-link" aria-expanded={criteriaOpen} onClick={() => setCriteriaOpen((open) => !open)}>
        What makes an account “likely bot”?
      </button>
      {criteriaOpen && (
        <div className="caveat">
          <ul className="criteria-list">{FLAG_CRITERIA.map((item) => <li key={item}>{item}</li>)}</ul>
          High confidence means 4 or more criteria, medium 3, low 2.
        </div>
      )}
    </section>
  )
}
