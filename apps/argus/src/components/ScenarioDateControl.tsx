import { SCENARIO_PRESETS, WEEKS } from '../data/election'
import { formatDay, formatShort } from '../engine/phases'

interface Props {
  presetId: string | null
  week: number
  now: Date
  playing: boolean
  onTogglePlay: () => void
  onPreset: (id: string) => void
  onWeek: (week: number) => void
}

export function ScenarioDateControl({ presetId, week, now, playing, onTogglePlay, onPreset, onWeek }: Props) {
  return (
    <section className="panel scenario-control" aria-label="Scenario date (demo control)">
      <div>
        <span className="eyebrow">Scenario date (demo control)</span>
        <strong className="mono">{formatDay(now)}</strong>
      </div>
      <div className="segmented" role="group" aria-label="Scenario presets">
        {SCENARIO_PRESETS.map((preset) => (
          <button key={preset.id} type="button" aria-pressed={presetId === preset.id} onClick={() => onPreset(preset.id)}>
            {preset.label}
          </button>
        ))}
      </div>
      <div className="week-play">
        <button type="button" className="primary" aria-label={playing ? 'Pause scenario' : 'Play scenario week by week'} onClick={onTogglePlay}>
          <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span> {playing ? 'Pause' : 'Play'}
        </button>
        <label className="week-slider">
          <span className="mono">Week of {formatShort(WEEKS[week])}</span>
          <input
            type="range"
            min={0}
            max={WEEKS.length - 1}
            step={1}
            value={week}
            aria-valuetext={`Week of ${formatShort(WEEKS[week])}`}
            onChange={(event) => onWeek(Number(event.target.value))}
          />
        </label>
      </div>
      <p className="caveat">In production this is today’s date. Press [ or ] to step one week.</p>
    </section>
  )
}
