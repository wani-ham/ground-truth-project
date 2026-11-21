import { COUNTRIES, TIERS, type NetworkNode } from '../data/scenario'
import { formatHour, formatReach } from '../engine/playback'

interface Props {
  nodes: NetworkNode[]
  hour: number
  selectedId: string | null
  onSelect: (id: string) => void
}

export function NetworkTable({ nodes, hour, selectedId, onSelect }: Props) {
  const rows = nodes.filter((node) => node.pickupHour <= hour).sort((a, b) => a.pickupHour - b.pickupHour)
  const tierLabel = (id: NetworkNode['tier']) => TIERS.find((tier) => tier.id === id)!.label

  return (
    <div className="table-wrap">
      <table>
        <caption>Entities carrying the narrative at the current time</caption>
        <thead>
          <tr>
            <th scope="col">Picked up</th>
            <th scope="col">Entity</th>
            <th scope="col">Tier</th>
            <th scope="col">Country</th>
            <th scope="col" className="num">Influence</th>
            <th scope="col" className="num">Downstream</th>
            <th scope="col" className="num">Reach</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((node) => (
            <tr key={node.id} className={selectedId === node.id ? 'selected' : ''}>
              <td>{formatHour(node.pickupHour)}</td>
              <td>
                <button type="button" className="link" onClick={() => onSelect(node.id)}>
                  {node.name}
                </button>
              </td>
              <td>{tierLabel(node.tier)}</td>
              <td>{node.country ? COUNTRIES[node.country] : 'Unattributed'}</td>
              <td className="num">{node.influence}</td>
              <td className="num">{node.downstream}</td>
              <td className="num">{formatReach(node.reach)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
