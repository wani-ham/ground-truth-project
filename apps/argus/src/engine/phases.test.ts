import { describe, expect, it } from 'vitest'
import {
  ACTIONED_SERIES,
  CAMPAIGN_TOPICS,
  CONFIDENCE,
  ELECTION_HOURLY,
  FLAGGED_ACCOUNTS,
  HEADLINE_SERIES,
  INDICATOR_SCORES,
  NARRATIVES,
  NEW_FLAGGED,
  PHASES,
  PHASE_IDS,
  PHASE_NETWORKS,
  REPORTED_SERIES,
  VOLUME,
  WEEKS,
} from '../data/election'
import {
  allReadings,
  countdownView,
  currentPhase,
  defaultReportIds,
  estimateStart,
  flaggedSummary,
  movingTowards,
  phaseReading,
  postsThroughWeek,
  precursorWeek,
  reportRef,
  reportSchedule,
  statusFor,
  visibleNarratives,
  weekIndexFor,
  weightedConfidence,
  type PhaseReading,
} from './phases'

const reading = (phase: 1 | 2 | 3, confidence: number): PhaseReading => ({
  phase,
  confidence,
  status: statusFor(confidence),
  delta: 0,
  start: null,
  precursor: null,
  scores: [],
})

const DEFAULT = new Date('2027-02-14T10:00:00')
const EARLY = new Date('2026-12-15T10:00:00')
const AFTER = new Date('2027-03-09T10:00:00')

describe('confidence', () => {
  it('applies the weights', () => {
    expect(weightedConfidence([100, 50, 0, 20], [0.35, 0.3, 0.2, 0.15])).toBe(53)
  })

  it('reproduces the published series at every week', () => {
    for (const phase of PHASE_IDS) {
      const weights = PHASES[phase - 1].indicators.map((item) => item.weight)
      expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
      WEEKS.forEach((_, week) => {
        expect(weightedConfidence(INDICATOR_SCORES[phase][week], weights)).toBe(CONFIDENCE[phase][week])
      })
    }
  })

  it('keeps the phase 1 source score tied to narratives already seen', () => {
    WEEKS.forEach((week, i) => {
      const sunday = new Date(`${week}T00:00:00`)
      sunday.setDate(sunday.getDate() + 6)
      const seen = NARRATIVES.filter((item) => item.phase === 1 && new Date(`${item.firstSeen}T00:00:00`) <= sunday).length
      expect(INDICATOR_SCORES[1][i][0]).toBe(seen === 0 ? 0 : seen === 1 ? 33 : seen === 2 ? 67 : 100)
    })
  })

  it.each([[29, 'Not detected'], [30, 'Emerging'], [59, 'Emerging'], [60, 'Active'], [89, 'Active'], [90, 'Peak']])(
    'maps %i to %s',
    (value, status) => expect(statusFor(value)).toBe(status),
  )
})

describe('start estimates', () => {
  it('uses the first week at 60 with a 3-day margin after a fast rise', () => {
    expect(estimateStart(CONFIDENCE[1], 14)).toEqual({ week: '2026-11-30', marginDays: 3 })
    expect(estimateStart(CONFIDENCE[2], 14)).toEqual({ week: '2027-01-18', marginDays: 3 })
  })

  it('uses a 5-day margin after a slower rise', () => {
    expect(estimateStart(CONFIDENCE[3], 18)).toEqual({ week: '2027-02-22', marginDays: 5 })
  })

  it('ignores weeks after the scenario date', () => {
    expect(estimateStart(CONFIDENCE[3], 14)).toBeNull()
    expect(precursorWeek(CONFIDENCE[3], 14)).toBe('2027-01-25')
  })
})

describe('phase rules', () => {
  it('shows the banner only when the previous phase is live', () => {
    expect(movingTowards([reading(1, 96), reading(2, 84), reading(3, 41)])?.phase).toBe(3)
    expect(movingTowards([reading(1, 40), reading(2, 40), reading(3, 10)])).toBeNull()
    expect(movingTowards([reading(1, 88), reading(2, 15), reading(3, 4)])).toBeNull()
  })

  it('picks the latest live phase as current', () => {
    expect(currentPhase(allReadings(6))).toBe(1)
    expect(currentPhase(allReadings(14))).toBe(2)
    expect(currentPhase(allReadings(18))).toBe(3)
    expect(currentPhase([reading(1, 35), reading(2, 5), reading(3, 2)])).toBe(1)
    expect(currentPhase([reading(1, 5), reading(2, 5), reading(3, 2)])).toBeNull()
  })

  it('finds the week containing a date', () => {
    expect(weekIndexFor(EARLY)).toBe(6)
    expect(weekIndexFor(DEFAULT)).toBe(14)
    expect(weekIndexFor(AFTER)).toBe(18)
    expect(weekIndexFor(new Date('2027-02-15T00:00:00'))).toBe(15)
    expect(weekIndexFor(new Date('2026-10-01T00:00:00'))).toBe(0)
    expect(weekIndexFor(new Date('2027-05-01T00:00:00'))).toBe(21)
  })

  it('matches the preset table', () => {
    expect(allReadings(6).map((item) => [item.confidence, item.status])).toEqual([[88, 'Active'], [15, 'Not detected'], [4, 'Not detected']])
    expect(allReadings(14).map((item) => [item.confidence, item.status])).toEqual([[96, 'Peak'], [84, 'Active'], [41, 'Emerging']])
    expect(allReadings(18).map((item) => [item.confidence, item.status])).toEqual([[97, 'Peak'], [90, 'Peak'], [93, 'Peak']])
    expect(phaseReading(3, 14).delta).toBe(3)
  })
})

