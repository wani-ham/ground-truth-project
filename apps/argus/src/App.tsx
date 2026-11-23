import { useCallback, useEffect, useState } from 'react'
import { ElectionCountdown } from './components/ElectionCountdown'
import { PhasesDashboard } from './components/PhasesDashboard'
import { ReplayView } from './components/ReplayView'
import { scenarioTime, type ScenarioAnchor } from './components/useScenarioNow'
import { DEFAULT_PRESET, SCENARIO_PRESETS, WEEKS, type PhaseId } from './data/election'
import { localDate, weekIndexFor } from './engine/phases'

type Route = { view: 'replay' } | { view: 'phases'; phase: PhaseId | null }

function parseHash(hash: string): Route {
  const match = hash.match(/^#phases(?:\/([123]))?$/)
  if (!match) return { view: 'replay' }
  return { view: 'phases', phase: match[1] ? (Number(match[1]) as PhaseId) : null }
}

const PLAY_STEP_MS = 1400
const LAST_WEEK = WEEKS.length - 1

const anchorAt = (date: Date): ScenarioAnchor => ({ date: date.getTime(), chosenAt: Date.now() })

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  const [presetId, setPresetId] = useState<string | null>(DEFAULT_PRESET.id)
  const [anchor, setAnchor] = useState<ScenarioAnchor>(() => anchorAt(localDate(DEFAULT_PRESET.date)))

  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((hash: string) => {
    window.location.hash = hash
  }, [])

  const choosePreset = useCallback((id: string) => {
    const preset = SCENARIO_PRESETS.find((item) => item.id === id)
    if (!preset) return
    setPlaying(false)
    setPresetId(id)
    setAnchor(anchorAt(localDate(preset.date)))
  }, [])

  const moveToWeek = useCallback((week: number) => {
    const clamped = Math.max(0, Math.min(LAST_WEEK, week))
    const date = localDate(WEEKS[clamped])
    date.setHours(10, 0, 0, 0)
    setPresetId(null)
    setAnchor(anchorAt(date))
  }, [])

  const chooseWeek = useCallback((week: number) => {
    setPlaying(false)
    moveToWeek(week)
  }, [moveToWeek])

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false)
      return
    }
    if (weekIndexFor(scenarioTime(anchor)) >= LAST_WEEK) moveToWeek(0)
    setPlaying(true)
  }, [anchor, moveToWeek, playing])

  useEffect(() => {
    if (!playing) return
    if (route.view !== 'phases') {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => {
      // Data behind an open report or review dialog must not change while it is being read.
      if (document.querySelector('dialog[open]')) {
        setPlaying(false)
        return
      }
      const next = weekIndexFor(scenarioTime(anchor)) + 1
      moveToWeek(next)
      if (next >= LAST_WEEK) setPlaying(false)
    }, PLAY_STEP_MS)
    return () => window.clearTimeout(timer)
  }, [anchor, moveToWeek, playing, route.view])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || document.querySelector('dialog[open]')) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, select, textarea, [contenteditable="true"]') && event.key !== 'Escape') return
      if (event.key === '1') go('replay')
      if (event.key === '2') go('phases')
      if (route.view !== 'phases') return
      if (event.key === '[') chooseWeek(weekIndexFor(scenarioTime(anchor)) - 1)
      if (event.key === ']') chooseWeek(weekIndexFor(scenarioTime(anchor)) + 1)
      if (event.key === 'Escape' && route.phase) go('phases')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [anchor, chooseWeek, go, route])

  const phasesOpen = route.view === 'phases'

  return (
    <div className={`app ${phasesOpen ? 'app-phases' : ''}`}>
      <div className="sim-banner" role="note">
        <strong>Simulated scenario.</strong> All entities are fictional.
      </div>

      <header className="app-header">
        <div className="brand">
          <div className="brand-row">
            <h1>ARGUS</h1>
            <a className="product-link" href="../gaia/">GAIA →</a>
          </div>
          <span>Disinformation network early warning</span>
        </div>
        <span aria-hidden="true" />
        <div className="view-switch" role="group" aria-label="ARGUS view">
          <button type="button" aria-pressed={!phasesOpen} onClick={() => go('replay')}>Network replay</button>
          <button type="button" aria-pressed={phasesOpen} onClick={() => go('phases')}>Election phases</button>
        </div>
        <ElectionCountdown anchor={anchor} onOpen={() => go('phases')} />
      </header>

      <ReplayView active={!phasesOpen} />
      <PhasesDashboard
        active={phasesOpen}
        phase={route.view === 'phases' ? route.phase : null}
        anchor={anchor}
        presetId={presetId}
        playing={playing}
        onTogglePlay={togglePlay}
        onPreset={choosePreset}
        onWeek={chooseWeek}
        onNavigate={go}
      />
    </div>
  )
}
