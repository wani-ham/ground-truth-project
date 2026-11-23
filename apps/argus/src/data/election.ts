// Every election, person, outlet, account and claim in this file is invented for demonstration.

export type PhaseId = 1 | 2 | 3
export type PhaseStatus = 'Not detected' | 'Emerging' | 'Active' | 'Peak'
export type Platform = 'X' | 'Telegram' | 'TikTok' | 'Facebook' | 'YouTube'
export type Confidence = 'High' | 'Medium' | 'Low'
export type ReportStatus = 'Not reported' | 'Reported' | 'Actioned'
export type ElectionTier = 'origin' | 'laundering' | 'relay' | 'amplification' | 'mainstream'

export interface Election {
  country: 'NV'
  name: string
  pollsOpen: string
  pollsClose: string
  certification: string
  monitoringEnds: string
  oversightBody: string
}

export interface PhaseIndicator {
  id: string
  label: string
  weight: number
  fullAt: string
  /** Raw value that scores 100, used to describe the current reading. */
  fullValue: number
  unit: string
}

export interface PhaseDef {
  id: PhaseId
  short: string
  eeas: string
  description: string
  indicators: PhaseIndicator[]
}

export interface WeekPoint {
  week: string
  volume: Record<PhaseId, number>
  indicators: Record<PhaseId, number[]>
  newFlagged: Record<PhaseId, number>
}

export interface Candidate { id: string; name: string; party: string; role: string }

export interface CampaignTopic {
  id: string
  label: string
  mainstreamShare: number
  fimiShare: number
  falseClaimRate: number
  sources: { outlets: number; clusters: number }
}

export interface Narrative {
  id: string
  phase: PhaseId
  rank: number
  label: string
  claim: string
  truth: string
  truthSource: string
  target: { kind: 'candidate' | 'topic' | 'process'; id: string; label: string }
  firstSeen: string
  originOutlet: string
  weekly: number[]
  /** Share of the phase's flagged accounts. The on-screen count is derived per week. */
  flaggedShare: number
  /** Maximum outlets. The on-screen count uses only edges already seen. */
  mainstreamPickup: number
  response: 'Prebunk' | 'Debunk' | 'Monitor' | 'Do not amplify'
  examplePosts: string[]
}

export interface PhaseNode {
  id: string
  name: string
  kind: string
  tier: ElectionTier
  reach: number
  influence: number
  firstSeen: string
  narratives: string[]
  cluster?: string
}

export interface PhaseEdge { source: string; target: string; firstSeen: string; narrative: string }

export interface FlaggedAccount {
  id: string
  handle: string
  platform: Platform
  cluster: string
  confidence: Confidence
  criteria: string[]
  firstSeen: string
  firstWeek: number
  matchedPosts: number
  /** Week index at which the account joined each phase. */
  phaseWeeks: Partial<Record<PhaseId, number>>
  reportedWeek?: number
  actionedWeek?: number
}

export const PHASE_IDS: PhaseId[] = [1, 2, 3]

export const ELECTION: Election = {
  country: 'NV',
  name: 'Norvane general election',
  pollsOpen: '2027-03-07T07:00:00',
  pollsClose: '2027-03-07T22:00:00',
  certification: '2027-03-17T12:00:00',
  monitoringEnds: '2027-04-07T00:00:00',
  oversightBody: 'Norvane Electoral Commission',
}

export const CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Elin Marsk', party: 'Norvane Civic League', role: 'Prime minister, standing again' },
  { id: 'c2', name: 'Tomas Vire', party: 'Norvane Unity Bloc', role: 'Leader of the opposition' },
  { id: 'c3', name: 'Ada Lindqvist', party: 'Greens of Norvane', role: 'Party leader' },
  { id: 'c4', name: 'Pavel Orrin', party: 'Port Sella Regionalists', role: 'Party leader' },
  { id: 'c5', name: 'Mira Holt', party: 'Norvane Civic League', role: 'Foreign minister' },
]

