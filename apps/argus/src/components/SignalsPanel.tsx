import { SIGNAL_META, STAGES, WARNING_THRESHOLD, type AlertStage, type Snapshot } from '../engine/detection'

export const STAGE_ICON: Record<AlertStage, string> = { Monitor: '●', Elevated: '▲', Warning: '◆', Critical: '■' }

interface Props {
  snapshot: Snapshot
  onReviewAlert: () => void
}

export function SignalsPanel({ snapshot, onReviewAlert }: Props) {
  const stageIndex = STAGES.indexOf(snapshot.stage)
  const canAlert = stageIndex >= STAGES.indexOf('Warning')

  return (
    <section className="panel" aria-label="Early warning">
      <div className="panel-head">
        <h2>Early warning</h2>
        <span className={`stage-badge stage-${snapshot.stage.toLowerCase()}`}>
          <span aria-hidden="true">{STAGE_ICON[snapshot.stage]}</span> {snapshot.stage}
        </span>
      </div>

      <div className="score-row">
        <div className="score">
          {Math.round(snapshot.composite)}
          <small>/100</small>
        </div>
        <p>Pattern score. Warning fires at {WARNING_THRESHOLD}, before elites amplify.</p>
      </div>

      <ol className="stage-track" aria-label="Alert stages">
        {STAGES.map((stage, i) => (
          <li
            key={stage}
            className={`${i <= stageIndex ? `reached stage-${stage.toLowerCase()}` : ''}`}
            aria-current={i === stageIndex ? 'step' : undefined}
          >
            {stage}
          </li>
        ))}
      </ol>

      <ul className="signals">
        {SIGNAL_META.map((meta) => {
          const reading = snapshot.signals[meta.id]
          return (
            <li key={meta.id} title={meta.description}>
              <div className="signal-head">
                <span>{meta.label}</span>
                <strong>{Math.round(reading.score)}</strong>
              </div>
              <div
                className="meter"
                role="meter"
                aria-label={meta.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(reading.score)}
              >
                <div style={{ width: `${reading.score}%` }} />
              </div>
              <span className="signal-detail">{reading.detail}</span>
            </li>
          )
        })}
      </ul>

      <button type="button" className="primary full" disabled={!canAlert} onClick={onReviewAlert}>
        {canAlert ? 'Review alert briefing' : 'No alert to review yet'}
      </button>
    </section>
  )
}
