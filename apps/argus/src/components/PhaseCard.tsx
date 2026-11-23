import { useState } from 'react'
import { VOLUME, WEEKS, type Narrative, type PhaseDef } from '../data/election'
import { STATUS_CLASS, STATUS_ICON, formatNumber, formatShort, type PhaseReading } from '../engine/phases'

export function StatusBadge({ status }: { status: PhaseReading['status'] }) {
  return (
    <span className={`stage-badge ${STATUS_CLASS[status]}`}>
      <span aria-hidden="true">{STATUS_ICON[status]}</span> {status}
    </span>
  )
}

export function startText(reading: PhaseReading): string {
  if (reading.start) return `started ~${formatShort(reading.start.week)} ±${reading.start.marginDays} days`
  if (reading.precursor) return `precursors since ${formatShort(reading.precursor)} · not yet confirmed`
  return 'no start detected'
}

function Sparkline({ phase, week, start }: { phase: PhaseDef['id']; week: number; start: string | null }) {
  const values = VOLUME[phase].slice(0, week + 1)
  const max = Math.max(...VOLUME[phase].slice(0, week + 1), 1)
  const x = (i: number) => (i / (WEEKS.length - 1)) * 118 + 1
  const y = (value: number) => 30 - (value / max) * 27
  const points = values.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(' ')
  const startIndex = start ? WEEKS.indexOf(start) : -1
  return (
    <svg className="sparkline" width="120" height="32" viewBox="0 0 120 32" role="img" aria-label={`Weekly matched posts, latest ${formatNumber(values[values.length - 1])}`}>
      <line x1="1" x2="119" y1="30.5" y2="30.5" className="spark-base" />
      {startIndex >= 0 && <line x1={x(startIndex)} x2={x(startIndex)} y1="2" y2="31" className="spark-start" />}
      <polyline points={points} className="spark-line" />
    </svg>
  )
}

interface Props {
  def: PhaseDef
  reading: PhaseReading
  week: number
  narratives: Narrative[]
  flagged: number
  isCurrent: boolean
  onOpen: () => void
}

export function PhaseCard({ def, reading, week, narratives, flagged, isCurrent, onOpen }: Props) {
  const [scoringOpen, setScoringOpen] = useState(false)
  const top = narratives[0]

  return (
    <article className={`panel phase-card ${isCurrent ? 'is-current' : ''}`}>
      <span className="eyebrow">
        Phase {def.id}{isCurrent ? ' · Current phase' : ''} <span className="eyebrow-muted">· {def.eeas}</span>
      </span>
      <div className="panel-head">
        <h2>{def.short}</h2>
        <StatusBadge status={reading.status} />
      </div>
      <div className="phase-score">
        <div className="score">{reading.confidence}<small>%</small></div>
        <span>confidence the phase has started</span>
      </div>
      <div className="meter" role="meter" aria-label={`Phase ${def.id} confidence`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={reading.confidence}>
        <div style={{ width: `${reading.confidence}%` }} />
      </div>
      <p className="mono phase-start">{startText(reading)}</p>
      <Sparkline phase={def.id} week={week} start={reading.start?.week ?? null} />
      {top ? (
        <div className="phase-top">
          <span className="truncate"><strong>Top false claim:</strong> {top.label}</span>
          <span className="truncate muted">Fact: {top.truth}</span>
        </div>
      ) : (
        <div className="phase-top muted">No narratives matched yet.</div>
      )}
      <p className="mono phase-facts">{narratives.length} narratives · {formatNumber(flagged)} flagged accounts</p>
      <div className="phase-card-foot">
        <button type="button" className="link scoring-link" aria-expanded={scoringOpen} onClick={() => setScoringOpen((open) => !open)}>
          How is this scored?
        </button>
        <button type="button" className="link open-phase" aria-label={`Open phase ${def.id}, ${def.short}`} onClick={onOpen}>
          Open phase →
        </button>
      </div>
      {scoringOpen && (
        <div className="score-pop" role="group" aria-label={`How phase ${def.id} is scored`} onKeyDown={(event) => {
          if (event.key === 'Escape') { event.stopPropagation(); setScoringOpen(false) }
        }}>
          <div className="panel-head">
            <strong>How this is scored</strong>
            <button type="button" className="ghost" aria-label="Close scoring" autoFocus onClick={() => setScoringOpen(false)}>✕</button>
          </div>
          <IndicatorList def={def} reading={reading} />
          <p className="caveat">Based on the Russian FIMI election playbook described by the EEAS. Scores are simulated.</p>
        </div>
      )}
    </article>
  )
}

export function IndicatorList({ def, reading }: { def: PhaseDef; reading: PhaseReading }) {
  return (
    <ul className="signals">
      {def.indicators.map((indicator, i) => {
        const score = reading.scores[i]
        const raw = (score / 100) * indicator.fullValue
        const value = indicator.unit.startsWith('×') ? raw.toFixed(1) : String(Math.round(raw))
        return (
          <li key={indicator.id} title={`Scores 100 at ${indicator.fullAt}. Weight ${Math.round(indicator.weight * 100)}%.`}>
            <div className="signal-head">
              <span>{indicator.label}</span>
              <strong>{score}</strong>
            </div>
            <div className="meter" role="meter" aria-label={indicator.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
              <div style={{ width: `${score}%` }} />
            </div>
            <span className="signal-detail">{value}{indicator.unit.startsWith('×') || indicator.unit.startsWith('%') ? '' : ' '}{indicator.unit} · weight {Math.round(indicator.weight * 100)}%</span>
          </li>
        )
      })}
    </ul>
  )
}