describe('countdown', () => {
  it.each([
    ['2027-02-14T10:00:00', 'before', '20d 21h 00m 00s'],
    ['2027-03-07T12:00:00', 'polls-open', 'Closes in 10h 00m 00s'],
    ['2027-03-09T10:00:00', 'certifying', 'Certified in 8d 02h'],
    ['2027-03-20T12:00:00', 'certified', '+3 days'],
  ])('at %s shows %s', (date, state, main) => {
    const view = countdownView(new Date(date))
    expect(view.state).toBe(state)
    expect(view.main).toBe(main)
  })
})

describe('reports', () => {
  it('numbers reports from 2 Nov', () => {
    const schedule = reportSchedule(DEFAULT)
    expect(schedule.lastNumber).toBe(15)
    expect(schedule.nextNumber).toBe(16)
    expect(schedule.nextAt.getTime()).toBe(new Date('2027-02-15T08:00:00').getTime())
    expect(reportRef(16).coveredWeek).toBe(14)
  })

  it('includes the top 5 narratives per phase by default', () => {
    expect(defaultReportIds(DEFAULT).size).toBe(12)
  })
})

describe('flagged accounts', () => {
  it('generates the end-of-period total', () => {
    expect(FLAGGED_ACCOUNTS).toHaveLength(3170)
  })

  it('matches every series at every week', () => {
    WEEKS.forEach((_, week) => {
      const summary = flaggedSummary(week, new Set())
      expect(summary.total).toBe(HEADLINE_SERIES[week])
      expect(summary.reported).toBe(REPORTED_SERIES[week])
      expect(summary.actioned).toBe(ACTIONED_SERIES[week])
      for (const phase of PHASE_IDS) {
        expect(summary.byPhase[phase]).toBe(NEW_FLAGGED[phase].slice(0, week + 1).reduce((a, b) => a + b, 0))
      }
      expect(Object.values(summary.byPlatform).reduce((a, b) => a + b, 0)).toBe(summary.total)
      expect(Object.values(summary.byConfidence).reduce((a, b) => a + b, 0)).toBe(summary.total)
    })
  })

  it('matches the default preset breakdown', () => {
    const summary = flaggedSummary(14, new Set())
    expect(summary.total).toBe(1950)
    expect(summary.byPlatform).toEqual({ X: 722, Telegram: 507, TikTok: 409, Facebook: 234, YouTube: 78 })
    expect(summary.byConfidence).toEqual({ High: 566, Medium: 897, Low: 487 })
    expect(summary.byStatus).toEqual({ 'Not reported': 770, Reported: 540, Actioned: 640 })
  })

  it('moves session reports from not reported to reported', () => {
    const open = FLAGGED_ACCOUNTS.filter((account) => account.firstWeek <= 14 && (account.reportedWeek === undefined || account.reportedWeek > 14)).slice(0, 48)
    const summary = flaggedSummary(14, new Set(open.map((account) => account.id)))
    expect(summary.byStatus['Not reported']).toBe(722)
    expect(summary.byStatus.Reported).toBe(588)
  })
})

describe('scenario consistency', () => {
  it('never shows a narrative before it is first seen', () => {
    expect(visibleNarratives(3, DEFAULT).map((item) => item.id).sort()).toEqual(['p3n1', 'p3n2'])
    expect(visibleNarratives(2, EARLY)).toHaveLength(0)
  })

  it('assigns no posts to a narrative before its first week', () => {
    for (const narrative of NARRATIVES) {
      narrative.weekly.forEach((posts, week) => {
        if (WEEKS[week + 1] && WEEKS[week + 1] <= narrative.firstSeen) expect(posts).toBe(0)
      })
    }
  })

  it('counts 2,480 integrity posts at the default date', () => {
    const total = visibleNarratives(3, DEFAULT).reduce((sum, item) => sum + postsThroughWeek(item, 14), 0)
    expect(total).toBe(2480)
  })

  it('keeps hourly election posts inside the weekly volumes', () => {
    expect(ELECTION_HOURLY).toHaveLength(48)
    expect(ELECTION_HOURLY.slice(0, 18).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(VOLUME[3][17])
    expect(ELECTION_HOURLY.slice(18).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(VOLUME[3][18])
  })

  it('has topic shares that sum to 100%', () => {
    expect(CAMPAIGN_TOPICS.reduce((sum, topic) => sum + topic.mainstreamShare, 0)).toBeCloseTo(1)
    expect(CAMPAIGN_TOPICS.reduce((sum, topic) => sum + topic.fimiShare, 0)).toBeCloseTo(1)
  })

  it('builds networks of about 25 nodes with valid edges', () => {
    for (const phase of PHASE_IDS) {
      const { nodes, edges } = PHASE_NETWORKS[phase]
      const ids = new Set(nodes.map((node) => node.id))
      expect(nodes.length).toBeGreaterThanOrEqual(20)
      expect(nodes.length).toBeLessThanOrEqual(30)
      for (const edge of edges) expect(ids.has(edge.source) && ids.has(edge.target)).toBe(true)
    }
  })
})