export const PHASES: PhaseDef[] = [
  {
    id: 1,
    short: 'Candidates',
    eeas: 'Delegitimising leaders',
    description:
      'Months before the vote, FIMI networks try to discredit the people standing. Claims target health, corruption, loyalty and private life. We watch every registered candidate and party leader and match what known FIMI outlets and bot clusters say about them.',
    indicators: [
      { id: 'sources', label: 'Candidate narratives from FIMI sources', weight: 0.35, fullAt: '3 distinct narratives about listed candidates', fullValue: 3, unit: 'distinct narratives' },
      { id: 'coordination', label: 'Coordinated posting about candidates', weight: 0.3, fullAt: '12 coordinated posts in 12 h', fullValue: 12, unit: 'coordinated posts in 12 h' },
      { id: 'volume', label: 'Volume vs. pre-campaign baseline', weight: 0.2, fullAt: '4× baseline', fullValue: 4, unit: '× baseline' },
      { id: 'pickup', label: 'Pickup outside the FIMI network', weight: 0.15, fullAt: '3 national outlets', fullValue: 3, unit: 'national outlets' },
    ],
  },
  {
    id: 2,
    short: 'Campaign topics',
    eeas: 'Weaponising divisions',
    description:
      'In the weeks before the vote, FIMI networks attach false claims to the topics voters actually care about. We first build a repository of the real campaign topics from mainstream news, then check how known FIMI outlets and bot networks talk about those same topics.',
    indicators: [
      { id: 'overlap', label: 'Mainstream and watchlist topic overlap', weight: 0.35, fullAt: '7 of 10 topics', fullValue: 7, unit: 'of 10 topics' },
      { id: 'false-share', label: 'False-claim share in known bot networks', weight: 0.25, fullAt: '30% of topic mentions', fullValue: 30, unit: '% of topic mentions' },
      { id: 'coordination', label: 'Coordinated posting on campaign topics', weight: 0.25, fullAt: '12 coordinated posts in 12 h', fullValue: 12, unit: 'coordinated posts in 12 h' },
      { id: 'cross-platform', label: 'Cross-platform jump', weight: 0.15, fullAt: '4 platforms', fullValue: 4, unit: 'platforms in 72 h' },
    ],
  },
  {
    id: 3,
    short: 'Election integrity',
    eeas: 'Undermining electoral integrity',
    description:
      'Shortly before, during and after election day, FIMI networks try to make people doubt the result: fraud, rigging, lost or swapped postal ballots, hacked counts. These claims often start weeks early so they are ready when the result comes in.',
    indicators: [
      { id: 'volume', label: 'Integrity-claim volume vs. baseline', weight: 0.3, fullAt: '5× baseline', fullValue: 5, unit: '× baseline' },
      { id: 'framing', label: 'Pre-emptive “don’t trust the count” framing', weight: 0.25, fullAt: '4 outlets', fullValue: 4, unit: 'watchlist outlets' },
      { id: 'coordination', label: 'Coordinated posting on integrity claims', weight: 0.3, fullAt: '12 coordinated posts in 12 h', fullValue: 12, unit: 'coordinated posts in 12 h' },
      { id: 'elite', label: 'Elite pickup', weight: 0.15, fullAt: '2 elite pickups', fullValue: 2, unit: 'elite pickups' },
    ],
  },
]

export const WEEKS = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28', '2027-01-04', '2027-01-11', '2027-01-18', '2027-01-25', '2027-02-01', '2027-02-08', '2027-02-15', '2027-02-22', '2027-03-01', '2027-03-08', '2027-03-15', '2027-03-22', '2027-03-29']

export const VOLUME: Record<PhaseId, number[]> = {
  1: [120, 140, 180, 260, 1450, 2100, 2600, 2300, 1900, 2400, 2800, 2600, 2900, 3300, 3600, 3900, 4200, 4600, 2100, 900, 600, 450],
  2: [300, 280, 320, 310, 350, 420, 480, 520, 610, 900, 1300, 3100, 4200, 5100, 5900, 6600, 7200, 7900, 3000, 1200, 800, 600],
  3: [40, 35, 50, 45, 60, 55, 70, 80, 90, 110, 140, 180, 420, 760, 1300, 2100, 3400, 6800, 14200, 9800, 5200, 2600],
}

export const CONFIDENCE: Record<PhaseId, number[]> = {
  1: [8, 10, 14, 22, 71, 82, 88, 89, 90, 91, 92, 93, 94, 95, 96, 96, 97, 97, 97, 97, 97, 97],
  2: [6, 6, 7, 8, 9, 12, 15, 18, 22, 31, 44, 72, 79, 82, 84, 86, 88, 90, 90, 90, 90, 90],
  3: [2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 9, 14, 31, 38, 41, 58, 71, 88, 93, 94, 94, 92],
}

export const NEW_FLAGGED: Record<PhaseId, number[]> = {
  1: [4, 5, 8, 12, 140, 120, 110, 80, 60, 70, 80, 70, 60, 70, 80, 60, 50, 40, 20, 10, 5, 4],
  2: [6, 5, 7, 6, 8, 10, 12, 14, 18, 40, 70, 180, 210, 220, 230, 210, 180, 150, 60, 20, 10, 6],
  3: [1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 5, 8, 30, 45, 60, 80, 110, 160, 120, 40, 15, 6],
}

