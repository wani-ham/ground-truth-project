import { forceCollide, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import { useMemo, useState } from 'react'
import { COUNTRIES, MEMBER_STATES, TIERS, type CountryCode, type NetworkEdge, type NetworkNode, type Tier } from '../data/scenario'
import { edgeProgress, formatHour, formatReach, pathToOrigin } from '../engine/playback'

const WIDTH = 1120
const HEIGHT = 660
const TOP = 62
const COLUMN_X: Record<Tier, number> = { origin: 130, laundering: 300, relay: 500, amplification: 725, mainstream: 930 }
const LANE_Y: Record<string, number> = { NV: 135, CS: 280, BM: 425, ZL: 570 }
const CENTER_Y = 352

type Positioned = NetworkNode & SimulationNodeDatum & { x: number; y: number; r: number }

export function tierShape(tier: Tier, r: number): string {
  const polygon = (points: [number, number][]) => `M${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}Z`
  switch (tier) {
    case 'origin':
      return `M${-r},0a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`
    case 'laundering':
      return polygon([[0, -r * 1.2], [r * 1.2, 0], [0, r * 1.2], [-r * 1.2, 0]])
    case 'relay':
      return polygon([[-r * 0.9, -r * 0.9], [r * 0.9, -r * 0.9], [r * 0.9, r * 0.9], [-r * 0.9, r * 0.9]])
    case 'amplification':
      return polygon([[0, -r * 1.15], [r * 1.05, r * 0.8], [-r * 1.05, r * 0.8]])
    case 'mainstream':
      return polygon(
        Array.from({ length: 6 }, (_, i) => {
          const angle = (Math.PI / 3) * i
          return [Math.cos(angle) * r * 1.1, Math.sin(angle) * r * 1.1] as [number, number]
        }),
      )
  }
}

function useLayout(nodes: NetworkNode[]) {
  return useMemo(() => {
    const positioned: Positioned[] = nodes.map((node) => ({
      ...node,
      r: 4 + 22 * Math.pow(node.influence / 100, 1.6),
      x: COLUMN_X[node.tier],
      y: node.country && LANE_Y[node.country] ? LANE_Y[node.country] : CENTER_Y,
    }))
    const laundering = positioned.filter((node) => node.tier === 'laundering')
    laundering.forEach((node, i) => {
      node.y = TOP + 60 + (i * (HEIGHT - TOP - 120)) / (laundering.length - 1)
    })
    const laneTarget = (node: Positioned) =>
      node.tier === 'laundering' ? node.y : node.country && LANE_Y[node.country] ? LANE_Y[node.country] : CENTER_Y

    const targets = new Map(positioned.map((node) => [node.id, laneTarget(node)]))
    forceSimulation(positioned)
      .force('x', forceX<Positioned>((node) => COLUMN_X[node.tier]).strength(0.28))
      .force('y', forceY<Positioned>((node) => targets.get(node.id)!).strength(0.2))
      .force('collide', forceCollide<Positioned>((node) => node.r + 7).iterations(3))
      .stop()
      .tick(320)

    for (const node of positioned) {
      node.x = Math.max(COLUMN_X[node.tier] - 88, Math.min(COLUMN_X[node.tier] + 88, node.x))
      node.y = Math.max(TOP + 16, Math.min(HEIGHT - 18, node.y))
    }
    return new Map(positioned.map((node) => [node.id, node]))
  }, [nodes])
}

interface Props {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  hour: number
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function NetworkGraph({ nodes, edges, hour, selectedId, onSelect }: Props) {
  const layout = useLayout(nodes)
  const [hoverId, setHoverId] = useState<string | null>(null)

  const pathEdges = useMemo(() => {
    if (!selectedId) return new Set<string>()
    const path = pathToOrigin(nodes, selectedId)
    return new Set(path.slice(1).map((node, i) => `${path[i].id}->${node.id}`))
  }, [nodes, selectedId])
  const pathNodes = useMemo(
    () => new Set(selectedId ? pathToOrigin(nodes, selectedId).map((node) => node.id) : []),
    [nodes, selectedId],
  )

  const hovered = hoverId ? layout.get(hoverId) : null
  const activeCount = nodes.filter((node) => node.pickupHour <= hour).length

  return (
    <div className="graph-wrap">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-label={`Network graph: ${activeCount} of ${nodes.length} nodes carrying the narrative. Use the table view for a text version.`}
        onClick={() => onSelect(null)}
      >
        {MEMBER_STATES.map((code: CountryCode) => (
          <g key={code}>
            <line x1={16} x2={WIDTH - 16} y1={LANE_Y[code] + 72} y2={LANE_Y[code] + 72} className="lane-line" />
            <text x={16} y={LANE_Y[code] - 54} className="lane-label">
              {COUNTRIES[code]}
            </text>
          </g>
        ))}

        {TIERS.map((tier, i) => (
          <g key={tier.id} transform={`translate(${COLUMN_X[tier.id]},24)`}>
            <path d={tierShape(tier.id, 5)} transform="translate(0,-4)" className={`tier-fill-${tier.id}`} />
            <text y={16} textAnchor="middle" className="tier-label">
              {tier.label}
            </text>
            {i < TIERS.length - 1 && (
              <text x={(COLUMN_X[TIERS[i + 1].id] - COLUMN_X[tier.id]) / 2} y={16} textAnchor="middle" className="tier-arrow">
                →
              </text>
            )}
          </g>
        ))}

        <g>
          {edges.map((edge) => {
            const source = layout.get(edge.source)!
            const target = layout.get(edge.target)!
            const progress = edgeProgress(source.pickupHour, edge.hour, hour)
            if (progress <= 0) return null
            const onPath = pathEdges.has(edge.id)
            const mid = (source.x + target.x) / 2
            const fresh = progress < 1
            return (
              <path
                key={edge.id}
                d={`M${source.x},${source.y}C${mid},${source.y} ${mid},${target.y} ${target.x},${target.y}`}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - progress}
                className={`edge ${onPath ? 'edge-path' : ''} ${fresh ? 'edge-fresh' : ''} ${selectedId && !onPath ? 'edge-dim' : ''}`}
              />
            )
          })}
        </g>

        <g>
          {nodes.map((raw) => {
            const node = layout.get(raw.id)!
            const active = node.pickupHour <= hour
            const justActive = active && hour - node.pickupHour < 4
            const dimmed = Boolean(selectedId) && !pathNodes.has(node.id)
            const showLabel = active && (node.tier === 'origin' || node.tier === 'mainstream' || pathNodes.has(node.id))
            const labelRight = node.tier !== 'origin'
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                className={`node ${active ? 'active' : 'pending'} ${dimmed ? 'dimmed' : ''}`}
                role={active ? 'button' : undefined}
                tabIndex={active ? 0 : undefined}
                aria-label={active ? `${node.name}, ${node.kind}` : undefined}
                aria-pressed={active ? selectedId === node.id : undefined}
                onMouseEnter={() => setHoverId(node.id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(node.id)}
                onBlur={() => setHoverId(null)}
                onClick={(event) => {
                  event.stopPropagation()
                  if (active) onSelect(selectedId === node.id ? null : node.id)
                }}
                onKeyDown={(event) => {
                  if (active && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    onSelect(selectedId === node.id ? null : node.id)
                  }
                }}
              >
                <circle r={Math.max(node.r + 5, 12)} className="hit" />
                {justActive && <circle r={node.r + (hour - node.pickupHour) * 3} className="pulse" opacity={1 - (hour - node.pickupHour) / 4} />}
                {node.messageCluster && active && <circle r={node.r + 4} className="cluster-ring" />}
                {selectedId === node.id && <circle r={node.r + 7} className="selected-ring" />}
                <path d={tierShape(node.tier, node.r)} className={active ? `shape tier-fill-${node.tier}` : 'shape shape-pending'} />
                {showLabel && (
                  <text
                    x={labelRight ? node.r + 7 : 0}
                    y={labelRight ? 4 : node.r + 17}
                    textAnchor={labelRight ? 'start' : 'middle'}
                    className="node-label"
                  >
                    {node.name}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      <div className="legend" aria-label="Legend">
        {TIERS.map((tier) => (
          <span key={tier.id} title={tier.description}>
            <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <path d={tierShape(tier.id, 5)} className={`tier-fill-${tier.id}`} />
            </svg>
            {tier.label}
          </span>
        ))}
        <span>
          <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
            <circle r="5" className="cluster-ring" />
          </svg>
          Coordinated cluster
        </span>
        <span className="legend-note" title="Combines audience size with how many entities it passed the claim on to">
          Size shows influence
        </span>
      </div>

      {hovered && (
        <div
          className="graph-tooltip"
          style={{
            left: `${(hovered.x / WIDTH) * 100}%`,
            top: `${(hovered.y / HEIGHT) * 100}%`,
            transform: `translate(${hovered.x > WIDTH * 0.7 ? '-105%' : '12px'}, ${hovered.y > HEIGHT * 0.75 ? '-110%' : '10px'})`,
          }}
        >
          {hovered.pickupHour <= hour ? (
            <>
              <strong>{hovered.name}</strong>
              <span>{hovered.kind}{hovered.country ? `, ${COUNTRIES[hovered.country]}` : ''}</span>
              <span>Influence {hovered.influence}/100</span>
              <span>Reach {formatReach(hovered.reach)}, {hovered.downstream} downstream</span>
              <span>Picked up {formatHour(hovered.pickupHour)}</span>
            </>
          ) : (
            <span>Not yet carrying the narrative</span>
          )}
        </div>
      )}
    </div>
  )
}
