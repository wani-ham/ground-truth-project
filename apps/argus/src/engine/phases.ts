import {
  ELECTION,
  FLAGGED_ACCOUNTS,
  HEADLINE_SERIES,
  INDICATOR_SCORES,
  NARRATIVES,
  NEW_FLAGGED,
  PHASES,
  PHASE_IDS,
  PHASE_NETWORKS,
  WEEKS,
  type Confidence,
  type FlaggedAccount,
  type Narrative,
  type PhaseId,
  type PhaseStatus,
  type Platform,
  type ReportStatus,
} from '../data/election'

export const EMERGING_THRESHOLD = 30
export const ACTIVE_THRESHOLD = 60
export const PEAK_THRESHOLD = 90
export const FAST_RISE_POINTS = 25
export const FAST_RISE_MARGIN_DAYS = 3
export const SLOW_RISE_MARGIN_DAYS = 5
export const TOP_NARRATIVES_IN_REPORT = 5

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const MINUTE_MS = 60_000
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Parses a date as local midnight, because a bare ISO date would otherwise be read as UTC. */
export function localDate(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
}

export const formatDay = (date: Date | string) => {
  const d = typeof date === 'string' ? localDate(date) : date
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
export const formatShort = (date: Date | string) => {
  const d = typeof date === 'string' ? localDate(date) : date
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
export const formatDayMonth = (date: Date | string) => {
  const d = typeof date === 'string' ? localDate(date) : date
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
export const formatNumber = (value: number) => Math.round(value).toLocaleString('en-US')
const pad = (value: number) => String(value).padStart(2, '0')
export const formatTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** The week containing the date, held to the monitored range. */
export function weekIndexFor(now: Date): number {
  let index = 0
  for (let i = 0; i < WEEKS.length; i += 1) if (localDate(WEEKS[i]) <= now) index = i
  return index
}

export function weightedConfidence(scores: number[], weights: number[]): number {
  return Math.round(scores.reduce((sum, score, i) => sum + score * weights[i], 0))
}

export function statusFor(confidence: number): PhaseStatus {
  if (confidence >= PEAK_THRESHOLD) return 'Peak'
  if (confidence >= ACTIVE_THRESHOLD) return 'Active'
  if (confidence >= EMERGING_THRESHOLD) return 'Emerging'
  return 'Not detected'
}

export const STATUS_CLASS: Record<PhaseStatus, string> = {
  'Not detected': 'stage-monitor',
  Emerging: 'stage-elevated',
  Active: 'stage-warning',
  Peak: 'stage-critical',
}
export const STATUS_ICON: Record<PhaseStatus, string> = { 'Not detected': '●', Emerging: '▲', Active: '◆', Peak: '■' }

export interface StartEstimate { week: string; marginDays: number }

export function estimateStart(series: number[], week: number): StartEstimate | null {
  for (let i = 0; i <= week && i < series.length; i += 1) {
    if (series[i] >= ACTIVE_THRESHOLD) {
      const rise = series[i] - (i > 0 ? series[i - 1] : 0)
      return { week: WEEKS[i], marginDays: rise >= FAST_RISE_POINTS ? FAST_RISE_MARGIN_DAYS : SLOW_RISE_MARGIN_DAYS }
    }
  }
  return null
}

export function precursorWeek(series: number[], week: number): string | null {
  for (let i = 0; i <= week && i < series.length; i += 1) if (series[i] >= EMERGING_THRESHOLD) return WEEKS[i]
  return null
}

export interface PhaseReading {
  phase: PhaseId
  confidence: number
  status: PhaseStatus
  delta: number
  start: StartEstimate | null
  precursor: string | null
  scores: number[]
}

export function phaseReading(phase: PhaseId, week: number): PhaseReading {
  const def = PHASES[phase - 1]
  const series = WEEKS.map((_, i) => weightedConfidence(INDICATOR_SCORES[phase][i], def.indicators.map((item) => item.weight)))
  const confidence = series[week]
  return {
    phase,
    confidence,
    status: statusFor(confidence),
    delta: week > 0 ? confidence - series[week - 1] : 0,
    start: estimateStart(series, week),
    precursor: precursorWeek(series, week),
    scores: INDICATOR_SCORES[phase][week],
  }
}

export const allReadings = (week: number) => PHASE_IDS.map((phase) => phaseReading(phase, week))

const isLive = (status: PhaseStatus) => status === 'Active' || status === 'Peak'

/** The phase the election has reached: the latest live phase, else the latest emerging one. */
export function currentPhase(readings: PhaseReading[]): PhaseId | null {
  const latest = (test: (status: PhaseStatus) => boolean) => [...readings].reverse().find((item) => test(item.status))
  return (latest(isLive) ?? latest((status) => status === 'Emerging'))?.phase ?? null
}

export function movingTowards(readings: PhaseReading[]): PhaseReading | null {
  for (let i = readings.length - 1; i > 0; i -= 1) {
    if (readings[i].status === 'Emerging' && isLive(readings[i - 1].status)) return readings[i]
  }
  return null
}

export const isSeen = (firstSeen: string, now: Date) => localDate(firstSeen) <= now

export function postsThroughWeek(narrative: Narrative, week: number): number {
  return narrative.weekly.slice(0, week + 1).reduce((sum, value) => sum + value, 0)
}

export function visibleNarratives(phase: PhaseId, now: Date): Narrative[] {
  const week = weekIndexFor(now)
  return NARRATIVES.filter((item) => item.phase === phase && isSeen(item.firstSeen, now)).sort(
    (a, b) => b.weekly[week] - a.weekly[week] || a.rank - b.rank,
  )
}

export function flaggedForNarrative(narrative: Narrative, week: number): number {
  const total = NEW_FLAGGED[narrative.phase].slice(0, week + 1).reduce((sum, value) => sum + value, 0)
  return Math.round(total * narrative.flaggedShare)
}

export function mainstreamPickupAt(narrative: Narrative, now: Date): number {
  const network = PHASE_NETWORKS[narrative.phase]
  const mainstream = new Set(network.nodes.filter((node) => node.tier === 'mainstream').map((node) => node.id))
  const seen = network.edges.filter((edge) => edge.narrative === narrative.id && mainstream.has(edge.target) && isSeen(edge.firstSeen, now))
  return new Set(seen.map((edge) => edge.target)).size
}

export function defaultReportIds(now: Date): Set<string> {
  return new Set(PHASE_IDS.flatMap((phase) => visibleNarratives(phase, now).slice(0, TOP_NARRATIVES_IN_REPORT).map((item) => item.id)))
}

export type CountdownState = 'before' | 'polls-open' | 'certifying' | 'certified'

export interface CountdownView {
  state: CountdownState
  eyebrow: string
  main: string
  sub: string
  summary: string
  underline: boolean
  integrityWindow: boolean
}

export function countdownView(now: Date): CountdownView {
  const open = localDate(ELECTION.pollsOpen)
  const close = localDate(ELECTION.pollsClose)
  const certified = localDate(ELECTION.certification)
  const monitoring = addDays(localDate(ELECTION.monitoringEnds), 0)
  const time = now.getTime()
  const day = formatDay(open)

  if (now < open) {
    const left = open.getTime() - time
    const days = Math.floor(left / DAY_MS)
    const hours = Math.floor((left % DAY_MS) / HOUR_MS)
    const minutes = Math.floor((left % HOUR_MS) / MINUTE_MS)
    const seconds = Math.floor((left % MINUTE_MS) / 1000)
    return {
      state: 'before',
      eyebrow: ELECTION.name.toUpperCase(),
      main: `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`,
      sub: `${day} · polls open ${formatTime(open)}`,
      summary: `${days} days until the Norvane general election on 7 March 2027`,
      underline: days < 30,
      integrityWindow: days < 7,
    }
  }
  if (now < close) {
    const left = close.getTime() - time
    return {
      state: 'polls-open',
      eyebrow: 'POLLS OPEN',
      main: `Closes in ${pad(Math.floor(left / HOUR_MS))}h ${pad(Math.floor((left % HOUR_MS) / MINUTE_MS))}m ${pad(Math.floor((left % MINUTE_MS) / 1000))}s`,
      sub: `Election day · ${day}`,
      summary: 'Polls are open in the Norvane general election',
      underline: true,
      integrityWindow: true,
    }
  }
  if (now < certified) {
    const left = certified.getTime() - time
    const days = Math.floor(left / DAY_MS)
    return {
      state: 'certifying',
      eyebrow: 'RESULT CERTIFICATION',
      main: `Certified in ${days}d ${pad(Math.floor((left % DAY_MS) / HOUR_MS))}h`,
      sub: `Polls closed ${Math.floor((time - close.getTime()) / DAY_MS)}d ago`,
      summary: `${days} days until the result is certified`,
      underline: false,
      integrityWindow: false,
    }
  }
  const since = Math.floor((time - certified.getTime()) / DAY_MS)
  return {
    state: 'certified',
    eyebrow: 'ELECTION CERTIFIED',
    main: `+${since} days`,
    sub: `Phase 3 monitoring continues until ${formatShort(monitoring)}`,
    summary: `The election was certified ${since} days ago`,
    underline: false,
    integrityWindow: false,
  }
}

const reportDate = (index: number) => {
  const date = addDays(localDate(WEEKS[0]), index * 7)
  date.setHours(8, 0, 0, 0)
  return date
}

export interface ReportRef {
  number: number
  issued: Date
  coveredWeek: number
  /** Data cutoff: the end of the week the report covers. */
  cutoff: Date
}

export function reportRef(number: number, now?: Date): ReportRef {
  const issued = reportDate(number - 1)
  const monday = new Date(issued)
  monday.setHours(0, 0, 0, 0)
  const end = new Date(monday.getTime() - 1)
  return {
    number,
    issued,
    coveredWeek: Math.max(0, Math.min(WEEKS.length - 1, number - 2)),
    cutoff: now && now < end ? now : end,
  }
}

export function reportSchedule(now: Date) {
  let last = 0
  while (reportDate(last) <= now) last += 1
  return { lastNumber: last, nextNumber: last + 1, nextAt: reportDate(last) }
}

export function formatCountdownShort(ms: number): string {
  const safe = Math.max(0, ms)
  const days = Math.floor(safe / DAY_MS)
  const hours = Math.floor((safe % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((safe % HOUR_MS) / MINUTE_MS)
  return days > 0 ? `${days}d ${pad(hours)}h` : `${pad(hours)}h ${pad(minutes)}m`
}

export function accountStatus(account: FlaggedAccount, week: number, sessionReported: ReadonlySet<string>): ReportStatus {
  if (account.actionedWeek !== undefined && account.actionedWeek <= week) return 'Actioned'
  if (sessionReported.has(account.id)) return 'Reported'
  if (account.reportedWeek !== undefined && account.reportedWeek <= week) return 'Reported'
  return 'Not reported'
}

export const accountPhases = (account: FlaggedAccount, week: number): PhaseId[] =>
  PHASE_IDS.filter((phase) => account.phaseWeeks[phase] !== undefined && account.phaseWeeks[phase]! <= week)

export const accountsAt = (week: number) => FLAGGED_ACCOUNTS.filter((account) => account.firstWeek <= week)

export interface FlaggedSummary {
  total: number
  newThisWeek: number
  byPhase: Record<PhaseId, number>
  byPlatform: Record<Platform, number>
  byConfidence: Record<Confidence, number>
  byStatus: Record<ReportStatus, number>
  reported: number
  actioned: number
}

export function flaggedSummary(week: number, sessionReported: ReadonlySet<string>): FlaggedSummary {
  const summary: FlaggedSummary = {
    total: 0,
    newThisWeek: HEADLINE_SERIES[week] - (week > 0 ? HEADLINE_SERIES[week - 1] : 0),
    byPhase: { 1: 0, 2: 0, 3: 0 },
    byPlatform: { X: 0, Telegram: 0, TikTok: 0, Facebook: 0, YouTube: 0 },
    byConfidence: { High: 0, Medium: 0, Low: 0 },
    byStatus: { 'Not reported': 0, Reported: 0, Actioned: 0 },
    reported: 0,
    actioned: 0,
  }
  for (const account of accountsAt(week)) {
    summary.total += 1
    summary.byPlatform[account.platform] += 1
    summary.byConfidence[account.confidence] += 1
    summary.byStatus[accountStatus(account, week, sessionReported)] += 1
    for (const phase of accountPhases(account, week)) summary.byPhase[phase] += 1
  }
  summary.actioned = summary.byStatus.Actioned
  summary.reported = summary.byStatus.Reported + summary.byStatus.Actioned
  return summary
}
