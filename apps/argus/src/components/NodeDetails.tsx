import { COUNTRIES, TIERS, type NetworkNode } from '../data/scenario'
import { formatHour, formatReach, pathToOrigin } from '../engine/playback'

interface Props {
  node: NetworkNode | null
  nodes: NetworkNode[]
  onSelect: (id: string | null) => void
}

export function NodeDetails({ node, nodes, onSelect }: Props) {
  if (!node) {
    return (
      <section className="panel details empty" aria-label="Node details">
        <h2>Trace a node</h2>
        <p>Select any lit node to trace how the narrative reached it.</p>
      </section>
    )
  }

  const path = pathToOrigin(nodes, node.id)
  const tier = TIERS.find((item) => item.id === node.tier)!

  return (
    <section className="panel details" aria-label="Node details">
      <div className="panel-head">
        <h2>{node.name}</h2>
        <button type="button" className="ghost" aria-label="Clear selection" onClick={() => onSelect(null)}>
          ✕
        </button>
      </div>
      <dl>
        <div><dt>Role</dt><dd>{tier.label}, {node.kind.toLowerCase()}</dd></div>
        <div><dt>Country</dt><dd>{node.country ? COUNTRIES[node.country] : 'Unattributed'}</dd></div>
        <div><dt>Influence</dt><dd>{node.influence}/100</dd></div>
        <div><dt>Downstream</dt><dd>{node.downstream} entities</dd></div>
        <div><dt>Reach</dt><dd>{formatReach(node.reach)}</dd></div>
        <div><dt>First pickup</dt><dd>{formatHour(node.pickupHour)}</dd></div>
      </dl>
      <h3>Path to origin</h3>
      <ol className="trace">
        {path.map((step) => (
          <li key={step.id}>
            <button type="button" className="link" onClick={() => onSelect(step.id)}>
              {step.name}
            </button>
            <span>{formatHour(step.pickupHour)}</span>
          </li>
        ))}
      </ol>
      {node.tier !== 'origin' && <p className="caveat">Repeating a claim does not by itself show intent to deceive.</p>}
    </section>
  )
}