/** Weighted, these reproduce CONFIDENCE. Phase 1's first score follows the listed narrative count. */
export const INDICATOR_SCORES: Record<PhaseId, number[][]> = {
  1: [[0,16,14,4],[0,19,17,7],[0,25,24,14],[0,37,36,26],[33,95,93,83],[67,94,92,82],[100,85,84,74],[100,87,85,75],[100,88,87,77],[100,90,88,78],[100,91,90,80],[100,93,91,81],[100,94,93,83],[100,96,94,84],[100,97,96,86],[100,97,96,86],[100,99,97,87],[100,99,97,87],[100,99,97,87],[100,99,97,87],[100,99,97,87],[100,99,97,87]],
  2: [[6,6,6,6],[6,6,6,6],[7,7,7,7],[8,8,8,8],[9,9,9,9],[12,12,12,12],[20,12,17,7],[23,15,20,10],[27,19,24,14],[36,28,33,23],[49,41,46,36],[77,69,74,64],[84,76,81,71],[87,79,84,74],[89,81,86,76],[91,83,88,78],[93,85,90,80],[95,87,92,82],[95,87,92,82],[95,87,92,82],[95,87,92,82],[95,87,92,82]],
  3: [[2,2,2,2],[2,2,2,2],[3,3,3,3],[3,3,3,3],[3,3,3,3],[4,4,4,4],[4,4,4,4],[5,5,5,5],[5,5,5,5],[6,6,6,6],[9,9,9,9],[18,10,18,2],[35,27,35,19],[42,34,42,26],[45,37,45,29],[62,54,62,46],[75,67,75,59],[92,84,92,76],[97,89,97,81],[98,90,98,82],[98,90,98,82],[96,88,96,80]],
}

export const WEEK_POINTS: WeekPoint[] = WEEKS.map((week, i) => ({
  week,
  volume: { 1: VOLUME[1][i], 2: VOLUME[2][i], 3: VOLUME[3][i] },
  indicators: { 1: INDICATOR_SCORES[1][i], 2: INDICATOR_SCORES[2][i], 3: INDICATOR_SCORES[3][i] },
  newFlagged: { 1: NEW_FLAGGED[1][i], 2: NEW_FLAGGED[2][i], 3: NEW_FLAGGED[3][i] },
}))

export const REPORTED_SERIES = [0, 0, 0, 0, 20, 60, 120, 190, 270, 360, 470, 610, 780, 980, 1180, 1400, 1610, 1820, 2010, 2140, 2240, 2300]
export const ACTIONED_SERIES = [0, 0, 0, 0, 0, 10, 40, 70, 110, 160, 220, 300, 390, 510, 640, 790, 940, 1090, 1240, 1360, 1450, 1520]

export const PLATFORM_SHARES: [Platform, number][] = [['X', 0.37], ['Telegram', 0.26], ['TikTok', 0.21], ['Facebook', 0.12], ['YouTube', 0.04]]
export const CONFIDENCE_SHARES: [Confidence, number][] = [['High', 0.29], ['Medium', 0.46], ['Low', 0.25]]

export const CAMPAIGN_TOPICS: CampaignTopic[] = [
  { id: 't1', label: 'Energy prices and the price cap', mainstreamShare: 0.22, fimiShare: 0.31, falseClaimRate: 0.38, sources: { outlets: 6, clusters: 3 } },
  { id: 't2', label: 'Cost of living and wages', mainstreamShare: 0.18, fimiShare: 0.12, falseClaimRate: 0.14, sources: { outlets: 4, clusters: 2 } },
  { id: 't3', label: 'Military support for Kestria', mainstreamShare: 0.09, fimiShare: 0.24, falseClaimRate: 0.46, sources: { outlets: 7, clusters: 3 } },
  { id: 't4', label: 'Migration and asylum', mainstreamShare: 0.12, fimiShare: 0.15, falseClaimRate: 0.33, sources: { outlets: 5, clusters: 3 } },
  { id: 't5', label: 'Health care waiting times', mainstreamShare: 0.11, fimiShare: 0.03, falseClaimRate: 0.06, sources: { outlets: 2, clusters: 1 } },
  { id: 't6', label: 'Housing', mainstreamShare: 0.08, fimiShare: 0.02, falseClaimRate: 0.04, sources: { outlets: 1, clusters: 1 } },
  { id: 't7', label: 'EU rules and sovereignty', mainstreamShare: 0.06, fimiShare: 0.09, falseClaimRate: 0.41, sources: { outlets: 5, clusters: 2 } },
  { id: 't8', label: 'Climate and farming', mainstreamShare: 0.05, fimiShare: 0.03, falseClaimRate: 0.22, sources: { outlets: 2, clusters: 1 } },
  { id: 't9', label: 'Crime and policing', mainstreamShare: 0.05, fimiShare: 0.005, falseClaimRate: 0.09, sources: { outlets: 1, clusters: 0 } },
  { id: 't10', label: 'Education', mainstreamShare: 0.04, fimiShare: 0.005, falseClaimRate: 0.02, sources: { outlets: 1, clusters: 0 } },
]

