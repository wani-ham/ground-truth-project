import { useMemo, useState } from 'react'
import { CLUSTERS, FLAG_CRITERIA, PLATFORM_SHARES, type Confidence, type FlaggedAccount, type PhaseId, type Platform, type ReportStatus } from '../data/election'
import { accountPhases, accountStatus, accountsAt, formatDay, formatNumber } from '../engine/phases'
import { useModalDialog } from './useModalDialog'

const PAGE_SIZE = 25
const CHANNELS = [
  { id: 'platform', label: 'Platform trust & safety report', on: true },
  { id: 'cib', label: 'Coordinated inauthentic behaviour channel', on: true },
  { id: 'commission', label: 'Electoral Commission (copy)', on: false },
  { id: 'dsc', label: 'National DSA coordinator', on: false },
  { id: 'art16', label: 'DSA Art. 16 illegal-content notice (only for content assessed as illegal)', on: false },
]

interface Props {
  week: number
  now: Date
  initialPhase: PhaseId | null
  sessionReported: ReadonlySet<string>
  reference: string
  onSend: (ids: string[]) => void
  onClose: () => void
}

function downloadCsv(rows: FlaggedAccount[], week: number, sessionReported: ReadonlySet<string>) {
  const header = 'handle,platform,cluster,confidence,criteria,first_seen,matched_posts,phases,status'
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const lines = rows.map((row) => [
    quote(row.handle), row.platform, row.cluster, row.confidence, quote(row.criteria.join('; ')), row.firstSeen,
    row.matchedPosts, quote(accountPhases(row, week).join(' ')), accountStatus(row, week, sessionReported),
  ].join(','))
  const url = URL.createObjectURL(new Blob(['﻿', [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'argus-evidence-pack-simulated.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function ReportAccountsModal({ week, now, initialPhase, sessionReported, reference, onSend, onClose }: Props) {
  const dialogRef = useModalDialog()
  const [phase, setPhase] = useState<'all' | PhaseId>(initialPhase ?? 'all')
  const [platform, setPlatform] = useState<'all' | Platform>('all')
  const [confidence, setConfidence] = useState<'all' | Confidence>('High')
  const [cluster, setCluster] = useState('all')
  const [status, setStatus] = useState<'all' | ReportStatus>('Not reported')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [channels, setChannels] = useState(() => new Set(CHANNELS.filter((item) => item.on).map((item) => item.id)))
  const [reviewed, setReviewed] = useState(false)
  const [sentReceipt, setSentReceipt] = useState<{ count: number; reference: string } | null>(null)

  const all = useMemo(() => accountsAt(week), [week])
  const rows = useMemo(() => all.filter((account) =>
    (phase === 'all' || accountPhases(account, week).includes(phase)) &&
    (platform === 'all' || account.platform === platform) &&
    (confidence === 'all' || account.confidence === confidence) &&
    (cluster === 'all' || account.cluster === cluster) &&
    (status === 'all' || accountStatus(account, week, sessionReported) === status),
  ), [all, cluster, confidence, phase, platform, sessionReported, status, week])

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pages - 1)
  const pageRows = rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const chosen = all.filter((account) => selected.has(account.id))
  const sendable = chosen.filter((account) => accountStatus(account, week, sessionReported) === 'Not reported')
  const byPlatform = PLATFORM_SHARES.map(([name]) => [name, chosen.filter((item) => item.platform === name).length] as const).filter(([, count]) => count > 0)
  const pageAllSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(row.id))

  const filter = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(0) }
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const togglePage = () => setSelected((current) => {
    const next = new Set(current)
    for (const row of pageRows) {
      if (pageAllSelected) next.delete(row.id)
      else next.add(row.id)
    }
    return next
  })
  const send = () => {
    setSentReceipt({ count: sendable.length, reference })
    onSend(sendable.map((account) => account.id))
  }

  return (
    <dialog ref={dialogRef} className="alert-modal wide-modal" aria-labelledby="report-accounts-title" onClose={onClose}>
      <div className="modal-head">
        <div>
          <span className="eyebrow">Simulated · {formatDay(now)}</span>
          <h2 id="report-accounts-title">Review and report accounts</h2>
        </div>
        <button type="button" className="ghost" aria-label="Close" onClick={onClose}>✕</button>
      </div>

      {sentReceipt ? (
        <div className="sent">
          <strong>✓ Reports sent (simulated) · {sentReceipt.count} accounts · reference {sentReceipt.reference}</strong>
          <p>Nothing was sent. This demo has no connection to any platform or authority.</p>
          <button type="button" className="primary" onClick={onClose}>Done</button>
        </div>
      ) : (
        <>
          <div className="filter-row">
            <label>Phase<select value={phase} onChange={(e) => filter(setPhase)(e.target.value === 'all' ? 'all' : (Number(e.target.value) as PhaseId))}><option value="all">All</option><option value="1">1 Candidates</option><option value="2">2 Campaign topics</option><option value="3">3 Election integrity</option></select></label>
            <label>Platform<select value={platform} onChange={(e) => filter(setPlatform)(e.target.value as 'all' | Platform)}><option value="all">All</option>{PLATFORM_SHARES.map(([name]) => <option key={name}>{name}</option>)}</select></label>
            <label>Confidence<select value={confidence} onChange={(e) => filter(setConfidence)(e.target.value as 'all' | Confidence)}><option value="all">All</option><option>High</option><option>Medium</option><option>Low</option></select></label>
            <label>Cluster<select value={cluster} onChange={(e) => filter(setCluster)(e.target.value)}><option value="all">All</option>{CLUSTERS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Status<select value={status} onChange={(e) => filter(setStatus)(e.target.value as 'all' | ReportStatus)}><option value="all">All</option><option>Not reported</option><option>Reported</option><option>Actioned</option></select></label>
          </div>

          <div className="table-scroll modal-table">
            <table>
              <caption>{formatNumber(rows.length)} accounts match. Handles are masked.</caption>
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all on this page" checked={pageAllSelected} onChange={togglePage} /></th>
                  <th>Handle</th><th>Platform</th><th>Cluster</th><th>Confidence</th><th>Criteria</th><th>First seen</th><th className="num">Posts</th><th>Phases</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} className={selected.has(row.id) ? 'selected' : ''}>
                    <td><input type="checkbox" aria-label={`Select ${row.handle}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} /></td>
                    <td className="mono">{row.handle}</td>
                    <td>{row.platform}</td>
                    <td>{row.cluster}</td>
                    <td>{row.confidence}</td>
                    <td className="mono" title={row.criteria.join('; ')} aria-label={row.criteria.join('; ')}>{FLAG_CRITERIA.map((item) => (row.criteria.includes(item) ? '●' : '○')).join('')}</td>
                    <td className="mono">{row.firstSeen}</td>
                    <td className="num">{row.matchedPosts}</td>
                    <td className="mono">{accountPhases(row, week).map((item) => `P${item}`).join(' ') || 'Below threshold'}</td>
                    <td>{accountStatus(row, week, sessionReported)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Previous</button>
            <span className="mono">Page {safePage + 1} of {pages}</span>
            <button type="button" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Next</button>
          </div>

          <p className="selection-line mono">
            {chosen.length} accounts selected{byPlatform.length > 0 ? ` · ${byPlatform.map(([name, count]) => `${name} ${count}`).join(' · ')}` : ''}
            {chosen.length !== sendable.length ? ` · ${sendable.length} not yet reported` : ''}
          </p>

          <fieldset>
            <legend>Report via</legend>
            {CHANNELS.map((item) => (
              <label key={item.id}>
                <input type="checkbox" checked={channels.has(item.id)} onChange={() => setChannels((current) => {
                  const next = new Set(current)
                  if (next.has(item.id)) next.delete(item.id)
                  else next.add(item.id)
                  return next
                })} />
                {item.label}
              </label>
            ))}
          </fieldset>

          <div className="evidence">
            <span>Evidence pack: <span className="mono">{formatNumber(chosen.reduce((sum, item) => sum + item.matchedPosts, 0))}</span> matched posts, cluster fingerprint, timestamps.</span>
            <button type="button" disabled={chosen.length === 0} onClick={() => downloadCsv(chosen, week, sessionReported)}>Download evidence pack (CSV)</button>
          </div>

          <label className="review">
            <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
            I have reviewed these accounts and the evidence.
          </label>
          <p className="caveat">Platforms decide on removal. ARGUS only flags and documents.</p>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="button" className="primary" disabled={!reviewed || sendable.length === 0 || channels.size === 0} onClick={send}>Send reports</button>
          </div>
        </>
      )}
    </dialog>
  )
}
