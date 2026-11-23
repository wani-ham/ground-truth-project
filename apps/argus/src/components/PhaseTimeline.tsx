import { useState } from 'react'
import { ELECTION, NEW_FLAGGED, PHASES, PHASE_IDS, VOLUME, WEEKS, type PhaseId } from '../data/election'
import { formatDayMonth, formatNumber, localDate, type PhaseReading } from '../engine/phases'

const W = 1120
const H = 170
const LEFT = 12
const RIGHT = 12
const TOP = 24
const BASE = 142
const FILL: Record<PhaseId, string> = { 1: 'var(--ink)', 2: 'var(--ink-muted)', 3: 'var(--burgundy)' }
const WEEK_MS = 7 * 86_400_000

const x = (index: number) => LEFT + (index / (WEEKS.length - 1)) * (W - LEFT - RIGHT)
const dateX = (date: Date) => {
  const first = localDate(WEEKS[0]).getTime()
  return Math.min(W - RIGHT, Math.max(LEFT, x((date.getTime() - first) / WEEK_MS)))
}
const totals = WEEKS.map((_, i) => PHASE_IDS.reduce((sum, phase) => sum + VOLUME[phase][i], 0))
const MAX = Math.max(...totals)
const y = (value: number) => BASE - (value / MAX) * (BASE - TOP)

function bandPath(phase: PhaseId, count: number) {
  const below = (i: number) => PHASE_IDS.filter((id) => id < phase).reduce((sum, id) => sum + VOLUME[id][i], 0)
  const indexes = Array.from({ length: count }, (_, i) => i)
  const upper = indexes.map((i) => `${x(i).toFixed(1)},${y(below(i) + VOLUME[phase][i]).toFixed(1)}`)
  const lower = [...indexes].reverse().map((i) => `${x(i).toFixed(1)},${y(below(i)).toFixed(1)}`)
  return `M${upper.join('L')}L${lower.join('L')}Z`
}

export function PhaseTimeline({ week, now, readings }: { week: number; now: Date; readings: PhaseReading[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const futurePath = `M${WEEKS.map((_, i) => `${x(i).toFixed(1)},${y(totals[i]).toFixed(1)}`).slice(week).join('L')}`
  const markers = [
    ...readings.filter((item) => item.start).map((item) => ({ key: `p${item.phase}`, at: dateX(localDate(item.start!.week)), label: `P${item.phase} start`, strong: false })),
    { key: 'election', at: dateX(localDate(ELECTION.pollsOpen)), label: 'Election · 7 Mar', strong: true },
    { key: 'certified', at: dateX(localDate(ELECTION.certification)), label: 'Certified · 17 Mar', strong: false },
  ]
  const summary = `Weekly matched posts by phase. Up to the week of ${formatDayMonth(WEEKS[week])}: ${PHASES.map((def) => `${def.short} ${formatNumber(VOLUME[def.id][week])}`).join(', ')}.`

  return (
    <section className="panel timeline-panel" aria-label="Phase timeline">
      <div className="panel-head">
        <h2>Phase timeline</h2>
        <div className="inline-toggle" role="group" aria-label="Timeline view">
          <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>Chart</button>
          <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
        </div>
      </div>
      {view === 'chart' ? (
        <>
          <div className="chart-scroll">
            <div className="chart-inner">
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} onMouseLeave={() => setHover(null)}>
                <defs>
                  <pattern id="hatch-1" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--paper)" strokeWidth="1" /></pattern>
                  <pattern id="hatch-2" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="0.9" fill="var(--paper)" /></pattern>
                  <pattern id="hatch-3" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--paper)" strokeWidth="1.2" /></pattern>
                </defs>
                <line x1={LEFT} x2={W - RIGHT} y1={BASE} y2={BASE} className="axis-line" />
                {week < WEEKS.length - 1 && <path d={`${futurePath}L${x(WEEKS.length - 1)},${BASE}L${x(week)},${BASE}Z`} className="future-area" />}
                {PHASE_IDS.map((phase) => (
                  <g key={phase}>
                    <path d={bandPath(phase, week + 1)} fill={FILL[phase]} />
                    <path d={bandPath(phase, week + 1)} fill={`url(#hatch-${phase})`} opacity="0.45" />
                  </g>
                ))}
                {markers.map((marker, i) => (
                  <g key={marker.key}>
                    <line x1={marker.at} x2={marker.at} y1={12} y2={BASE} className={marker.strong ? 'marker-strong' : 'marker-dash'} />
                    <text x={marker.at + 4} y={marker.key === 'certified' ? 22 : 12 + (i % 2) * 10} className="marker-text">{marker.label}</text>
                  </g>
                ))}
                <line x1={dateX(now)} x2={dateX(now)} y1={TOP - 8} y2={BASE} className="playhead-line" />
                {WEEKS.map((date, i) => i % 2 === 0 && <text key={date} x={x(i)} y={160} textAnchor={i === 0 ? 'start' : 'middle'} className="axis-text">{formatDayMonth(date)}</text>)}
                {WEEKS.map((date, i) => (
                  <rect key={date} x={x(i) - (W - LEFT - RIGHT) / (WEEKS.length - 1) / 2} y={0} width={(W - LEFT - RIGHT) / (WEEKS.length - 1)} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
                ))}
              </svg>
              {hover !== null && hover <= week && (
                <div className="graph-tooltip" style={{ left: `${(x(hover) / W) * 100}%`, top: 24, transform: hover > 14 ? 'translateX(-105%)' : 'translateX(10px)' }}>
                  <strong>Week of {formatDayMonth(WEEKS[hover])}</strong>
                  {PHASES.map((def) => <span key={def.id}>{def.short}: {formatNumber(VOLUME[def.id][hover])}</span>)}
                  <span>New flagged: {formatNumber(PHASE_IDS.reduce((sum, phase) => sum + NEW_FLAGGED[phase][hover], 0))}</span>
                </div>
              )}
            </div>
          </div>
          <div className="chart-legend">
            {PHASES.map((def) => <span key={def.id}><i className={`swatch swatch-${def.id}`} />{def.short}</span>)}
            <span><i className="swatch swatch-future" />Not yet happened</span>
          </div>
        </>
      ) : (
        <div className="table-scroll">
          <table>
            <caption>{summary}</caption>
            <thead><tr><th>Week</th>{PHASES.map((def) => <th key={def.id} className="num">{def.short}</th>)}<th className="num">New flagged</th></tr></thead>
            <tbody>
              {WEEKS.slice(0, week + 1).map((date, i) => (
                <tr key={date}>
                  <td>{formatDayMonth(date)}</td>
                  {PHASES.map((def) => <td key={def.id} className="num">{formatNumber(VOLUME[def.id][i])}</td>)}
                  <td className="num">{formatNumber(PHASE_IDS.reduce((sum, phase) => sum + NEW_FLAGGED[phase][i], 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
