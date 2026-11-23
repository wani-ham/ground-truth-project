import { CAMPAIGN_TOPICS, type Narrative } from '../data/election'

const percent = (value: number) => `${value * 100 < 1 ? (value * 100).toFixed(1) : Math.round(value * 100)}%`
const overlap = (mainstream: number, fimi: number) => {
  const ratio = fimi / mainstream
  return ratio >= 1.5 ? 'High' : ratio >= 0.75 ? 'Medium' : 'Low'
}

interface Props { narratives: Narrative[]; filter: string | null; onFilter: (id: string | null) => void }

export function TopicRepository({ narratives, filter, onFilter }: Props) {
  const scale = 0.34
  return (
    <section className="panel" aria-label="Topic repository">
      <h2>Topic repository</h2>
      <ol className="pipeline">
        <li><strong>① Mainstream topics</strong><span>Top campaign topics from 12 national outlets, by share of election coverage</span></li>
        <li><strong>② Cross-check</strong><span>Same topics in watchlist outlets (Varkova Today + 6 proxy sites) and 3 known bot clusters</span></li>
        <li><strong>③ False narratives found</strong><span>Claims on that topic that match known disinformation</span></li>
      </ol>

      <h3 className="sub-head">Where FIMI pushes harder than the news</h3>
      <div className="dot-plot" role="img" aria-label={`Mainstream and FIMI share by topic. ${CAMPAIGN_TOPICS.map((topic) => `${topic.label}: mainstream ${percent(topic.mainstreamShare)}, FIMI ${percent(topic.fimiShare)}`).join('. ')}.`}>
        {CAMPAIGN_TOPICS.map((topic) => {
          const a = (topic.mainstreamShare / scale) * 100
          const b = (topic.fimiShare / scale) * 100
          return (
            <div key={topic.id} className="dot-row">
              <span className="truncate">{topic.label}</span>
              <div className="dot-track">
                <i className="dot-link" style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(a - b)}%` }} />
                <i className="dot dot-main" style={{ left: `${a}%` }} />
                <i className="dot dot-fimi" style={{ left: `${b}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="chart-legend"><span><i className="dot-key dot-main" />Mainstream share</span><span><i className="dot-key dot-fimi" />FIMI share</span></div>

      <div className="table-scroll">
        <table className="click-table">
          <thead><tr><th>Topic</th><th>Mainstream</th><th>FIMI</th><th>Overlap</th><th className="num">False-claim rate</th><th>Top false claim and fact</th><th className="num">Sources</th></tr></thead>
          <tbody>
            {CAMPAIGN_TOPICS.map((topic) => {
              const narrative = narratives.find((item) => item.target.id === topic.id)
              return (
                <tr key={topic.id} className={filter === topic.id ? 'selected' : ''}>
                  <td className="plain-cell"><button type="button" className="link" aria-pressed={filter === topic.id} onClick={() => onFilter(filter === topic.id ? null : topic.id)}>{topic.label}</button></td>
                  <td><span className="mono">{percent(topic.mainstreamShare)}</span><div className="meter meter-muted"><div style={{ width: `${(topic.mainstreamShare / scale) * 100}%` }} /></div></td>
                  <td><span className="mono">{percent(topic.fimiShare)}</span><div className="meter"><div style={{ width: `${(topic.fimiShare / scale) * 100}%` }} /></div></td>
                  <td>{overlap(topic.mainstreamShare, topic.fimiShare)}</td>
                  <td className="num">{percent(topic.falseClaimRate)}</td>
                  <td>{narrative ? <><span>{narrative.label}</span><span className="cell-sub">Fact: {narrative.truth}</span></> : <span className="muted">—</span>}</td>
                  <td className="num">{topic.sources.outlets + topic.sources.clusters}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="caveat">Mainstream outlets are the baseline for what the campaign is about. They are not assessed as sources of disinformation.</p>
    </section>
  )
}
