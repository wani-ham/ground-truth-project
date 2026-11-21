import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertModal } from './components/AlertModal'
import { NetworkGraph } from './components/NetworkGraph'
import { NetworkTable } from './components/NetworkTable'
import { NodeDetails } from './components/NodeDetails'
import { SignalsPanel } from './components/SignalsPanel'
import { Timeline } from './components/Timeline'
import { DURATION_HOURS, EDGES, NARRATIVE, NODES } from './data/scenario'
import { buildTimeline, firstElitePickup, firstHourAtStage } from './engine/detection'
import { advanceHour, formatHour } from './engine/playback'

const HOURS_PER_SECOND = 8

export default function App() {
  const timeline = useMemo(() => buildTimeline(NODES), [])
  const warningHour = useMemo(() => firstHourAtStage(timeline, 'Warning')!, [timeline])
  const eliteHour = useMemo(() => firstElitePickup(NODES)!, [])

  const [hour, setHour] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<'graph' | 'table'>('graph')
  const [alertOpen, setAlertOpen] = useState(false)
  const [warningPaused, setWarningPaused] = useState(false)

  const hourRef = useRef(0)
  const warningShownRef = useRef(false)

  const moveTo = (next: number) => {
    hourRef.current = next
    setHour(next)
  }

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      const elapsedMs = now - last
      last = now
      const previous = hourRef.current
      let next = advanceHour(previous, elapsedMs, HOURS_PER_SECOND * speed)

      if (!warningShownRef.current && previous < warningHour && next >= warningHour) {
        warningShownRef.current = true
        next = warningHour
        moveTo(next)
        setWarningPaused(true)
        setPlaying(false)
        return
      }

      moveTo(next)
      if (next >= DURATION_HOURS) {
        setPlaying(false)
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, warningHour])

  const togglePlay = () => {
    setWarningPaused(false)
    if (hourRef.current >= DURATION_HOURS) {
      warningShownRef.current = false
      moveTo(0)
    }
    setPlaying((value) => !value)
  }

  const restart = () => {
    warningShownRef.current = false
    setWarningPaused(false)
    setSelectedId(null)
    moveTo(0)
    setPlaying(true)
  }

  const scrub = (next: number) => {
    setPlaying(false)
    setWarningPaused(false)
    if (next < warningHour) warningShownRef.current = false
    moveTo(next)
  }

  const snapshot = timeline[Math.min(Math.floor(hour), DURATION_HOURS)]
  const selected = NODES.find((node) => node.id === selectedId && node.pickupHour <= hour) ?? null
  const leadHours = Math.round(eliteHour - warningHour)

  return (
    <div className="app">
      <div className="sim-banner" role="note">
        <strong>Simulated scenario.</strong> All entities are fictional.
      </div>

      <header className="app-header">
        <div className="brand">
          <h1>ARGUS</h1>
          <span>Disinformation network early warning</span>
        </div>
        <div className="narrative">
          <span className="eyebrow">Tracked narrative</span>
          <strong>{NARRATIVE.title}</strong>
          <span>False claim: {NARRATIVE.claim}</span>
        </div>
        <div className="clock" aria-live="off">
          <span className="eyebrow">Simulation time</span>
          <strong>{formatHour(hour)}</strong>
        </div>
      </header>

      <main className="workspace">
        <section className="graph-panel" aria-label="Disinformation network">
          <div className="view-toggle" role="group" aria-label="Network view">
            <button type="button" aria-pressed={view === 'graph'} onClick={() => setView('graph')}>
              Graph
            </button>
            <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>
              Table
            </button>
          </div>
          {view === 'graph' ? (
            <NetworkGraph nodes={NODES} edges={EDGES} hour={hour} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          ) : (
            <NetworkTable nodes={NODES} hour={hour} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          )}
          {warningPaused && (
            <div className="warning-callout" role="alert">
              <div>
                <strong>◆ Early warning triggered</strong>
                <span>
                  The pattern matched {leadHours} hours ({(leadHours / 24).toFixed(1)} days) before the first politician or
                  broadcaster picks up the claim.
                </span>
              </div>
              <button type="button" className="primary" onClick={() => setAlertOpen(true)}>
                Review alert
              </button>
              <button type="button" onClick={togglePlay}>
                Continue
              </button>
            </div>
          )}
        </section>

        <aside className="sidebar">
          <SignalsPanel snapshot={snapshot} onReviewAlert={() => setAlertOpen(true)} />
          <NodeDetails node={selected} nodes={NODES} onSelect={setSelectedId} />
        </aside>
      </main>

      <Timeline
        hour={hour}
        playing={playing}
        speed={speed}
        nodes={NODES}
        warningHour={warningHour}
        eliteHour={eliteHour}
        onTogglePlay={togglePlay}
        onRestart={restart}
        onScrub={scrub}
        onSpeed={setSpeed}
      />

      {alertOpen && (
        <AlertModal snapshot={snapshot} leadHours={leadHours} eliteHour={eliteHour} onClose={() => setAlertOpen(false)} />
      )}
    </div>
  )
}