export const PROCESS_STEPS = [
  { id: 'registration', label: 'Voter registration', date: '2026-11-02' },
  { id: 'applications', label: 'Postal vote applications', date: '2027-01-11' },
  { id: 'postal', label: 'Postal ballots sent', date: '2027-02-15' },
  { id: 'polling', label: 'Polling day', date: '2027-03-07' },
  { id: 'count', label: 'Count', date: '2027-03-07' },
  { id: 'result', label: 'Result announced', date: '2027-03-08' },
  { id: 'certification', label: 'Certification', date: '2027-03-17' },
]

const CLUSTER_NAMES: Record<string, string> = {
  A: 'Cluster A · Telegram relay',
  B: 'Cluster B · X amplifiers',
  C: 'Cluster C · TikTok video',
  D: 'Cluster D · election accounts',
}
export const CLUSTERS = Object.entries(CLUSTER_NAMES).map(([id, name]) => ({ id, name }))

type BaseNode = Omit<PhaseNode, 'influence' | 'firstSeen' | 'narratives'>

const BASE_NODES: BaseNode[] = [
  { id: 'origin', name: 'Varkova Today', kind: 'State media outlet', tier: 'origin', reach: 2_400_000 },
  { id: 'l1', name: 'The Free Ledger', kind: 'Proxy site', tier: 'laundering', reach: 84_000 },
  { id: 'l2', name: 'EuroTruth Wire', kind: 'Proxy site', tier: 'laundering', reach: 120_000 },
  { id: 'l3', name: 'Open Dispatch', kind: 'Proxy site', tier: 'laundering', reach: 66_000 },
  { id: 'l4', name: 'Continental Monitor', kind: 'Proxy site', tier: 'laundering', reach: 95_000 },
  { id: 'l5', name: 'PolicyLeaks Digest', kind: 'Proxy site', tier: 'laundering', reach: 48_000 },
  { id: 'l6', name: 'Daily Aggregate', kind: 'Proxy site', tier: 'laundering', reach: 140_000 },
  { id: 'r1', name: 'Norvane Herald', kind: 'News outlet', tier: 'relay', reach: 420_000 },
  { id: 'r5', name: 'Norvane Morning Post', kind: 'News outlet', tier: 'relay', reach: 260_000 },
  { id: 'r9', name: 'Port Sella Courier', kind: 'News outlet', tier: 'relay', reach: 110_000 },
  { id: 'ca', name: CLUSTER_NAMES.A, kind: 'Coordinated cluster', tier: 'amplification', reach: 92_000, cluster: 'A' },
  { id: 'ca2', name: 'Cluster A · relay channels', kind: 'Coordinated cluster', tier: 'amplification', reach: 41_000, cluster: 'A' },
  { id: 'cb', name: CLUSTER_NAMES.B, kind: 'Coordinated cluster', tier: 'amplification', reach: 118_000, cluster: 'B' },
  { id: 'cb2', name: 'Cluster B · reply accounts', kind: 'Coordinated cluster', tier: 'amplification', reach: 37_000, cluster: 'B' },
  { id: 'cc', name: CLUSTER_NAMES.C, kind: 'Coordinated cluster', tier: 'amplification', reach: 146_000, cluster: 'C' },
  { id: 'cc2', name: 'Cluster C · repost accounts', kind: 'Coordinated cluster', tier: 'amplification', reach: 52_000, cluster: 'C' },
  { id: 'cd', name: CLUSTER_NAMES.D, kind: 'Coordinated cluster', tier: 'amplification', reach: 74_000, cluster: 'D' },
  { id: 'cd2', name: 'Cluster D · local pages', kind: 'Coordinated cluster', tier: 'amplification', reach: 29_000, cluster: 'D' },
  { id: 's1', name: 'Norvane Parents Forum', kind: 'Social group', tier: 'amplification', reach: 42_000 },
  { id: 's5', name: 'Port Sella Community', kind: 'Social group', tier: 'amplification', reach: 18_000 },
  { id: 's9', name: 'Norvane Election Chat', kind: 'Social group', tier: 'amplification', reach: 73_000 },
  { id: 's13', name: 'Norvane Veterans Circle', kind: 'Social group', tier: 'amplification', reach: 25_000 },
  { id: 's18', name: 'Norvane News Exchange', kind: 'Social group', tier: 'amplification', reach: 58_000 },
  { id: 'm1', name: 'Norvane Unity Bloc MP', kind: 'Politician', tier: 'mainstream', reach: 340_000 },
  { id: 'm6', name: 'Norvane Civic League mayor', kind: 'Politician', tier: 'mainstream', reach: 160_000 },
  { id: 'mr', name: 'Norvane Public Radio', kind: 'Broadcaster', tier: 'mainstream', reach: 1_150_000 },
]

type NarrativeSeed = [
  id: string,
  phase: PhaseId,
  kind: Narrative['target']['kind'],
  targetId: string,
  targetLabel: string,
  label: string,
  claim: string,
  truth: string,
  truthSource: string,
  firstSeen: string,
  originOutlet: string,
  pickup: number,
  response: Narrative['response'],
]

