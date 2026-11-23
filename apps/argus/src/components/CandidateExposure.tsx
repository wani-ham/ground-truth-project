import { CANDIDATES, type Narrative } from '../data/election'
import { formatNumber, mainstreamPickupAt, postsThroughWeek } from '../engine/phases'

function MiniTrend({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  const points = values.map((value, i) => `${(i / 3) * 58 + 1},${18 - (value / max) * 16}`).join(' ')
  return <svg width="60" height="20" viewBox="0 0 60 20" role="img" aria-label={`Last four weeks: ${values.join(', ')} posts`}><polyline points={points} className="spark-line" /></svg>
}

interface Props { narratives: Narrative[]; week: number; now: Date; filter: string | null; onFilter: (id: string | null) => void }

export function CandidateExposure({ narratives, week, now, filter, onFilter }: Props) {
  const rows = CANDIDATES.map((candidate) => {
    const items = narratives.filter((item) => item.target.id === candidate.id)
    const exposure = items.reduce((sum, item) => sum + postsThroughWeek(item, week), 0)
    const trend = [3, 2, 1, 0].map((back) => items.reduce((sum, item) => sum + (item.weekly[week - back] ?? 0), 0))
    const pickup = items.reduce((sum, item) => sum + mainstreamPickupAt(item, now), 0)
    return { candidate, items, exposure, trend, pickup }
  }).sort((a, b) => b.exposure - a.exposure)
  const max = Math.max(...rows.map((row) => row.exposure), 1)

  return (
    <section className="panel" aria-label="Candidate exposure">
      <h2>Candidate exposure</h2>
      <div className="table-scroll">
        <table className="click-table">
          <thead><tr><th>Candidate</th><th>Exposure</th><th>Top false claim and fact</th><th className="num">Narratives</th><th>Trend</th><th>Mainstream pickup</th></tr></thead>
          <tbody>
            {rows.map(({ candidate, items, exposure, trend, pickup }) => (
              <tr key={candidate.id} className={filter === candidate.id ? 'selected' : ''}>
                <td className="plain-cell">
                  <button type="button" className="link" aria-pressed={filter === candidate.id} onClick={() => onFilter(filter === candidate.id ? null : candidate.id)}>{candidate.name}</button>
                  <span className="cell-sub">{candidate.party} · {candidate.role}</span>
                </td>
                <td><span className="mono">{formatNumber(exposure)}</span><div className="meter"><div style={{ width: `${(exposure / max) * 100}%` }} /></div></td>
                <td>{items[0] ? <><span>{items[0].label}</span><span className="cell-sub">Fact: {items[0].truth}</span></> : <span className="muted">None matched</span>}</td>
                <td className="num">{items.length}</td>
                <td><MiniTrend values={trend} /></td>
                <td>{pickup ? `Yes · ${pickup} outlet${pickup === 1 ? '' : 's'}` : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="caveat">We list exposure, not guilt or innocence. A high number means a candidate is being targeted.</p>
    </section>
  )
}
