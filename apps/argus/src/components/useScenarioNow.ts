import { useEffect, useState } from 'react'

export interface ScenarioAnchor { date: number; chosenAt: number }

export const scenarioTime = (anchor: ScenarioAnchor) => new Date(anchor.date + (Date.now() - anchor.chosenAt))

export function useScenarioNow(anchor: ScenarioAnchor, intervalMs: number): Date {
  const [now, setNow] = useState(() => scenarioTime(anchor))

  useEffect(() => {
    setNow(scenarioTime(anchor))
    const timer = window.setInterval(() => setNow(scenarioTime(anchor)), intervalMs)
    return () => window.clearInterval(timer)
  }, [anchor, intervalMs])

  return now
}
