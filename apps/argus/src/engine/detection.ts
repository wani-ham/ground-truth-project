import { DURATION_HOURS, MEMBER_STATES, type NetworkNode } from '../data/scenario'

export type SignalId = 'laundering' | 'crossBorder' | 'coordination' | 'velocity' | 'elite'
export type AlertStage = 'Monitor' | 'Elevated' | 'Warning' | 'Critical'

export interface SignalReading {
  score: number
  detail: string
}

export interface Snapshot {
  hour: number
  signals: Record<SignalId, SignalReading>
  /** Early-warning score, which deliberately excludes elite pickup. */
  composite: number
  stage: AlertStage
}

export const SIGNAL_META: { id: SignalId; label: string; description: string }[] = [
  { id: 'laundering', label: 'Source laundering', description: 'Proxy sites obscure where the story began' },
  { id: 'crossBorder', label: 'Cross-border jump', description: 'Member states reached within 72 hours' },
  { id: 'coordination', label: 'Coordination', description: 'Near-identical posts within 12 hours' },
  { id: 'velocity', label: 'Velocity', description: 'New pickups versus the prior baseline' },
  { id: 'elite', label: 'Elite pickup', description: 'Politicians and broadcasters repeating it' },
]

export const STAGES: AlertStage[] = ['Monitor', 'Elevated', 'Warning', 'Critical']
export const ELEVATED_THRESHOLD = 35
/** Set above the 70 that non-coordinated signals can reach, so Warning requires coordination. */
export const WARNING_THRESHOLD = 75

const WEIGHTS = { laundering: 0.2, crossBorder: 0.25, coordination: 0.3, velocity: 0.25 }
const PROXY_FULL_SCORE = 6
const COORDINATED_FULL_SCORE = 12
const ELITE_FULL_SCORE = 4
const MIN_RECENT_PICKUPS = 5

const clampScore = (value: number) => Math.max(0, Math.min(100, value))
const within = (node: NetworkNode, afterHour: number, untilHour: number) =>
  node.pickupHour > afterHour && node.pickupHour <= untilHour

export function readSignals(nodes: NetworkNode[], hour: number): Record<SignalId, SignalReading> {
  const active = nodes.filter((node) => node.pickupHour <= hour)

  const proxies = active.filter((node) => node.tier === 'laundering').length

  const memberStates = new Set(
    active
      .filter((node) => node.pickupHour > hour - 72 && node.country && MEMBER_STATES.includes(node.country))
      .map((node) => node.country),
  ).size

  const clusterCounts = new Map<string, number>()
  for (const node of active) {
    if (node.messageCluster && node.pickupHour > hour - 12) {
      clusterCounts.set(node.messageCluster, (clusterCounts.get(node.messageCluster) ?? 0) + 1)
    }
  }
  const coordinated = Math.max(0, ...clusterCounts.values())

  const recent = nodes.filter((node) => within(node, hour - 24, hour)).length
  const prior = nodes.filter((node) => within(node, hour - 72, hour - 24)).length
  const baseline = prior / 2
  const ratio = recent / Math.max(baseline, 1)
  const velocity = recent < MIN_RECENT_PICKUPS ? 0 : clampScore(((ratio - 1) / 3) * 100)

  const elites = active.filter((node) => node.tier === 'mainstream').length

  return {
    laundering: {
      score: clampScore((proxies / PROXY_FULL_SCORE) * 100),
      detail: `${proxies} proxy ${proxies === 1 ? 'site' : 'sites'} carrying the claim`,
    },
    crossBorder: {
      score: clampScore(((memberStates - 1) / (MEMBER_STATES.length - 1)) * 100),
      detail: `${memberStates} of ${MEMBER_STATES.length} member states in 72 hours`,
    },
    coordination: {
      score: clampScore((coordinated / COORDINATED_FULL_SCORE) * 100),
      detail: `${coordinated} matching ${coordinated === 1 ? 'post' : 'posts'} in 12 hours`,
    },
    velocity: {
      score: velocity,
      detail: `${recent} pickups in 24 hours, ${ratio.toFixed(1)}× baseline`,
    },
    elite: {
      score: clampScore((elites / ELITE_FULL_SCORE) * 100),
      detail: `${elites} elite ${elites === 1 ? 'pickup' : 'pickups'}`,
    },
  }
}

export function compositeScore(signals: Record<SignalId, SignalReading>): number {
  return (
    signals.laundering.score * WEIGHTS.laundering +
    signals.crossBorder.score * WEIGHTS.crossBorder +
    signals.coordination.score * WEIGHTS.coordination +
    signals.velocity.score * WEIGHTS.velocity
  )
}

export function stageFor(composite: number, elitePickups: number): AlertStage {
  if (composite >= WARNING_THRESHOLD) return elitePickups > 0 ? 'Critical' : 'Warning'
  if (composite >= ELEVATED_THRESHOLD) return 'Elevated'
  return 'Monitor'
}

/** One snapshot per hour. Scores hold their peak so an alert never silently clears. */
export function buildTimeline(nodes: NetworkNode[], duration = DURATION_HOURS): Snapshot[] {
  const snapshots: Snapshot[] = []
  let peak: Record<SignalId, SignalReading> | null = null

  for (let hour = 0; hour <= duration; hour += 1) {
    const current = readSignals(nodes, hour)
    const previous: Record<SignalId, SignalReading> | null = peak
    const next = { ...current }
    if (previous) {
      for (const id of Object.keys(current) as SignalId[]) {
        if (previous[id].score > current[id].score) next[id] = previous[id]
      }
    }
    peak = next

    const composite = compositeScore(next)
    const elitePickups = nodes.filter((node) => node.tier === 'mainstream' && node.pickupHour <= hour).length
    snapshots.push({ hour, signals: next, composite, stage: stageFor(composite, elitePickups) })
  }
  return snapshots
}

export function firstHourAtStage(timeline: Snapshot[], stage: AlertStage): number | null {
  const target = STAGES.indexOf(stage)
  return timeline.find((snapshot) => STAGES.indexOf(snapshot.stage) >= target)?.hour ?? null
}

export function firstElitePickup(nodes: NetworkNode[]): number | null {
  const hours = nodes.filter((node) => node.tier === 'mainstream').map((node) => node.pickupHour)
  return hours.length ? Math.min(...hours) : null
}