const SEEDS: NarrativeSeed[] = [
  ['p1n1', 1, 'candidate', 'c1', 'Elin Marsk', 'The PM is secretly unwell', 'Marsk has a hidden illness and aides run the government.', 'Marsk’s published annual medical statement shows no such condition, and she attends cabinet meetings in person.', 'Prime Minister’s Office, public record', '2026-11-30', 'origin', 2, 'Debunk'],
  ['p1n2', 1, 'candidate', 'c1', 'Elin Marsk', 'Marsk’s family profits from Kestria aid', 'Her brother’s firm received aid contracts.', 'No family member holds an aid contract.', 'Public procurement register', '2026-12-07', 'l1', 1, 'Debunk'],
  ['p1n3', 1, 'candidate', 'c2', 'Tomas Vire', 'Vire is a foreign agent', 'Vire takes money from a Western foundation.', 'Party funding filings show no foreign donations.', 'Electoral Commission, party funding filings', '2026-12-14', 'l2', 1, 'Debunk'],
  ['p1n4', 1, 'candidate', 'c3', 'Ada Lindqvist', 'Greens will ban private cars', 'Lindqvist plans a total car ban by 2030.', 'The Greens’ manifesto proposes city-centre low-emission zones only.', 'Greens of Norvane manifesto', '2027-01-04', 'l3', 1, 'Prebunk'],
  ['p1n5', 1, 'candidate', 'c5', 'Mira Holt', 'Foreign minister fakes her degree', 'Holt’s university degree is forged.', 'The university’s public graduate register lists Holt’s degree.', 'University graduate register', '2027-01-11', 'l4', 0, 'Monitor'],
  ['p1n6', 1, 'candidate', 'c4', 'Pavel Orrin', 'Regionalists plan secession vote', 'Orrin will hold an illegal independence referendum.', 'No such proposal exists in the party programme.', 'Port Sella Regionalists programme', '2027-01-25', 'l5', 0, 'Monitor'],
  ['p1n7', 1, 'candidate', 'c1', 'Elin Marsk', 'Deepfake clip “Marsk admits vote deal”', 'A video shows Marsk admitting a deal to fix the vote.', 'The clip is synthetic. The original speech is on the parliament archive.', 'Parliament video archive', '2027-02-08', 'l6', 1, 'Do not amplify'],
  ['p2n1', 2, 'topic', 't1', 'Energy prices and the price cap', 'Price cap ends after the election', 'The price cap ends the day after the election.', 'The cap is legislated until Dec 2028.', 'Energy Price Act', '2027-01-04', 'origin', 3, 'Prebunk'],
  ['p2n2', 2, 'topic', 't3', 'Military support for Kestria', 'Norvane will send conscripts', 'Norvane will send conscripts.', 'Norvane has no conscription, and deployments need a parliamentary vote.', 'Defence Act', '2027-01-11', 'l1', 2, 'Prebunk'],
  ['p2n3', 2, 'topic', 't2', 'Cost of living and wages', 'Pensions will be cut 20%', 'Pensions will be cut 20%.', 'No party proposes pension cuts, and the pension index is fixed by law.', 'Pensions Act', '2027-01-18', 'l2', 1, 'Debunk'],
  ['p2n4', 2, 'topic', 't4', 'Migration and asylum', '50,000 migrants will get the vote', '50,000 migrants will get the vote.', 'Only citizens can vote in general elections.', 'Electoral Commission, who can vote', '2027-01-18', 'l3', 1, 'Debunk'],
  ['p2n5', 2, 'topic', 't7', 'EU rules and sovereignty', 'Brussels picks the next PM', 'Brussels picks the next PM.', 'The PM is elected by the Norvane parliament.', 'Constitution of Norvane', '2027-01-25', 'l4', 1, 'Prebunk'],
  ['p2n6', 2, 'topic', 't8', 'Climate and farming', 'Farmers fined for every cow', 'Farmers will be fined for every cow.', 'No livestock levy is proposed.', 'Agriculture Ministry', '2027-02-01', 'l5', 0, 'Monitor'],
  ['p2n7', 2, 'topic', 't5', 'Health care waiting times', 'Hospitals closing in Port Sella', 'Hospitals are closing in Port Sella.', 'No closures are planned.', 'Health Ministry plan 2027', '2027-02-08', 'l6', 0, 'Monitor'],
  ['p3n1', 3, 'process', 'postal', 'Postal ballots sent', 'Swapped Ballots', 'Postal ballots are secretly swapped at sorting centres.', 'Postal ballots are sealed, tracked and counted in public under observers from all parties.', 'Electoral Commission, postal voting rules', '2027-01-25', 'origin', 2, 'Prebunk'],
  ['p3n2', 3, 'process', 'count', 'Count', 'The count is pre-programmed', 'The voting software already has the result.', 'Norvane counts paper ballots by hand. Machines are not used.', 'Electoral Commission, counting rules', '2027-02-08', 'l2', 1, 'Prebunk'],
  ['p3n3', 3, 'process', 'registration', 'Voter registration', 'Dead voters on the roll', '200,000 dead people are registered to vote.', 'The roll is updated weekly from the civil register. An independent audit found 0.01% errors.', 'Electoral roll audit', '2027-02-15', 'l3', 1, 'Debunk'],
  ['p3n4', 3, 'process', 'polling', 'Polling day', 'Pencils are erasable', 'Polling-station pencils are erasable so votes can be changed.', 'Polling stations supply indelible pencils, voters may use their own pen, and every ballot is counted in public.', 'Electoral Commission, polling station guide', '2027-03-07', 'l1', 0, 'Debunk'],
  ['p3n5', 3, 'process', 'result', 'Result announced', 'Result announced before the count', 'Media had the result before counting finished.', 'Exit polls are estimates. Official results come only from the Commission.', 'Electoral Commission, results procedure', '2027-03-07', 'l6', 2, 'Debunk'],
  ['p3n6', 3, 'process', 'certification', 'Certification', 'Certification is rigged', 'The Commission will certify a false result.', 'Results can be checked by any party and appealed to the Supreme Court.', 'Electoral Act, appeals', '2027-03-09', 'l4', 1, 'Debunk'],
]

