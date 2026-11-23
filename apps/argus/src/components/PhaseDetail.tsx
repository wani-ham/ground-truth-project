import { useMemo, useState } from 'react'
import { CANDIDATES, CAMPAIGN_TOPICS, CLUSTERS, PHASES, PROCESS_STEPS, type PhaseId } from '../data/election'
import { accountPhases, accountsAt, formatDay, formatNumber, phaseReading, visibleNarratives } from '../engine/phases'
import { formatReach } from '../engine/playback'
import { CandidateExposure } from './CandidateExposure'
import { IntegrityWatch } from './IntegrityWatch'
import { NarrativeList } from './NarrativeList'
import { IndicatorList, StatusBadge, startText } from './PhaseCard'
import { PhaseNetwork, nodeTrace } from './PhaseNetwork'
import { TopicRepository } from './TopicRepository'

interface Props {
  phase: PhaseId
  now: Date
  week: number
  includedIds: ReadonlySet<string>
  onToggleIncluded: (id: string, included: boolean) => void
  onBack: () => void
  onPhase: (phase: PhaseId) => void
  onReview: (phase: PhaseId) => void
  onReplay: () => void
}

const targetLabel = (id: string) =>
  CANDIDATES.find((item) => item.id === id)?.name ??
  CAMPAIGN_TOPICS.find((item) => item.id === id)?.label ??
  PROCESS_STEPS.find((item) => item.id === id)?.label ?? id

const FILTER_NAME: Record<PhaseId, string> = { 1: 'Candidate', 2: 'Topic', 3: 'Process step' }

export function PhaseDetail({ phase, now, week, includedIds, onToggleIncluded, onBack, onPhase, onReview, onReplay }: Props) {
  const def = PHASES[phase - 1]
  const reading = phaseReading(phase, week)
  const [filter, setFilter] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const dayKey = now.toDateString()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = useMemo(() => visibleNarratives(phase, now), [phase, dayKey, week])
  const narratives = useMemo(() => (filter ? all.filter((item) => item.target.id === filter) : all), [all, filter])
  const narrativeIds = useMemo(() => new Set(narratives.map((item) => item.id)), [narratives])
  const detail = selectedNode ? nodeTrace(phase, selectedNode, now, narrativeIds) : null
  const accounts = useMemo(() => accountsAt(week).filter((account) => accountPhases(account, week).includes(phase)), [phase, week])
  const clusters = CLUSTERS.map((cluster) => ({ ...cluster, count: accounts.filter((account) => account.cluster === cluster.id).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
  const chooseFilter = (id: string | null) => {
    setFilter(id)
    setHighlighted(null)
    setSelectedNode(null)
  }

  return (
    <div className="phase-detail">
      <nav className="phase-nav" aria-label="Phases">
        <button type="button" className="link" onClick={onBack}>← All phases</button>
        <div className="segmented" role="group" aria-label="Choose phase">
          {PHASES.map((item) => (
            <button key={item.id} type="button" aria-pressed={item.id === phase} onClick={() => onPhase(item.id)}>{item.id} {item.short}</button>
          ))}
        </div>
      </nav>

      <section className="panel phase-header">
        <div>
          <span className="eyebrow">Phase {phase} · {def.eeas}</span>
          <h2>{def.short}</h2>
          <p>{def.description}</p>
        </div>
        <div className="phase-header-score">
          <StatusBadge status={reading.status} />
          <div className="score">{reading.confidence}<small>%</small></div>
          <span className="mono">{startText(reading)}</span>
        </div>
      </section>

      {filter && (
        <div className="filter-chip-row">
          <button type="button" className="filter-chip" aria-label={`Clear filter ${targetLabel(filter)}`} onClick={() => chooseFilter(null)}>
            {FILTER_NAME[phase]}: {targetLabel(filter)} ×
          </button>
        </div>
      )}

      <div className="detail-grid">
        <PhaseNetwork phase={phase} now={now} narratives={narratives} highlighted={highlighted} selectedId={selectedNode} onSelect={setSelectedNode} />
        <section className="panel narrative-panel details" aria-label={detail?.node ? 'Node details' : 'Top narratives'}>
          {detail?.node ? (
            <>
              <div className="panel-head">
                <h2>{detail.node.name}</h2>
                <button type="button" className="link" onClick={() => setSelectedNode(null)}>× Back to narratives</button>
              </div>
              <dl>
                <div><dt>Role</dt><dd>{detail.node.tier}, {detail.node.kind.toLowerCase()}</dd></div>
                <div><dt>Reach</dt><dd>{formatReach(detail.node.reach)}</dd></div>
                <div><dt>Influence</dt><dd>{detail.node.influence}/100</dd></div>
                <div><dt>First seen</dt><dd>{formatDay(detail.node.firstSeen)}</dd></div>
                <div><dt>Narratives</dt><dd>{detail.node.narratives.length}</dd></div>
                <div><dt>Assessment</dt><dd>{detail.node.cluster ? 'Likely bot cluster' : 'Not flagged'}</dd></div>
              </dl>
              <h3>How it reached them</h3>
              <ol className="trace">
                {detail.trace.map((step) => (
                  <li key={step.id}>
                    <button type="button" className="link" onClick={() => setSelectedNode(step.id)}>{step.name}</button>
                    <span>{formatDay(step.firstSeen)}</span>
                  </li>
                ))}
              </ol>
              {detail.node.tier !== 'origin' && <p className="caveat">Repeating a claim does not by itself show intent to deceive.</p>}
            </>
          ) : (
            <>
              <h2>Top narratives</h2>
              <NarrativeList narratives={narratives} week={week} highlighted={highlighted} includedIds={includedIds} onHighlight={setHighlighted} onToggleIncluded={onToggleIncluded} onReplay={onReplay} />
            </>
          )}
        </section>
      </div>

      {phase === 1 && <CandidateExposure narratives={all} week={week} now={now} filter={filter} onFilter={chooseFilter} />}
      {phase === 2 && <TopicRepository narratives={all} filter={filter} onFilter={chooseFilter} />}
      {phase === 3 && <IntegrityWatch narratives={all} week={week} now={now} filter={filter} onFilter={chooseFilter} />}

      <div className="detail-bottom">
        <section className="panel" aria-label="Indicators">
          <h2>Indicators</h2>
          <IndicatorList def={def} reading={reading} />
        </section>
        <section className="panel" aria-label="Accounts in this phase">
          <h2>Accounts in this phase</h2>
          <div className="score-row"><div className="score">{formatNumber(accounts.length)}</div><p>flagged accounts</p></div>
          <ul className="cluster-list">
            {clusters.map((cluster) => <li key={cluster.id}><span>{cluster.name}</span><span className="mono">{formatNumber(cluster.count)}</span></li>)}
          </ul>
          <button type="button" className="primary full" onClick={() => onReview(phase)}>Review and report →</button>
        </section>
      </div>
    </div>
  )
}
