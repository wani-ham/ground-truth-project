import { DURATION_HOURS, type NetworkNode } from '../data/scenario'
import { dailyPickups, formatHour } from '../engine/playback'

const SPEEDS = [1, 2, 4]

interface Props {
  hour: number
  playing: boolean
  speed: number
  nodes: NetworkNode[]
  warningHour: number
  eliteHour: number
  onTogglePlay: () => void
  onRestart: () => void
  onScrub: (hour: number) => void
  onSpeed: (speed: number) => void
}

export function Timeline({ hour, playing, speed, nodes, warningHour, eliteHour, onTogglePlay, onRestart, onScrub, onSpeed }: Props) {
  const days = dailyPickups(nodes)
  const maxDay = Math.max(...days)
  const percent = (value: number) => `${(value / DURATION_HOURS) * 100}%`

  return (
    <section className="timeline" aria-label="Timeline">
      <div className="controls">
        <button type="button" className="primary play" onClick={onTogglePlay}>
          {playing ? 'Pause' : hour >= DURATION_HOURS ? 'Replay' : hour > 0 ? 'Resume' : 'Play'}
        </button>
        <button type="button" onClick={onRestart}>Restart</button>
        <div className="speed" role="group" aria-label="Playback speed">
          {SPEEDS.map((value) => (
            <button key={value} type="button" aria-pressed={speed === value} onClick={() => onSpeed(value)}>
              {value}×
            </button>
          ))}
        </div>
      </div>

      <div className="track">
        <div className="bars" aria-hidden="true">
          {days.map((count, i) => (
            <div key={i} className="bar-cell" title={`Day ${i + 1}: ${count} new pickups`}>
              <div
                className={(i + 1) * 24 <= hour ? 'bar past' : 'bar'}
                style={{ height: `${Math.max(count ? 8 : 0, (count / maxDay) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="marker marker-warning" style={{ left: percent(warningHour) }}>
          <span>◆ Warning</span>
        </div>
        <div className="marker marker-elite" style={{ left: percent(eliteHour) }}>
          <span>First elite pickup</span>
        </div>
        <div className="playhead" style={{ left: percent(hour) }} />
        <input
          type="range"
          min={0}
          max={DURATION_HOURS}
          step={1}
          value={hour}
          aria-label="Simulation time"
          aria-valuetext={formatHour(hour)}
          onChange={(event) => onScrub(Number(event.target.value))}
        />
        <div className="day-axis" aria-hidden="true">
          <span>Day 1</span>
          <span>Day 8</span>
          <span>Day 14</span>
        </div>
      </div>
    </section>
  )
}
