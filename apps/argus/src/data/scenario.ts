// Every entity, country, and claim in this file is invented for demonstration.

export type Tier = 'origin' | 'laundering' | 'relay' | 'amplification' | 'mainstream'
export type CountryCode = 'VK' | 'NV' | 'CS' | 'BM' | 'ZL'

export interface NetworkNode {
  id: string
  name: string
  kind: string
  tier: Tier
  country: CountryCode | null
  reach: number
  /** Simulated hours after the narrative first appeared. */
  pickupHour: number
  /** The first source is the primary one, used for tracing back to origin. */
  sources: string[]
  /** Accounts sharing a cluster posted near-identical text. */
  messageCluster?: string
  /** Entities that received the narrative through this one, directly or indirectly. */
  downstream: number
  /** 0 to 100, combining audience size and onward spread. */
  influence: number
}

export interface NetworkEdge {
  id: string
  source: string
  target: string
  hour: number
}

type NodeSpec = Omit<NetworkNode, 'pickupHour' | 'sources' | 'downstream' | 'influence'>

export const DURATION_HOURS = 336
const SIMULATION_SEED = 20261121
/** Stretches every organic delay, because many parallel links make first arrivals early. */
const SPREAD_PACE = 2.4

export const NARRATIVE = {
  title: 'The “Swapped Ballots” narrative',
  claim: 'Postal ballots are being secretly swapped at regional sorting centres.',
}

export const TIERS: { id: Tier; label: string; description: string }[] = [
  { id: 'origin', label: 'Origin', description: 'State media outlet' },
  { id: 'laundering', label: 'Laundering', description: 'Proxy sites and aggregators' },
  { id: 'relay', label: 'Relay', description: 'National news outlets' },
  { id: 'amplification', label: 'Amplification', description: 'Social accounts and groups' },
  { id: 'mainstream', label: 'Mainstream', description: 'Politicians and broadcasters' },
]

export const COUNTRIES: Record<CountryCode, string> = {
  VK: 'Varkova',
  NV: 'Norvane',
  CS: 'Castrelle',
  BM: 'Belmark',
  ZL: 'Zeloria',
}

export const MEMBER_STATES: CountryCode[] = ['NV', 'CS', 'BM', 'ZL']

const originSpec: NodeSpec = {
  id: 'origin',
  name: 'Varkova Today',
  kind: 'State media outlet',
  tier: 'origin',
  country: 'VK',
  reach: 2_400_000,
}

const launderingSpecs: NodeSpec[] = (
  [
    ['l1', 'The Free Ledger', 84_000],
    ['l2', 'EuroTruth Wire', 120_000],
    ['l3', 'Open Dispatch', 66_000],
    ['l4', 'Continental Monitor', 95_000],
    ['l5', 'PolicyLeaks Digest', 48_000],
    ['l6', 'Daily Aggregate', 140_000],
  ] as const
).map(([id, name, reach]) => ({ id, name, kind: 'Proxy site', tier: 'laundering' as const, country: null, reach }))

const relaySpecs: NodeSpec[] = (
  [
    ['r1', 'Norvane Herald', 'NV', 420_000],
    ['r2', 'Castrelle Tribune', 'CS', 510_000],
    ['r3', 'Belmark Daily', 'BM', 380_000],
    ['r4', 'Zeloria Voice', 'ZL', 290_000],
    ['r5', 'Norvane Morning Post', 'NV', 260_000],
    ['r6', 'Castrelle Observer', 'CS', 310_000],
    ['r7', 'Hollen Press', 'BM', 150_000],
    ['r8', 'Drovia News', 'ZL', 170_000],
    ['r9', 'Port Sella Courier', 'NV', 110_000],
    ['r10', 'Valmont Gazette', 'CS', 130_000],
    ['r11', 'Rivermouth Times', 'BM', 125_000],
    ['r12', 'Zeloria Express', 'ZL', 205_000],
  ] as const
).map(([id, name, country, reach]) => ({ id, name, kind: 'News outlet', tier: 'relay' as const, country, reach }))

const coordinatedSpecs: NodeSpec[] = Array.from({ length: 14 }, (_, i) => ({
  id: `c${i + 1}`,
  name: `@ballotwatch_${String(i + 1).padStart(2, '0')}`,
  kind: 'Coordinated account',
  tier: 'amplification' as const,
  country: MEMBER_STATES[i % MEMBER_STATES.length],
  reach: 6_000 + (i * 2_700) % 17_000,
  messageCluster: 'swapped-ballots-a',
}))

