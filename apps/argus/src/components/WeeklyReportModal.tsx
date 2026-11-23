import { useMemo, useState } from 'react'
import { ELECTION, HEADLINE_SERIES, ACTIONED_SERIES, NARRATIVES, PHASES, REPORTED_SERIES, WEEKS, type Narrative } from '../data/election'
import { addDays, allReadings, currentPhase, defaultReportIds, formatDay, formatDayMonth, formatNumber, formatShort, isSeen, localDate, mainstreamPickupAt, reportRef, type ReportRef } from '../engine/phases'
import { StatusBadge, startText } from './PhaseCard'
import { DebunkPagePreview } from './DebunkPagePreview'
import { useModalDialog } from './useModalDialog'

const IMPRESSIONS_PER_POST = 38

function recommendations(narratives: Narrative[], ref: ReportRef): string[] {
  const actions: string[] = []
  if (narratives.some((item) => item.id === 'p3n1')) {
    actions.push(`Publish how postal ballots are checked before ${formatDayMonth(addDays(ref.issued, 7))}.`, 'Brief returning officers on the “swapped ballots” claim.')
  }
  const topic = narratives.find((item) => item.phase === 2)
  if (topic) actions.push(`Prebunk the claim on ${topic.target.label.toLowerCase()} with the official fact.`)
  const candidate = narratives.find((item) => item.phase === 1)
  if (candidate) actions.push(`Offer ${candidate.target.label} a correction route for “${candidate.label}”.`)
  if (!actions.length) actions.push('Continue monitoring. No response is needed yet.')
  return actions.slice(0, 3)
}

interface Props {
  number: number
  now: Date
  isDraft: boolean
  includedIds: ReadonlySet<string>
  startTab?: 'briefing' | 'public'
  onClose: () => void
}

