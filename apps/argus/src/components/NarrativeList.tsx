import { useState } from 'react'
import type { Narrative } from '../data/election'
import { flaggedForNarrative, formatNumber, formatShort } from '../engine/phases'
import { PHASE_NETWORKS } from '../data/election'

const outletName = (narrative: Narrative) =>
  PHASE_NETWORKS[narrative.phase].nodes.find((node) => node.id === narrative.originOutlet)?.name ?? narrative.originOutlet

function trend(narrative: Narrative, week: number) {
  const posts = narrative.weekly[week]
  const previous = week > 0 ? narrative.weekly[week - 1] : 0
  if (!previous) return { icon: '↑', text: 'new' }
  const change = Math.round(((posts - previous) / previous) * 100)
  if (change === 0) return { icon: '→', text: '0%' }
  return { icon: change > 0 ? '↑' : '↓', text: `${Math.abs(change)}%` }
}

interface Props {
  narratives: Narrative[]
  week: number
  highlighted: string | null
  includedIds: ReadonlySet<string>
  onHighlight: (id: string | null) => void
  onToggleIncluded: (id: string, included: boolean) => void
  onReplay: () => void
}

export function NarrativeList({ narratives, week, highlighted, includedIds, onHighlight, onToggleIncluded, onReplay }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const max = Math.max(...narratives.map((item) => item.weekly[week]), 1)

  if (!narratives.length) return <p className="muted">No narratives have been matched at this date.</p>

  return (
    <ol className="narrative-list">
      {narratives.slice(0, 8).map((item, i) => {
        const change = trend(item, week)
        const open = expanded === item.id
        return (
          <li key={item.id} className={highlighted === item.id ? 'is-highlighted' : ''}>
            <div className="narrative-row">
              <span className="mono rank">{i + 1}</span>
              <button type="button" className="link narrative-name" aria-pressed={highlighted === item.id} onClick={() => onHighlight(highlighted === item.id ? null : item.id)}>
                {item.label}
              </button>
              <span className="mono trend" aria-label={`Trend ${change.text}`}>{change.icon} {change.text}</span>
              <button type="button" className="ghost chevron" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${item.label}`} onClick={() => setExpanded(open ? null : item.id)}>
                {open ? '▾' : '▸'}
              </button>
            </div>
            <p className="narrative-fact"><strong>Fact:</strong> {item.truth}</p>
            <span className="target-chip">{item.target.label}</span>
            <div className="meter"><div style={{ width: `${(item.weekly[week] / max) * 100}%` }} /></div>
            <p className="narrative-meta">
              <span className="mono">{formatNumber(item.weekly[week])}</span> posts · <span className="mono">{formatNumber(flaggedForNarrative(item, week))}</span> flagged accounts · first seen <span className="mono">{formatShort(item.firstSeen)}</span> · origin: {outletName(item)}
            </p>
            {open && (
              <div className="narrative-more">
                <p className="claim">False claim: “{item.claim}”</p>
                <p><strong>What is true:</strong> {item.truth} <span className="muted">Source: {item.truthSource}.</span></p>
                <ul className="example-posts">
                  {item.examplePosts.map((post, index) => <li key={post}><span className="mono">@b•••••_0{index + 7}</span> {post}</li>)}
                </ul>
                <label className="review">
                  <input type="checkbox" checked={includedIds.has(item.id)} onChange={(event) => onToggleIncluded(item.id, event.target.checked)} />
                  Add to weekly report
                </label>
                {item.id === 'p3n1' && <button type="button" className="link" onClick={onReplay}>Replay how it spread →</button>}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
