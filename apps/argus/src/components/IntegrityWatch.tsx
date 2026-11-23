import { ELECTION_HOURLY, PROCESS_STEPS, type Narrative } from '../data/election'
import { formatNumber, localDate, postsThroughWeek } from '../engine/phases'

const HOUR_MS = 3_600_000
const START = localDate('2027-03-07T06:00:00')
const MARKERS = [{ hour: 1, label: 'Polls open' }, { hour: 16, label: 'Polls close' }, { hour: 19, label: 'First results' }]

function HourlyChart({ now }: { now: Date }) {
  const shown = Math.max(0, Math.min(48, Math.floor((now.getTime() - START.getTime()) / HOUR_MS) + 1))
  const max = Math.max(...ELECTION_HOURLY)
  const w = 1000
  const h = 150
  const base = 124
  const step = w / 48
  const total = ELECTION_HOURLY.slice(0, shown).reduce((sum, value) => sum + value, 0)
  return (
    <div className="chart-scroll">
      <div className="chart-inner">
        <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Integrity-claim posts per hour since 06:00 on election day: ${formatNumber(total)} posts over ${shown} hours.`}>
          <line x1={0} x2={w} y1={base} y2={base} className="axis-line" />
          {ELECTION_HOURLY.map((value, i) => {
            const height = (value / max) * (base - 22)
            return <rect key={i} x={i * step + 1} y={base - height} width={step - 2} height={height} className={i < shown ? 'hour-bar' : 'hour-bar-future'} />
          })}
          {MARKERS.map((marker) => (
            <g key={marker.label}>
              <line x1={marker.hour * step} x2={marker.hour * step} y1={4} y2={base} className="marker-dash" />
              <text x={marker.hour * step + 4} y={13} className="marker-text">{marker.label}</text>
            </g>
          ))}
          {[0, 12, 24, 36].map((hour) => <text key={hour} x={hour * step} y={143} className="axis-text">{hour === 0 ? '7 Mar 06:00' : hour === 12 ? '18:00' : hour === 24 ? '8 Mar 06:00' : '18:00'}</text>)}
        </svg>
      </div>
    </div>
  )
}

interface Props { narratives: Narrative[]; week: number; now: Date; filter: string | null; onFilter: (id: string | null) => void }

export function IntegrityWatch({ narratives, week, now, filter, onFilter }: Props) {
  const posts = narratives.reduce((sum, item) => sum + postsThroughWeek(item, week), 0)
  const electionDay = now >= localDate('2027-03-07')

  return (
    <section className="panel" aria-label="Integrity watch">
      <h2>Integrity watch</h2>
      <ol className="process-map">
        {PROCESS_STEPS.map((step) => {
          const count = narratives.filter((item) => item.target.id === step.id).length
          const happened = localDate(step.date) <= now
          return (
            <li key={step.id}>
              <button type="button" className={`${happened ? 'step-done' : 'step-future'} ${count ? 'step-hit' : ''}`} aria-pressed={filter === step.id} onClick={() => onFilter(filter === step.id ? null : step.id)}>
                <span>{step.label}</span>
                <strong className="mono"><span aria-hidden="true">{count ? '◆' : '●'}</span> {count}</strong>
                <small>{count === 1 ? 'false claim' : 'false claims'} · {happened ? 'started' : 'upcoming'}</small>
              </button>
            </li>
          )
        })}
      </ol>
      <h3 className="sub-head">Election-day hourly monitoring</h3>
      {electionDay ? <HourlyChart now={now} /> : (
        <p className="muted">Hourly monitoring starts on election day. Integrity claims so far: <span className="mono">{formatNumber(posts)}</span> posts, <span className="mono">{narratives.length}</span> narratives.</p>
      )}
    </section>
  )
}