const organicSpecs: NodeSpec[] = (
  [
    ['Norvane Parents Forum', 'NV', 42_000],
    ['Castrelle Politics Talk', 'CS', 68_000],
    ['Belmark Local Voices', 'BM', 31_000],
    ['Zeloria Town Square', 'ZL', 54_000],
    ['Port Sella Community', 'NV', 18_000],
    ['Valmont Neighbours', 'CS', 22_000],
    ['Hollen Debate Club', 'BM', 15_000],
    ['Drovia Open Group', 'ZL', 27_000],
    ['Norvane Election Chat', 'NV', 73_000],
    ['Castrelle Citizens', 'CS', 49_000],
    ['Rivermouth Noticeboard', 'BM', 19_000],
    ['Zeloria Daily Talk', 'ZL', 36_000],
    ['Norvane Veterans Circle', 'NV', 25_000],
    ['Castrelle Commuters', 'CS', 14_000],
    ['Belmark Farmers Network', 'BM', 39_000],
    ['Zeloria Students', 'ZL', 33_000],
    ['Belmark Politics Live', 'BM', 61_000],
    ['Norvane News Exchange', 'NV', 58_000],
  ] as const
).map(([name, country, reach], i) => ({
  id: `s${i + 1}`,
  name,
  kind: 'Social group',
  tier: 'amplification' as const,
  country,
  reach,
}))

const mainstreamSpecs: NodeSpec[] = (
  [
    ['m1', 'Norvane Unity Bloc MP', 'Politician', 'NV', 340_000],
    ['m2', 'Belmark Heritage MP', 'Politician', 'BM', 280_000],
    ['m3', 'Castrelle Renewal candidate', 'Politician', 'CS', 410_000],
    ['m4', 'Castrelle One TV', 'Broadcaster', 'CS', 1_900_000],
    ['m5', 'Zeloria Forward candidate', 'Politician', 'ZL', 230_000],
    ['m6', 'Norvane Civic League mayor', 'Politician', 'NV', 160_000],
    ['m7', 'Zeloria National Radio', 'Broadcaster', 'ZL', 1_300_000],
    ['m8', 'Belmark Farmers’ List candidate', 'Politician', 'BM', 120_000],
  ] as const
).map(([id, name, kind, country, reach]) => ({ id, name, kind, tier: 'mainstream' as const, country, reach }))

const SPECS: NodeSpec[] = [
  originSpec,
  ...launderingSpecs,
  ...relaySpecs,
  ...coordinatedSpecs,
  ...organicSpecs,
  ...mainstreamSpecs,
]

function createRandom(seed: number) {
  let state = seed >>> 0
  const uniform = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const logNormal = (median: number, sigma: number) => {
    const z = Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform())
    return median * Math.exp(sigma * z)
  }
  return { uniform, logNormal }
}

type Random = ReturnType<typeof createRandom>
interface Link {
  chance: number
  median: number
  sigma: number
}

/** How likely one entity is to pick a claim up from another, and how long that tends to take. */
function linkBetween(from: NodeSpec, to: NodeSpec): Link | null {
  const local = from.country === to.country
  const route = `${from.tier}>${to.tier}`
  switch (route) {
    case 'origin>laundering': return { chance: 1, median: 14, sigma: 0.8 }
    case 'origin>relay': return { chance: 0.25, median: 20, sigma: 0.6 }
    case 'laundering>laundering': return { chance: 0.25, median: 18, sigma: 0.8 }
    case 'laundering>relay': return { chance: 0.45, median: 38, sigma: 0.7 }
    case 'laundering>amplification': return { chance: 0.12, median: 45, sigma: 0.9 }
    case 'relay>relay': return local ? { chance: 0.5, median: 30, sigma: 0.8 } : { chance: 0.1, median: 45, sigma: 0.8 }
    case 'relay>amplification': return local ? { chance: 0.6, median: 20, sigma: 0.9 } : { chance: 0.05, median: 40, sigma: 0.9 }
    case 'relay>mainstream': return local ? { chance: 0.3, median: 60, sigma: 0.6 } : null
    case 'amplification>amplification': return local ? { chance: 0.4, median: 14, sigma: 1 } : { chance: 0.06, median: 30, sigma: 1 }
    case 'amplification>relay': return local ? { chance: 0.12, median: 24, sigma: 0.8 } : null
    case 'amplification>mainstream': return local ? { chance: 0.5, median: 42, sigma: 0.6 } : null
    case 'mainstream>mainstream': return local ? { chance: 0.5, median: 24, sigma: 0.7 } : { chance: 0.15, median: 36, sigma: 0.7 }
    case 'mainstream>amplification': return local ? { chance: 0.7, median: 6, sigma: 0.8 } : null
    case 'mainstream>relay': return local ? { chance: 0.6, median: 8, sigma: 0.7 } : null
    default: return null
  }
}

/** People and newsrooms mostly wait out the night. Automated accounts do not. */
function afterQuietHours(hour: number, random: Random): number {
  const clock = hour % 24
  if (clock >= 1 && clock < 6 && random.uniform() < 0.8) return hour + (6 - clock) + random.uniform() * 3
  return hour
}

interface Exposure {
  source: string | null
  hour: number
}

