import { forceCollide, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import { useMemo, useState } from 'react'
import { PHASE_NETWORKS, type ElectionTier, type Narrative, type PhaseEdge, type PhaseId, type PhaseNode } from '../data/election'
import { formatDay, isSeen } from '../engine/phases'
import { formatReach } from '../engine/playback'
import { tierShape } from './NetworkGraph'

const W = 820
const H = 540
const TOP = 54
const COLUMNS: { id: ElectionTier; label: string; x: number }[] = [
  { id: 'origin', label: 'Origin', x: 62 },
  { id: 'laundering', label: 'Laundering', x: 196 },
  { id: 'relay', label: 'Relay', x: 340 },
  { id: 'amplification', label: 'Amplification', x: 490 },
  { id: 'mainstream', label: 'Mainstream', x: 640 },
]
const COLUMN_X = Object.fromEntries(COLUMNS.map((column) => [column.id, column.x])) as Record<ElectionTier, number>

type Placed = PhaseNode & SimulationNodeDatum & { x: number; y: number; r: number; lane: number }

function visibleNetwork(phase: PhaseId, now: Date, narrativeIds: ReadonlySet<string>) {
  const edges = PHASE_NETWORKS[phase].edges.filter((edge) => isSeen(edge.firstSeen, now) && narrativeIds.has(edge.narrative))
  const ids = new Set(edges.flatMap((edge) => [edge.source, edge.target]))
  const nodes = PHASE_NETWORKS[phase].nodes
    .filter((node) => ids.has(node.id))
    .map((node) => ({
      ...node,
      narratives: node.narratives.filter((id) => edges.some((edge) => edge.narrative === id && (edge.source === node.id || edge.target === node.id))),
      firstSeen: edges.filter((edge) => edge.source === node.id || edge.target === node.id).map((edge) => edge.firstSeen).sort()[0],
    }))
  return { nodes, edges }
}

/** Puts each node in the lane it carried most, spreading ties so one lane does not take every shared node. */
function assignLanes(nodes: PhaseNode[], edges: PhaseEdge[], lanes: Narrative[]) {
  const assigned = new Map<string, number>()
  const load = new Map<string, number>()
  for (const node of nodes) {
    const counts = lanes.map((lane) => edges.filter((edge) => edge.narrative === lane.id && (edge.source === node.id || edge.target === node.id)).length)
    const most = Math.max(0, ...counts)
    let lane = lanes.length
    if (most > 0) {
      const tied = counts.flatMap((count, i) => (count === most ? [i] : []))
      lane = tied.reduce((best, i) => ((load.get(`${node.tier}:${i}`) ?? 0) < (load.get(`${node.tier}:${best}`) ?? 0) ? i : best), tied[0])
    }
    assigned.set(node.id, lane)
    load.set(`${node.tier}:${lane}`, (load.get(`${node.tier}:${lane}`) ?? 0) + 1)
  }
  return assigned
}

function layout(nodes: PhaseNode[], lanesById: Map<string, number>, laneOrder: number[], laneHeight: number) {
  const row = (lane: number) => Math.max(0, laneOrder.indexOf(lane))
  const placed: Placed[] = nodes.map((node) => {
    const lane = row(lanesById.get(node.id) ?? 0)
    return { ...node, lane, r: 4 + 22 * Math.pow(node.influence / 100, 1.6), x: COLUMN_X[node.tier], y: TOP + laneHeight * (lane + 0.5) }
  })
  forceSimulation(placed)
    .force('x', forceX<Placed>((node) => COLUMN_X[node.tier]).strength(0.3))
    .force('y', forceY<Placed>((node) => TOP + laneHeight * (node.lane + 0.5)).strength(0.25))
    .force('collide', forceCollide<Placed>((node) => node.r + 7).iterations(3))
    .stop()
    .tick(220)
  for (const node of placed) {
    const reach = node.tier === 'mainstream' ? 0 : 52
    node.x = Math.max(COLUMN_X[node.tier] - reach, Math.min(COLUMN_X[node.tier] + reach, node.x))
    node.y = Math.max(TOP + 20, Math.min(H - 14, node.y))
  }
  const labelled = placed.filter((node) => node.tier === 'mainstream').sort((a, b) => a.y - b.y)
  labelled.forEach((node, i) => {
    if (i > 0) node.y = Math.max(node.y, labelled[i - 1].y + 24)
  })
  return new Map(placed.map((node) => [node.id, node]))
}

interface Props {
  phase: PhaseId
  now: Date
  narratives: Narrative[]
  highlighted: string | null
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function PhaseNetwork({ phase, now, narratives, highlighted, selectedId, onSelect }: Props) {
  const [view, setView] = useState<'graph' | 'table'>('graph')
  const [hoverId, setHoverId] = useState<string | null>(null)
  const nowDay = now.toDateString()
  const narrativeKey = narratives.map((item) => item.id).join(',')
  const { nodes, edges } = useMemo(
    () => visibleNetwork(phase, now, new Set(narratives.map((item) => item.id))),
    // The network only changes when the day or the narrative filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, nowDay, narrativeKey],
  )
  const lanes = narratives.slice(0, 4)
  const lanesById = useMemo(() => assignLanes(nodes, edges, lanes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges, narrativeKey])
  const hasOther = [...lanesById.values()].some((lane) => lane === lanes.length)
  const laneOrder = [...lanes.map((_, i) => i), ...(hasOther ? [lanes.length] : [])]
  const laneHeight = (H - TOP) / Math.max(1, laneOrder.length)
  const placed = useMemo(() => layout(nodes, lanesById, laneOrder, laneHeight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, lanesById, laneHeight])
  const hovered = hoverId ? placed.get(hoverId) : null
  const labelOf = (id: string) => narratives.find((item) => item.id === id)?.label ?? id
  const active = highlighted ? new Set(edges.filter((edge) => edge.narrative === highlighted).flatMap((edge) => [edge.source, edge.target])) : null

  return (
    <section className="graph-panel phase-graph" aria-label="Network analysis">
      <div className="view-toggle" role="group" aria-label="Network view">
        <button type="button" aria-pressed={view === 'graph'} onClick={() => setView('graph')}>Graph</button>
        <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
      </div>
      {view === 'graph' ? (
        <div className="graph-wrap">
          <div className="phase-graph-scroll">
            <div className="phase-graph-inner">
              <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Network graph with ${nodes.length} nodes and ${edges.length} links. Use the table view for a text version.`} onClick={() => onSelect(null)}>
                {COLUMNS.map((column) => (
                  <g key={column.id} transform={`translate(${column.x},20)`}>
                    <path d={tierShape(column.id, 5)} transform="translate(0,-4)" className={`tier-fill-${column.id}`} />
                    <text y={16} textAnchor="middle" className="tier-label">{column.label}</text>
                  </g>
                ))}
                {[...lanes.map((item) => item.label), ...(hasOther ? ['Other narratives'] : [])].map((label, i) => (
                  <g key={label}>
                    {i > 0 && <line x1={10} x2={W - 10} y1={TOP + laneHeight * i} y2={TOP + laneHeight * i} className="lane-line" />}
                    <text x={10} y={TOP + laneHeight * i + 13} className="lane-label">{label.length > 32 ? `${label.slice(0, 31)}…` : label}</text>
                  </g>
                ))}
                {edges.map((edge, i) => {
                  const source = placed.get(edge.source)
                  const target = placed.get(edge.target)
                  if (!source || !target) return null
                  const onPath = highlighted === edge.narrative
                  const mid = (source.x + target.x) / 2
                  return <path key={`${edge.narrative}-${i}`} d={`M${source.x},${source.y}C${mid},${source.y} ${mid},${target.y} ${target.x},${target.y}`} className={`edge ${onPath ? 'edge-path' : ''} ${highlighted && !onPath ? 'edge-dim' : ''}`} />
                })}
                {[...placed.values()].map((node) => {
                  const dimmed = Boolean(active) && !active!.has(node.id)
                  const label = node.tier === 'origin' || node.tier === 'mainstream' || node.id === selectedId || Boolean(active?.has(node.id) && node.tier !== 'amplification')
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x},${node.y})`}
                      className={`node active ${dimmed ? 'dimmed' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${node.name}, ${node.kind}`}
                      aria-pressed={selectedId === node.id}
                      onMouseEnter={() => setHoverId(node.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onFocus={() => setHoverId(node.id)}
                      onBlur={() => setHoverId(null)}
                      onClick={(event) => { event.stopPropagation(); onSelect(selectedId === node.id ? null : node.id) }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(selectedId === node.id ? null : node.id) }
                      }}
                    >
                      <circle r={Math.max(node.r + 5, 12)} className="hit" />
                      {node.cluster && <circle r={node.r + 4} className="cluster-ring" />}
                      {selectedId === node.id && <circle r={node.r + 7} className="selected-ring" />}
                      <path d={tierShape(node.tier, node.r)} className={`shape tier-fill-${node.tier}`} />
                      {label && <text x={node.r + 6} y={4} className="node-label">{node.name}</text>}
                    </g>
                  )
                })}
              </svg>
              {hovered && (
                <div className="graph-tooltip" style={{ left: `${(hovered.x / W) * 100}%`, top: `${(hovered.y / H) * 100}%`, transform: `translate(${hovered.x > W * 0.65 ? '-105%' : '12px'}, ${hovered.y > H * 0.7 ? '-110%' : '10px'})` }}>
                  <strong>{hovered.name}</strong>
                  <span>{hovered.kind}</span>
                  <span>Reach {formatReach(hovered.reach)}</span>
                  <span>First seen {formatDay(hovered.firstSeen)}</span>
                  <span>Carried: {hovered.narratives.map(labelOf).join(', ')}</span>
                  {hovered.cluster && <span className="stage-badge stage-elevated tooltip-badge">Likely bot cluster</span>}
                </div>
              )}
            </div>
          </div>
          <div className="legend" aria-label="Legend">
            {COLUMNS.map((column) => (
              <span key={column.id}>
                <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"><path d={tierShape(column.id, 5)} className={`tier-fill-${column.id}`} /></svg>
                {column.label}
              </span>
            ))}
            <span><svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"><circle r="5" className="cluster-ring" /></svg>Likely bot cluster</span>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <caption>{nodes.length} entities carrying these narratives</caption>
            <thead><tr><th>Name</th><th>Tier</th><th>Kind</th><th className="num">Reach</th><th>First seen</th><th>Narratives</th></tr></thead>
            <tbody>
              {[...nodes].sort((a, b) => b.influence - a.influence).map((node) => (
                <tr key={node.id} className={selectedId === node.id ? 'selected' : ''}>
                  <td><button type="button" className="link" onClick={() => onSelect(node.id)}>{node.name}</button></td>
                  <td>{node.tier}</td>
                  <td>{node.kind}</td>
                  <td className="num">{formatReach(node.reach)}</td>
                  <td className="mono">{node.firstSeen}</td>
                  <td>{node.narratives.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="caveat network-caveat">Attribution to a FIMI source is based on watchlist membership and coordination patterns. It is an assessment, not proof.</p>
    </section>
  )
}

export function nodeTrace(phase: PhaseId, id: string, now: Date, narrativeIds: ReadonlySet<string>) {
  const { nodes, edges } = visibleNetwork(phase, now, narrativeIds)
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const trace: PhaseNode[] = []
  const seen = new Set<string>()
  let current = byId.get(id)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    trace.unshift(current)
    const nodeId = current.id
    const incoming = edges.filter((edge) => edge.target === nodeId).sort((a, b) => a.firstSeen.localeCompare(b.firstSeen))[0]
    current = incoming ? byId.get(incoming.source) : undefined
  }
  return { node: byId.get(id) ?? null, trace }
}