/** The public page's explanation, written to add to the fact rather than repeat it. */
export const WHY_FALSE: Record<string, string> = {
  p1n1: 'No medical record or official source supports the claim, and government business has continued under her direction.',
  p1n2: 'Aid contracts are published, and none names her brother, his firm or another family member.',
  p1n3: 'Parties must declare their donors, and no foreign foundation appears in the filings.',
  p1n4: 'The claim turns a limited city-centre policy into a national ban that the party has not proposed.',
  p1n5: 'The degree can be checked against the university’s own record, which contradicts the forgery claim.',
  p1n6: 'The party’s published programme contains no referendum plan.',
  p1n7: 'The words in the clip do not appear in the archived recording of the speech.',
  p2n1: 'An election does not end the cap. Parliament would have to pass a new law to change it.',
  p2n2: 'There is no conscription system that could send people abroad, and no such vote is planned.',
  p2n3: 'A cut would need a change in the law, and no party manifesto proposes one.',
  p2n4: 'Citizenship is a legal requirement for this vote, so migrants without citizenship cannot be added to the roll.',
  p2n5: 'No EU institution has a role in choosing Norvane’s prime minister.',
  p2n6: 'No party or ministry has proposed a charge on livestock.',
  p2n7: 'The published health plan lists no hospital closures in Port Sella.',
  p3n1: 'Each stage is recorded and open to party observers, so ballots cannot be secretly replaced.',
  p3n2: 'There is no voting software that could hold a result, because counting is done by people.',
  p3n3: 'Deaths are passed from the civil register to the roll every week, and the audit found no error on this scale.',
  p3n4: 'The pencils used at polling stations cannot be erased, and observers watch ballots from box to count.',
  p3n5: 'Broadcasters can report exit-poll estimates, but these are not the official result.',
  p3n6: 'Certification follows a published process, and any party can challenge it in court.',
}

/** Splits a total by weight so the parts always sum exactly to the total. */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  if (sum <= 0) return weights.map(() => 0)
  const quotas = weights.map((weight) => (total * weight) / sum)
  const parts = quotas.map((quota) => Math.floor(quota + 1e-9))
  let left = total - parts.reduce((acc, part) => acc + part, 0)
  const order = quotas.map((quota, i) => ({ i, rest: quota - parts[i] })).sort((a, b) => b.rest - a.rest || a.i - b.i)
  for (let j = 0; left > 0; j = (j + 1) % order.length, left -= 1) parts[order[j].i] += 1
  return parts
}

