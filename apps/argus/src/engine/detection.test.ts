import { describe, expect, it } from 'vitest'
import { DURATION_HOURS, EDGES, NODES, type NetworkNode } from '../data/scenario'
import {
  STAGES,
  buildTimeline,
  firstElitePickup,
  firstHourAtStage,
  readSignals,
  stageFor,
} from './detection'
import { advanceHour, dailyPickups, pathToOrigin } from './playback'

const timeline = buildTimeline(NODES)

describe('scenario integrity', () => {
  it('has about 60 nodes with unique ids', () => {
    expect(NODES.length).toBeGreaterThanOrEqual(55)
    expect(new Set(NODES.map((node) => node.id)).size).toBe(NODES.length)
  })

  it('only receives a narrative from sources that already carried it', () => {
    const byId = new Map(NODES.map((node) => [node.id, node]))
    for (const edge of EDGES) {
      expect(byId.get(edge.source)!.pickupHour).toBeLessThan(edge.hour)
    }
  })

  it('finishes spreading inside the timeline', () => {
    for (const node of NODES) expect(node.pickupHour).toBeLessThan(DURATION_HOURS)
  })

  it('mixes tiers in time instead of completing one before the next', () => {
    const hours = (tier: NetworkNode['tier']) => NODES.filter((node) => node.tier === tier).map((node) => node.pickupHour)
    expect(Math.min(...hours('amplification'))).toBeLessThan(Math.max(...hours('relay')))
    expect(Math.min(...hours('relay'))).toBeLessThan(Math.max(...hours('laundering')))
  })

  it('makes the origin the most influential node', () => {
    expect(NODES.find((node) => node.id === 'origin')!.influence).toBe(100)
  })

  it('ranks national broadcasters above every proxy site', () => {
    const broadcasters = NODES.filter((node) => node.kind === 'Broadcaster').map((node) => node.influence)
    const proxies = NODES.filter((node) => node.tier === 'laundering').map((node) => node.influence)
    expect(Math.min(...broadcasters)).toBeGreaterThan(Math.max(...proxies))
  })

  it('traces every node back to the origin', () => {
    for (const node of NODES) expect(pathToOrigin(NODES, node.id)[0].id).toBe('origin')
  })

  it('counts every node exactly once in the daily histogram', () => {
    expect(dailyPickups(NODES).reduce((sum, count) => sum + count, 0)).toBe(NODES.length)
  })
})

describe('playback clock', () => {
  it('does not move backward when a frame is stamped before playback started', () => {
    expect(advanceHour(0, -40, 8)).toBe(0)
  })

  it('advances by elapsed time, capping long frames and the end of the timeline', () => {
    expect(advanceHour(10, 50, 8)).toBeCloseTo(10.4)
    expect(advanceHour(10, 5000, 8)).toBeCloseTo(10.8)
    expect(advanceHour(DURATION_HOURS, 50, 8)).toBe(DURATION_HOURS)
  })
})

describe('signals', () => {
  it('starts quiet', () => {
    expect(timeline[0].stage).toBe('Monitor')
    expect(timeline[0].composite).toBe(0)
  })

  it('detects the coordinated burst', () => {
    const hours = NODES.filter((node) => node.messageCluster).map((node) => node.pickupHour)
    expect(readSignals(NODES, Math.min(...hours) - 1).coordination.score).toBe(0)
    expect(readSignals(NODES, Math.max(...hours)).coordination.score).toBe(100)
  })

  it('ignores coordinated posts spread beyond the 12 hour window', () => {
    const spread: NetworkNode[] = Array.from({ length: 12 }, (_, i) => ({
      id: `x${i}`,
      name: 'x',
      kind: 'x',
      tier: 'amplification',
      country: 'NV',
      reach: 1,
      pickupHour: i * 24,
      sources: [],
      messageCluster: 'a',
      downstream: 0,
      influence: 0,
    }))
    expect(readSignals(spread, 264).coordination.score).toBeLessThan(10)
  })
})

describe('alert stages', () => {
  it('maps thresholds to stages', () => {
    expect(stageFor(34, 0)).toBe('Monitor')
    expect(stageFor(35, 0)).toBe('Elevated')
    expect(stageFor(74, 0)).toBe('Elevated')
    expect(stageFor(75, 0)).toBe('Warning')
    expect(stageFor(75, 1)).toBe('Critical')
    expect(stageFor(20, 3)).toBe('Monitor')
  })

  it('never steps back down', () => {
    for (let i = 1; i < timeline.length; i += 1) {
      expect(STAGES.indexOf(timeline[i].stage)).toBeGreaterThanOrEqual(STAGES.indexOf(timeline[i - 1].stage))
    }
  })

  it('fires Warning before the first politician or broadcaster pickup', () => {
    const warning = firstHourAtStage(timeline, 'Warning')!
    const elite = firstElitePickup(NODES)!
    expect(warning).toBeLessThan(elite)
    expect(timeline[warning].stage).toBe('Warning')
  })

  it('needs coordination evidence before Warning', () => {
    const warning = firstHourAtStage(timeline, 'Warning')!
    expect(timeline[warning].signals.coordination.score).toBeGreaterThan(0)
  })

  it('reaches Critical once elites pick it up', () => {
    expect(firstHourAtStage(timeline, 'Critical')).toBe(Math.ceil(firstElitePickup(NODES)!))
    expect(timeline[DURATION_HOURS].stage).toBe('Critical')
  })
})
