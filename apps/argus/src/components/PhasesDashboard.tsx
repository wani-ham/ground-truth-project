import { useCallback, useMemo, useState } from 'react'
import { ELECTION, NARRATIVES, PHASES, type PhaseId } from '../data/election'
import { allReadings, currentPhase, defaultReportIds, flaggedSummary, formatCountdownShort, formatDay, formatTime, isSeen, movingTowards, reportRef, reportSchedule, visibleNarratives, weekIndexFor } from '../engine/phases'
import { BotCounter } from './BotCounter'
import { PhaseCard } from './PhaseCard'
import { PhaseDetail } from './PhaseDetail'
import { PhaseTimeline } from './PhaseTimeline'
import { ReportAccountsModal } from './ReportAccountsModal'
import { ScenarioDateControl } from './ScenarioDateControl'
import { useScenarioNow, type ScenarioAnchor } from './useScenarioNow'
import { WeeklyReportModal } from './WeeklyReportModal'

interface Props {
  active: boolean
  phase: PhaseId | null
  anchor: ScenarioAnchor
  presetId: string | null
  onPreset: (id: string) => void
  onWeek: (week: number) => void
  onNavigate: (hash: string) => void
}

export function PhasesDashboard({ active, phase, anchor, presetId, onPreset, onWeek, onNavigate }: Props) {
  const now = useScenarioNow(anchor, 30_000)
  const week = weekIndexFor(now)
  const [sessionReported, setSessionReported] = useState<Set<string>>(new Set())
  const [choices, setChoices] = useState<Map<string, boolean>>(new Map())
  const [accountsModal, setAccountsModal] = useState<{ phase: PhaseId | null } | null>(null)
  const [reportModal, setReportModal] = useState<{ number: number; draft: boolean } | null>(null)
  const [pastOpen, setPastOpen] = useState(false)
  const [sends, setSends] = useState(0)

  const readings = useMemo(() => allReadings(week), [week])
  const current = currentPhase(readings)
  const banner = movingTowards(readings)
  const summary = useMemo(() => flaggedSummary(week, sessionReported), [week, sessionReported])
  const dayKey = now.toDateString()
  const includedIds = useMemo(() => {
    const ids = defaultReportIds(now)
    choices.forEach((included, id) => {
      if (included && NARRATIVES.some((item) => item.id === id && isSeen(item.firstSeen, now))) ids.add(id)
      if (!included) ids.delete(id)
    })
    return ids
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choices, dayKey, week])
  const schedule = reportSchedule(now)
  const pastReports = Array.from({ length: Math.min(5, schedule.lastNumber) }, (_, i) => schedule.lastNumber - i).map((number) => {
    const ref = reportRef(number)
    return { number, issued: ref.issued, count: defaultReportIds(ref.cutoff).size }
  })
  const toggleIncluded = useCallback((id: string, included: boolean) => {
    setChoices((map) => new Map(map).set(id, included))
  }, [])
  const reference = `ARG-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(sends + 3).padStart(2, '0')}`

  return (
    <main className="phases-view" hidden={!active}>
      <ScenarioDateControl presetId={presetId} week={week} now={now} onPreset={onPreset} onWeek={onWeek} />

      {phase ? (
        <PhaseDetail
          key={phase}
          phase={phase}
          now={now}
          week={week}
          includedIds={includedIds}
          onToggleIncluded={toggleIncluded}
          onBack={() => onNavigate('phases')}
          onPhase={(next) => onNavigate(`phases/${next}`)}
          onReview={(next) => setAccountsModal({ phase: next })}
          onReplay={() => onNavigate('replay')}
        />
      ) : (
        <>
          {banner && (
            <div className="phase-banner" role="status">
              <strong>
                ◆ Moving towards phase {banner.phase} · {PHASES[banner.phase - 1].short} · {banner.confidence}% confidence, {banner.delta >= 0 ? 'up' : 'down'} {Math.abs(banner.delta)} points this week
              </strong>
              <button type="button" onClick={() => onNavigate(`phases/${banner.phase}`)}>Open phase {banner.phase}</button>
            </div>
          )}
          <div className="phase-cards">
            {PHASES.map((def) => (
              <PhaseCard
                key={def.id}
                def={def}
                reading={readings[def.id - 1]}
                week={week}
                narratives={visibleNarratives(def.id, now)}
                flagged={summary.byPhase[def.id]}
                isCurrent={current === def.id}
                onOpen={() => onNavigate(`phases/${def.id}`)}
              />
            ))}
          </div>
          <PhaseTimeline week={week} now={now} readings={readings} />
          <div className="overview-bottom">
            <BotCounter summary={summary} onReview={() => setAccountsModal({ phase: null })} />
            <section className="panel report-card" aria-label="Weekly oversight report">
              <h2>Weekly oversight report</h2>
              <dl>
                <div><dt>Next report</dt><dd className="mono">{formatDay(schedule.nextAt)} · {formatTime(schedule.nextAt)} <span>(in {formatCountdownShort(schedule.nextAt.getTime() - now.getTime())})</span></dd></div>
                <div><dt>To</dt><dd>{ELECTION.oversightBody}</dd></div>
                <div><dt>Last sent</dt><dd className="mono">{pastReports[0] ? `${formatDay(pastReports[0].issued)} · Report #${pastReports[0].number}` : 'None yet'}</dd></div>
                <div><dt>This week</dt><dd>{includedIds.size} false narratives · {new Set(NARRATIVES.filter((item) => includedIds.has(item.id)).map((item) => item.phase)).size} of 3 phases</dd></div>
              </dl>
              <div className="report-buttons">
                <button type="button" className="primary" onClick={() => setReportModal({ number: schedule.nextNumber, draft: true })}>Preview this week’s report</button>
                <button type="button" aria-expanded={pastOpen} onClick={() => setPastOpen((open) => !open)}>Past reports ▾</button>
              </div>
              {pastOpen && (
                <ul className="past-reports">
                  {pastReports.map((item) => (
                    <li key={item.number}>
                      <button type="button" className="link" onClick={() => setReportModal({ number: item.number, draft: false })}>
                        <span className="mono">#{item.number} · {formatDay(item.issued)} · {item.count} narratives</span>
                      </button>
                    </li>
                  ))}
                  {!pastReports.length && <li className="muted">No reports yet.</li>}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {accountsModal && (
        <ReportAccountsModal
          week={week}
          now={now}
          initialPhase={accountsModal.phase}
          sessionReported={sessionReported}
          reference={reference}
          onSend={(ids) => {
            setSessionReported((set) => new Set([...set, ...ids]))
            setSends((count) => count + 1)
          }}
          onClose={() => setAccountsModal(null)}
        />
      )}
      {reportModal && (
        <WeeklyReportModal
          key={reportModal.number}
          number={reportModal.number}
          now={now}
          isDraft={reportModal.draft}
          includedIds={includedIds}
          onClose={() => setReportModal(null)}
        />
      )}
    </main>
  )
}