export function WeeklyReportModal({ number, now, isDraft, includedIds, startTab = 'briefing', onClose }: Props) {
  const dialogRef = useModalDialog()
  const [tab, setTab] = useState(startTab)
  const [reviewed, setReviewed] = useState(false)
  const [sent, setSent] = useState(false)
  const ref = useMemo(() => reportRef(number, now), [number, now])
  const week = ref.coveredWeek
  const readings = allReadings(week)
  const current = currentPhase(readings)
  const narratives = useMemo(() => {
    const ids = isDraft ? includedIds : defaultReportIds(ref.cutoff)
    return NARRATIVES.filter((item) => ids.has(item.id) && isSeen(item.firstSeen, ref.cutoff))
  }, [includedIds, isDraft, ref.cutoff])
  const start = localDate(WEEKS[week])
  const end = addDays(start, 6)
  const daysToVote = Math.max(0, Math.round((localDate(ELECTION.pollsOpen.slice(0, 10)).getTime() - end.getTime()) / 86_400_000))
  const currentReading = readings.find((item) => item.phase === current)
  const biggest = [...readings].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]
  const newAccounts = HEADLINE_SERIES[week] - (week ? HEADLINE_SERIES[week - 1] : 0)
  const newReported = REPORTED_SERIES[week] - (week ? REPORTED_SERIES[week - 1] : 0)
  const newActioned = ACTIONED_SERIES[week] - (week ? ACTIONED_SERIES[week - 1] : 0)

  return (
    <dialog ref={dialogRef} className="alert-modal report-modal print-dialog" aria-labelledby="weekly-report-title" onClose={onClose}>
      <div className="modal-head">
        <div>
          <span className="eyebrow">For the {ELECTION.oversightBody} · contains assessments</span>
          <h2 id="weekly-report-title">ARGUS weekly briefing #{number}</h2>
          <p className="mono report-sub">week of {start.getDate()}–{formatDayMonth(end)} {end.getFullYear()} · {ELECTION.name} (T−{daysToVote} days)</p>
        </div>
        <button type="button" className="ghost no-print" aria-label="Close" onClick={onClose}>✕</button>
      </div>

      <div className="inline-toggle report-tabs no-print" role="group" aria-label="Report view">
        <button type="button" aria-pressed={tab === 'briefing'} onClick={() => setTab('briefing')}>Briefing</button>
        <button type="button" aria-pressed={tab === 'public'} onClick={() => setTab('public')}>Public page</button>
      </div>

      {tab === 'public' ? (
        <DebunkPagePreview narratives={narratives} updated={ref.issued} canExport={reviewed || !isDraft} />
      ) : (
        <div className="report-body">
          <section>
            <h3>Summary</h3>
            <p>
              {currentReading ? `The election is in phase ${current}, ${PHASES[current! - 1].short.toLowerCase()}, at ${currentReading.confidence}% confidence.` : 'No FIMI election phase has been detected yet.'}{' '}
              {biggest.delta ? `The largest change this week was phase ${biggest.phase}, ${biggest.delta > 0 ? 'up' : 'down'} ${Math.abs(biggest.delta)} points.` : 'Phase scores did not change this week.'}{' '}
              ARGUS assessed {narratives.length} false narratives and flagged {formatNumber(newAccounts)} new likely bot accounts.
            </p>
          </section>
          <section>
            <h3>Phase status</h3>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Phase</th><th>Status</th><th className="num">Confidence</th><th className="num">Change</th><th>Estimated start</th></tr></thead>
                <tbody>
                  {readings.map((item) => (
                    <tr key={item.phase}>
                      <td>{item.phase} {PHASES[item.phase - 1].short}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td className="num">{item.confidence}%</td>
                      <td className="num">{item.delta > 0 ? '+' : ''}{item.delta}</td>
                      <td className="mono">{startText(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h3>False narratives this week</h3>
            {PHASES.map((def) => {
              const items = narratives.filter((item) => item.phase === def.id)
              if (!items.length) return null
              return (
                <div key={def.id} className="report-group">
                  <h4>Phase {def.id} · {def.short}</h4>
                  {items.map((item) => {
                    const posts = item.weekly[week]
                    const previous = week ? item.weekly[week - 1] : 0
                    const trend = previous ? Math.round(((posts - previous) / previous) * 100) : null
                    const pickup = mainstreamPickupAt(item, ref.cutoff)
                    return (
                      <article key={item.id} className="report-item">
                        <p><strong>Claim:</strong> {item.claim}</p>
                        <p><strong>What is true:</strong> {item.truth} <span className="muted">({item.truthSource})</span></p>
                        <p className="mono report-meta">
                          first seen {formatShort(item.firstSeen)} · {formatNumber(posts)} posts · ~{formatNumber(posts * IMPRESSIONS_PER_POST)} impressions · trend {trend === null ? 'new' : `${trend > 0 ? '+' : ''}${trend}%`} · mainstream pickup {pickup ? `yes (${pickup})` : 'no'} · {item.response}
                        </p>
                      </article>
                    )
                  })}
                </div>
              )
            })}
            {!narratives.length && <p className="muted">No narratives are included in this report.</p>}
          </section>
          <section>
            <h3>Flagged accounts</h3>
            <p className="mono">{formatNumber(newAccounts)} new this week · {formatNumber(newReported)} reported · {formatNumber(newActioned)} actioned</p>
          </section>
          <section>
            <h3>Recommended actions</h3>
            <ol className="report-actions">{recommendations(narratives, ref).map((item) => <li key={item}>{item}</li>)}</ol>
          </section>
          <section>
            <h3>Method and caveats</h3>
            <p className="caveat">Scores combine four weighted indicators per phase. Attribution is based on watchlist membership and coordination patterns, and is an assessment, not proof. All data in this demo is simulated.</p>
          </section>
          {sent ? (
            <div className="sent no-print">
              <strong>✓ Sent to the {ELECTION.oversightBody} (simulated)</strong>
              <p>Nothing was sent. Report #{number}, {formatDay(ref.issued)}.</p>
            </div>
          ) : (
            <label className="review no-print">
              <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
              I am the analyst and I have reviewed this report.
            </label>
          )}
          <div className="modal-actions no-print">
            <button type="button" onClick={() => window.print()}>Download PDF</button>
            <button type="button" onClick={() => setTab('public')}>Preview public page</button>
            {!sent && <button type="button" className="primary" disabled={!reviewed} onClick={() => setSent(true)}>Send to Electoral Commission (simulated)</button>}
          </div>
        </div>
      )}
    </dialog>
  )
}