export function weekIndexOfDate(iso: string): number {
  let index = 0
  for (let i = 0; i < WEEKS.length; i += 1) if (WEEKS[i] <= iso) index = i
  return index
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

function narrativeWeekly(seeds: NarrativeSeed[], phase: PhaseId): number[][] {
  const series = seeds.map(() => WEEKS.map(() => 0))
  WEEKS.forEach((week, w) => {
    const weights = seeds.map((seed, rank) => {
      const firstWeek = weekIndexOfDate(seed[9])
      if (firstWeek > w) return 0
      const liveShare = firstWeek === w ? (7 - dayDiff(week, seed[9])) / 7 : 1
      return (liveShare / (rank + 1.6)) * (1 + 0.2 * Math.sin(w * 0.9 + rank * 1.7))
    })
    allocate(VOLUME[phase][w], weights).forEach((posts, i) => { series[i][w] = posts })
  })
  return series
}

export const NARRATIVES: Narrative[] = PHASE_IDS.flatMap((phase) => {
  const seeds = SEEDS.filter((seed) => seed[1] === phase)
  const weekly = narrativeWeekly(seeds, phase)
  const shareWeights = seeds.map((_, rank) => 1 / (rank + 1.6))
  const shareTotal = shareWeights.reduce((acc, value) => acc + value, 0)
  return seeds.map((seed, i): Narrative => ({
    id: seed[0],
    phase,
    rank: i + 1,
    label: seed[5],
    claim: seed[6],
    truth: seed[7],
    truthSource: seed[8],
    target: { kind: seed[2], id: seed[3], label: seed[4] },
    firstSeen: seed[9],
    originOutlet: seed[10],
    weekly: weekly[i],
    flaggedShare: shareWeights[i] / shareTotal,
    mainstreamPickup: seed[11],
    response: seed[12],
    examplePosts: [`Why is nobody talking about this? ${seed[6]}`, `Share before it gets taken down. ${seed[6]}`],
  }))
})

function buildNetwork(phase: PhaseId): { nodes: PhaseNode[]; edges: PhaseEdge[] } {
  const narratives = NARRATIVES.filter((narrative) => narrative.phase === phase)
  const ids = (tier: ElectionTier, clustered?: boolean) =>
    BASE_NODES.filter((node) => node.tier === tier && (clustered === undefined || Boolean(node.cluster) === clustered)).map((node) => node.id)
  const laundering = ids('laundering')
  const relays = ids('relay')
  const clusters = ids('amplification', true)
  const groups = ids('amplification', false)
  const mainstream = ids('mainstream')
  const edges: PhaseEdge[] = []

  narratives.forEach((narrative, i) => {
    const pick = (list: string[], offset: number) => list[(i + phase + offset) % list.length]
    const add = (source: string, target: string, days: number) => {
      if (source === target) return
      edges.push({ source, target, firstSeen: addDays(narrative.firstSeen, days), narrative: narrative.id })
    }
    const lead = narrative.originOutlet === 'origin' ? pick(laundering, 0) : narrative.originOutlet
    const second = laundering[(laundering.indexOf(lead) + 2 + phase) % laundering.length]
    const relay = pick(relays, 0)
    const clusterOne = pick(clusters, i)
    const clusterTwo = pick(clusters, i + 3)
    const groupOne = pick(groups, 0)
    const groupTwo = pick(groups, 2)
    add('origin', lead, 0)
    add(lead, second, 1)
    add(lead, clusterOne, 1)
    add(second, relay, 2)
    add(second, clusterTwo, 2)
    add(clusterOne, groupOne, 3)
    add(clusterTwo, groupTwo, 3)
    add(relay, groupTwo, 4)
    for (let m = 0; m < narrative.mainstreamPickup; m += 1) {
      add(m % 2 === 0 ? groupOne : relay, pick(mainstream, m), 5 + m * 2)
    }
  })

  const carried = new Map<string, Set<string>>()
  const first = new Map<string, string>()
  const touch = (id: string, edge: PhaseEdge) => {
    if (!carried.has(id)) carried.set(id, new Set())
    carried.get(id)!.add(edge.narrative)
    if (!first.has(id) || edge.firstSeen < first.get(id)!) first.set(id, edge.firstSeen)
  }
  for (const edge of edges) {
    touch(edge.source, edge)
    touch(edge.target, edge)
  }

  const nodes = BASE_NODES.filter((node) => carried.has(node.id)).map((node): PhaseNode => {
    const degree = edges.filter((edge) => edge.source === node.id || edge.target === node.id).length
    return {
      ...node,
      firstSeen: first.get(node.id)!,
      narratives: [...carried.get(node.id)!],
      influence: Math.min(100, Math.round(Math.sqrt(node.reach / 2_400_000) * 58 + degree * 3)),
    }
  })
  return { nodes, edges }
}

export const PHASE_NETWORKS: Record<PhaseId, { nodes: PhaseNode[]; edges: PhaseEdge[] }> = {
  1: buildNetwork(1),
  2: buildNetwork(2),
  3: buildNetwork(3),
}

/** Unique accounts rounded to the nearest 10, because about 10% are active in more than one phase. */
export const HEADLINE_SERIES: number[] = WEEKS.map((_, w) => {
  const total = PHASE_IDS.reduce((acc, phase) => acc + NEW_FLAGGED[phase].slice(0, w + 1).reduce((a, b) => a + b, 0), 0)
  return Math.round((0.9 * total) / 10) * 10
})

export const FLAG_CRITERIA = [
  'Created under 90 days ago',
  'Near-duplicate text with a known cluster',
  'Posting-rhythm match',
  'Follows or is followed mainly by flagged accounts',
  'Amplifies watchlist outlets within 30 minutes',
]

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const list = items.slice()
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

/** Builds accounts week by week, so every breakdown matches the published series at every week. */
function generateAccounts(): FlaggedAccount[] {
  const random = mulberry32(20270307)
  const accounts: FlaggedAccount[] = []
  const platformCounts = new Map<Platform, number>()
  const confidenceCounts = new Map<Confidence, number>()

  const draw = <T,>(shares: [T, number][], counts: Map<T, number>, total: number, needed: number): T[] => {
    const targets = allocate(total, shares.map(([, share]) => share))
    const pool = shares.flatMap(([value], i) => Array<T>(Math.max(0, targets[i] - (counts.get(value) ?? 0))).fill(value))
    const picked = shuffled(pool, random).slice(0, needed)
    for (const value of picked) counts.set(value, (counts.get(value) ?? 0) + 1)
    return picked
  }

  WEEKS.forEach((week, w) => {
    const total = HEADLINE_SERIES[w]
    const fresh = total - accounts.length
    const platforms = draw(PLATFORM_SHARES, platformCounts, total, fresh)
    const confidences = draw(CONFIDENCE_SHARES, confidenceCounts, total, fresh)

    for (let i = 0; i < fresh; i += 1) {
      const platform = platforms[i]
      const confidence = confidences[i]
      const natural = platform === 'Telegram' ? 'A' : platform === 'X' ? 'B' : platform === 'TikTok' ? 'C' : 'D'
      const criteriaCount = confidence === 'High' ? 4 + Math.floor(random() * 2) : confidence === 'Medium' ? 3 : 2
      const number = accounts.length + 1
      accounts.push({
        id: `fa${number}`,
        handle: `@${'abcdefghklmnprstvz'[Math.floor(random() * 18)]}•••••_${String(Math.floor(random() * 100)).padStart(2, '0')}`,
        platform,
        cluster: random() < 0.2 ? 'D' : natural,
        confidence,
        criteria: shuffled(FLAG_CRITERIA, random).slice(0, criteriaCount),
        firstSeen: week,
        firstWeek: w,
        matchedPosts: 3 + Math.floor(random() * 42),
        phaseWeeks: {},
      })
    }

    for (const phase of PHASE_IDS) {
      const eligible = accounts.filter((account) => account.phaseWeeks[phase] === undefined)
      const empty = shuffled(eligible.filter((account) => Object.keys(account.phaseWeeks).length === 0), random)
      const others = shuffled(eligible.filter((account) => Object.keys(account.phaseWeeks).length > 0), random)
      for (const account of [...empty, ...others].slice(0, NEW_FLAGGED[phase][w])) account.phaseWeeks[phase] = w
    }

    const newlyReported = REPORTED_SERIES[w] - (w ? REPORTED_SERIES[w - 1] : 0)
    for (const account of shuffled(accounts.filter((item) => item.reportedWeek === undefined), random).slice(0, newlyReported)) {
      account.reportedWeek = w
    }
    const newlyActioned = ACTIONED_SERIES[w] - (w ? ACTIONED_SERIES[w - 1] : 0)
    const reportable = accounts.filter((item) => item.reportedWeek !== undefined && item.actionedWeek === undefined)
    for (const account of shuffled(reportable, random).slice(0, newlyActioned)) account.actionedWeek = w
  })
  return accounts
}

export const FLAGGED_ACCOUNTS: FlaggedAccount[] = generateAccounts()

/** Hours after 06:00 on election day, and integrity posts per hour at that point. */
const HOURLY_ANCHORS: [number, number][] = [[0, 18], [1, 66], [16, 310], [19, 460], [48, 90]]

export const ELECTION_HOURLY: number[] = Array.from({ length: 48 }, (_, hour) => {
  for (let i = 0; i < HOURLY_ANCHORS.length - 1; i += 1) {
    const [fromHour, fromValue] = HOURLY_ANCHORS[i]
    const [toHour, toValue] = HOURLY_ANCHORS[i + 1]
    if (hour >= fromHour && hour <= toHour) {
      const t = (hour - fromHour) / (toHour - fromHour)
      const eased = t * t * (3 - 2 * t)
      return Math.round(fromValue + (toValue - fromValue) * eased)
    }
  }
  return HOURLY_ANCHORS[HOURLY_ANCHORS.length - 1][1]
})

export const SCENARIO_PRESETS = [
  { id: '12w', label: '12 weeks out', date: '2026-12-15T10:00:00' },
  { id: '3w', label: '3 weeks out', date: '2027-02-14T10:00:00' },
  { id: 'day', label: 'Election day', date: '2027-03-07T12:00:00' },
  { id: '2d', label: '2 days after', date: '2027-03-09T10:00:00' },
  { id: 'cert', label: 'After certification', date: '2027-03-20T12:00:00' },
] as const

export const DEFAULT_PRESET = SCENARIO_PRESETS[1]
