import { useMemo, useState } from 'react'
import { PHASE_IDS, WHY_FALSE, type Narrative, type PhaseId } from '../data/election'
import { formatDay } from '../engine/phases'

const GROUPS: Record<PhaseId, string> = { 1: 'About the candidates', 2: 'About campaign topics', 3: 'About voting and counting' }

const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function publicHtml(narratives: Narrative[], updated: Date): string {
  const groups = PHASE_IDS.map((phase) => {
    const cards = narratives.filter((item) => item.phase === phase).map((item) => `<article><p class="fact">${esc(item.truth)}</p><p class="claim">Claim circulating: ${esc(item.claim)}</p><p><strong>Why it's false:</strong> ${esc(WHY_FALSE[item.id])}</p><p class="source">Source: ${esc(item.truthSource)}</p></article>`).join('')
    return cards ? `<section><h2>${GROUPS[phase]}</h2>${cards}</section>` : ''
  }).join('')
  return `<div class="election-facts"><style>.election-facts{max-width:760px;margin:0 auto;padding:24px;color:#14110f;background:#faf8f4;font-family:system-ui,sans-serif;line-height:1.55}.election-facts h1{font-size:28px;margin:0 0 4px}.election-facts h2{font-size:19px;margin:24px 0 8px}.election-facts article{padding:12px 14px;margin:0 0 10px;border:1px solid #efeae1;border-radius:4px}.election-facts p{margin:0 0 6px}.election-facts .fact{font-weight:700}.election-facts .claim,.election-facts .source,.election-facts .sub{color:#6a615a;font-size:14px}</style><h1>Facts about the 2027 general election</h1><p class="sub">Updated weekly · last updated ${esc(formatDay(updated))}</p><p>False claims about the election are circulating. Here are the facts.</p>${groups}<p class="source">Monitoring support: GroundTruth ARGUS</p></div>`
}

export function DebunkPagePreview({ narratives, updated, canExport }: { narratives: Narrative[]; updated: Date; canExport: boolean }) {
  const [message, setMessage] = useState('')
  const html = useMemo(() => publicHtml(narratives, updated), [narratives, updated])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(html)
      setMessage('HTML copied.')
    } catch {
      setMessage('Copy failed. Use Download HTML instead.')
    }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Facts about the 2027 general election</title></head><body style="margin:0;background:#faf8f4">${html}</body></html>`], { type: 'text/html' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'facts-about-the-election-simulated.html'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="public-preview">
      <p className="caveat">The Commission decides what to publish. Narratives are included only after the analyst review.</p>
      <div className="gov-frame">
        <div className="gov-bar"><span className="crest" aria-hidden="true" /> Norvane Electoral Commission · elections.nv (fictional)</div>
        <div className="gov-body">
          <h3>Facts about the 2027 general election</h3>
          <p className="gov-muted">Updated weekly · last updated {formatDay(updated)}</p>
          <p>False claims about the election are circulating. Here are the facts.</p>
          {PHASE_IDS.map((phase) => {
            const items = narratives.filter((item) => item.phase === phase)
            if (!items.length) return null
            return (
              <section key={phase}>
                <h4>{GROUPS[phase]}</h4>
                {items.map((item) => (
                  <article key={item.id} className="gov-card">
                    <p className="gov-fact">{item.truth}</p>
                    <p className="gov-muted">Claim circulating: {item.claim}</p>
                    <p><strong>Why it’s false:</strong> {WHY_FALSE[item.id]}</p>
                    <p className="gov-muted">Source: {item.truthSource}</p>
                  </article>
                ))}
              </section>
            )
          })}
          <p className="gov-muted gov-foot">Monitoring support: GroundTruth ARGUS</p>
        </div>
      </div>
      <div className="modal-actions no-print">
        {!canExport && <span className="caveat">Complete the analyst review to export.</span>}
        {message && <span className="caveat" role="status">{message}</span>}
        <button type="button" disabled={!canExport} onClick={copy}>Copy HTML</button>
        <button type="button" disabled={!canExport} onClick={download}>Download HTML</button>
      </div>
    </div>
  )
}
