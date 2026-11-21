import { DURATION_HOURS, type NetworkNode } from '../data/scenario'

export const EDGE_TRAVEL_HOURS = 3

const MAX_FRAME_MS = 100

/**
 * Moves playback forward by one frame. A frame's timestamp can precede the clock
 * reading taken when playback started, so negative elapsed time counts as zero.
 */
export function advanceHour(hour: number, elapsedMs: number, hoursPerSecond: number): number {
  const elapsed = Math.max(0, Math.min(elapsedMs, MAX_FRAME_MS)) / 1000
  return Math.min(DURATION_HOURS, hour + elapsed * hoursPerSecond)
}

export function formatHour(hour: number): string {
  const whole = Math.min(Math.floor(hour), DURATION_HOURS - 1)
  const day = Math.floor(whole / 24) + 1
  const clock = String(whole % 24).padStart(2, '0')
  return `Day ${day}, ${clock}:00`
}

/** An edge never starts drawing before its source is carrying the narrative. */
export function edgeProgress(sourceHour: number, pickupHour: number, hour: number): number {
  const start = Math.max(sourceHour, pickupHour - EDGE_TRAVEL_HOURS)
  return Math.max(0, Math.min(1, (hour - start) / Math.max(pickupHour - start, 0.01)))
}

/** Follows each node's primary source back to the origin, returned origin first. */
export function pathToOrigin(nodes: NetworkNode[], id: string): NetworkNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const path: NetworkNode[] = []
  const seen = new Set<string>()
  let current = byId.get(id)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    path.unshift(current)
    current = current.sources[0] ? byId.get(current.sources[0]) : undefined
  }
  return path
}

export function dailyPickups(nodes: NetworkNode[], duration = DURATION_HOURS): number[] {
  const days = Array.from({ length: Math.ceil(duration / 24) }, () => 0)
  for (const node of nodes) {
    const day = Math.min(days.length - 1, Math.floor(node.pickupHour / 24))
    days[day] += 1
  }
  return days
}

export function formatReach(reach: number): string {
  if (reach >= 1_000_000) return `${(reach / 1_000_000).toFixed(1)}M`
  return `${Math.round(reach / 1_000)}K`
}
