import { useEffect, useRef, useState } from 'react'
import { NARRATIVE } from '../data/scenario'
import { SIGNAL_META, type Snapshot } from '../engine/detection'
import { formatHour } from '../engine/playback'

const RECIPIENTS = [
  'Electoral commissions',
  'National governments',
  'Political parties',
  'Civil society and fact-checkers',
]

const ACTIONS = [
  'Verify the claim with electoral authorities and publish the facts.',
  'Prebunk the narrative in the affected member states.',
  'Brief parties and candidates before they repeat it.',
  'Report the coordinated accounts to platforms for review.',
]

interface Props {
  snapshot: Snapshot
  leadHours: number
  eliteHour: number
  onClose: () => void
}

export function AlertModal({ snapshot, leadHours, eliteHour, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [recipients, setRecipients] = useState<string[]>(RECIPIENTS.slice(0, 2))
  const [reviewed, setReviewed] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const toggleRecipient = (name: string) =>
    setRecipients((list) => (list.includes(name) ? list.filter((item) => item !== name) : [...list, name]))

  const beforeElite = snapshot.hour < eliteHour

  return (
    <dialog ref={dialogRef} className="alert-modal" aria-labelledby="alert-title" onClose={onClose}>
      <div className="modal-head">
        <div>
          <span className="eyebrow">Draft alert, simulated</span>
          <h2 id="alert-title">{NARRATIVE.title}</h2>
        </div>
        <button type="button" className="ghost" aria-label="Close" onClick={onClose}>✕</button>
      </div>

      {sent ? (
        <div className="sent">
          <strong>✓ Simulated send complete</strong>
          <p>In a live system this would go to: {recipients.join(', ')}.</p>
          <p>Nothing was sent. This demo has no connection to any outside service.</p>
          <button type="button" className="primary" onClick={onClose}>Done</button>
        </div>
      ) : (
        <>
          <p className="summary">
            At {formatHour(snapshot.hour)}, ARGUS rated this narrative <strong>{snapshot.stage}</strong> with a pattern score
            of <strong>{Math.round(snapshot.composite)}/100</strong>.{' '}
            {beforeElite
              ? `In this scenario, the first politician or broadcaster repeats it ${leadHours} hours after the warning.`
              : 'Politicians or broadcasters are already repeating it.'}
          </p>
          <p className="claim">False claim: {NARRATIVE.claim}</p>

          <div className="modal-grid">
            <div>
              <h3>Evidence</h3>
              <ul>
                {SIGNAL_META.filter((meta) => snapshot.signals[meta.id].score > 0).map((meta) => (
                  <li key={meta.id}><strong>{meta.label}:</strong> {snapshot.signals[meta.id].detail}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Recommended actions</h3>
              <ul>{ACTIONS.map((action) => <li key={action}>{action}</li>)}</ul>
            </div>
          </div>

          <fieldset>
            <legend>Recipients</legend>
            {RECIPIENTS.map((name) => (
              <label key={name}>
                <input type="checkbox" checked={recipients.includes(name)} onChange={() => toggleRecipient(name)} />
                {name}
              </label>
            ))}
          </fieldset>

          <label className="review">
            <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
            I am the analyst and I have reviewed this evidence.
          </label>

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="button" className="primary" disabled={!reviewed || recipients.length === 0} onClick={() => setSent(true)}>
              Send alert (simulated)
            </button>
          </div>
        </>
      )}
    </dialog>
  )
}
