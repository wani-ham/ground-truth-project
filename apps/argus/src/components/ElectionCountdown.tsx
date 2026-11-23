import { countdownView } from '../engine/phases'
import { useScenarioNow, type ScenarioAnchor } from './useScenarioNow'

export function ElectionCountdown({ anchor, onOpen }: { anchor: ScenarioAnchor; onOpen: () => void }) {
  const now = useScenarioNow(anchor, 1000)
  const view = countdownView(now)

  return (
    <button type="button" className="countdown" aria-label={`${view.summary}. Open election phases.`} onClick={onOpen}>
      <span className="countdown-eyebrow">
        {view.state === 'polls-open' && <span className="live-dot" aria-hidden="true">●</span>}
        <span className="eyebrow">{view.eyebrow}</span>
        {view.integrityWindow && <span className="integrity-chip">Integrity window</span>}
      </span>
      <strong className={view.underline ? 'underlined' : ''} aria-live="off">{view.main}</strong>
      <span className="countdown-sub">{view.sub}</span>
    </button>
  )
}