/** Spreads the claim outward, with each entity adopting it from whichever exposure lands first. */
function simulate(): NetworkNode[] {
  const random = createRandom(SIMULATION_SEED)
  const byId = new Map(SPECS.map((spec) => [spec.id, spec]))
  const exposures = new Map<string, Exposure[]>(SPECS.map((spec) => [spec.id, []]))
  const adopted = new Map<string, { hour: number; sources: string[] }>()

  exposures.get('origin')!.push({ source: null, hour: 0 })

  // The coordinated accounts launch together at a time chosen by their operator.
  const campaignStart = 96 + random.uniform() * 24
  for (const spec of coordinatedSpecs) {
    const jitter = Math.min(9, -Math.log(1 - random.uniform()) * 2.5)
    exposures.get(spec.id)!.push({ source: null, hour: campaignStart + jitter })
  }

  // Elites tend to repeat a claim only once it already looks like a live public debate.
  const eliteTraction = campaignStart + 48

  // Some outlets and communities are slow to engage, which gives the spread a long tail.
  const hesitation = new Map(
    SPECS.map((spec) => {
      const canHesitate = (spec.tier === 'relay' || spec.tier === 'amplification') && !spec.messageCluster
      const hesitant = canHesitate && random.uniform() < 0.35
      return [spec.id, hesitant ? Math.min(150, random.logNormal(70, 0.6)) : 0]
    }),
  )

  const nextAdopter = () => {
    let best: { id: string; hour: number } | null = null
    for (const [id, list] of exposures) {
      if (adopted.has(id)) continue
      for (const exposure of list) {
        if (!best || exposure.hour < best.hour) best = { id, hour: exposure.hour }
      }
    }
    return best
  }

  for (let next = nextAdopter(); next; next = nextAdopter()) {
    const spec = byId.get(next.id)!
    const hour = next.hour
    const list = exposures.get(spec.id)!
    let sources = list
      .filter((exposure) => exposure.source && exposure.hour <= hour + 18)
      .sort((a, b) => a.hour - b.hour)
      .slice(0, 3)
      .map((exposure) => exposure.source!)

    if (spec.messageCluster) {
      const carriers = [...adopted.keys()].filter((id) => ['relay', 'laundering'].includes(byId.get(id)!.tier))
      const local = carriers.filter((id) => byId.get(id)!.country === spec.country)
      const pool = local.length ? local : carriers
      sources = [pool[Math.floor(random.uniform() * pool.length)]]
    }

    adopted.set(spec.id, { hour, sources })

    for (const target of SPECS) {
      if (adopted.has(target.id) || target.messageCluster) continue
      const link = linkBetween(spec, target)
      if (!link || random.uniform() > link.chance) continue
      let arrival = hour + 0.5 + random.logNormal(link.median * SPREAD_PACE, link.sigma) + hesitation.get(target.id)!
      if (target.tier === 'mainstream') arrival = Math.max(arrival, eliteTraction + random.uniform() * 120)
      exposures.get(target.id)!.push({ source: spec.id, hour: afterQuietHours(arrival, random) })
    }
  }

  // Anything the random walk missed hears it late from someone in its own country.
  for (const spec of SPECS) {
    if (adopted.has(spec.id)) continue
    const carriers = [...adopted.entries()].filter(([id]) => byId.get(id)!.country === spec.country)
    const [source, carrier] = carriers[Math.floor(random.uniform() * carriers.length)]
    adopted.set(spec.id, { hour: carrier.hour + 2 + random.logNormal(24, 0.6), sources: [source] })
  }

  const children = new Map<string, string[]>()
  for (const [id, { sources }] of adopted) {
    for (const source of sources) children.set(source, [...(children.get(source) ?? []), id])
  }
  const downstreamOf = (id: string) => {
    const seen = new Set<string>()
    const stack = [...(children.get(id) ?? [])]
    while (stack.length) {
      const current = stack.pop()!
      if (seen.has(current)) continue
      seen.add(current)
      stack.push(...(children.get(current) ?? []))
    }
    return seen.size
  }

  const downstream = new Map(SPECS.map((spec) => [spec.id, downstreamOf(spec.id)]))
  const logReaches = SPECS.map((spec) => Math.log10(spec.reach))
  const minReach = Math.min(...logReaches)
  const maxReach = Math.max(...logReaches)
  const maxDownstream = Math.max(...downstream.values())

  return SPECS.map((spec) => {
    const audience = (Math.log10(spec.reach) - minReach) / (maxReach - minReach)
    const spread = Math.log1p(downstream.get(spec.id)!) / Math.log1p(maxDownstream)
    const { hour, sources } = adopted.get(spec.id)!
    return {
      ...spec,
      pickupHour: Math.round(hour * 100) / 100,
      sources,
      downstream: downstream.get(spec.id)!,
      // Audience leads, so a major broadcaster that adopts late still reads as important.
      influence: Math.round((audience * 0.7 + spread * 0.3) * 100),
    }
  })
}

export const NODES: NetworkNode[] = simulate()

export const EDGES: NetworkEdge[] = NODES.flatMap((node) =>
  node.sources.map((source) => ({
    id: `${source}->${node.id}`,
    source,
    target: node.id,
    hour: node.pickupHour,
  })),
)
