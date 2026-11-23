# ARGUS · Election phases dashboard — build spec

> **For Claude Code.** This file is a build spec. Build exactly what it describes, in the existing ARGUS app, reusing its styles and components. Everything shown on screen is **simulated**. All countries, outlets, accounts, politicians and claims are fictional, as in the rest of ARGUS.

> **Corrected version.** Changes from the first draft: current-phase rule, phase 1 scoring target, election-day and post-certification presets, hourly curve scale, date-derived account status, exact breakdown totals, complete phase 2 narrative data, DSA reporting labels, report numbering, mock values, time-consistent fact-checks, the pencil fact-check, and a fictional stand-in (Kestria) for Ukraine.

---

## 0. Summary

ARGUS today has one view: a 14-day replay of one false claim ("Swapped Ballots") spreading through a network, with an early-warning score.

This spec adds a **second dashboard inside ARGUS**, called **Election phases**. It tracks one upcoming election through the three phases of the Russian FIMI (foreign information manipulation and interference) election playbook:

| # | Phase (short label) | EEAS heading (already used in Gaia `DATA.stages`) | What we look for | Typical timing |
|---|---|---|---|---|
| 1 | **Candidates** | Delegitimising leaders | Disinformation about the politicians who are standing | Months before the vote |
| 2 | **Campaign topics** | Weaponising divisions | False claims attached to the real campaign topics that mainstream news covers | Last 6–8 weeks |
| 3 | **Election integrity** | Undermining electoral integrity | "Rigged", "fraud", "postal votes manipulated" narratives | Last 2 weeks, election day, and after |

It also adds five things that are always visible or one click away:

1. A **phase overview** with three cards, each with a **confidence score that the phase has started** and an estimated start date.
2. A **phase drill-down** (click a card) with that phase's network analysis and top narratives.
3. A **flagged-accounts counter** for likely bot accounts, with a simulated "report to platform" flow.
4. A **weekly report to electoral oversight**, which the authority can publish as a public "Facts about the election" page.
5. An **election countdown in the top-right of the ARGUS header, on every ARGUS view.**

---

## 1. Where it lives

### 1.1 Codebase

- Repo: `wani-ham/ground-truth-project`, app at `apps/argus/` (React 19 + Vite + TypeScript, `d3-force`). Deployed to `https://wani-ham.github.io/ground-truth-project/argus/`.
- Gaia (`apps/gaia/index.html`) links to ARGUS from its nav. **Do not change Gaia** for this work.
- Add no new runtime dependencies. Charts are hand-drawn SVG, like `Timeline.tsx`.

> If this spec is instead built as a single standalone HTML file (for the Gaia mockup folder), keep the same layout, copy and data, use the CSS tokens in §2, and inline everything. Same acceptance criteria (§12).

### 1.2 New files

```
apps/argus/src/
  App.tsx                         # add view switch + countdown (edit)
  styles.css                      # append new classes (edit)
  data/election.ts                # NEW: all data for this dashboard (§10)
  engine/phases.ts                # NEW: phase confidence + date filtering (§4.3)
  engine/phases.test.ts           # NEW: vitest tests (§12)
  components/ElectionCountdown.tsx
  components/PhasesDashboard.tsx  # the new view (overview + drill-down host)
  components/PhaseCard.tsx
  components/PhaseDetail.tsx      # drill-down panel
  components/PhaseNetwork.tsx     # static network for one phase
  components/NarrativeList.tsx
  components/TopicRepository.tsx  # phase 2 only
  components/BotCounter.tsx
  components/ReportAccountsModal.tsx
  components/WeeklyReportModal.tsx
  components/DebunkPagePreview.tsx
  components/ScenarioDateControl.tsx
```

Move the current replay view's JSX out of `App.tsx` into `components/ReplayView.tsx` so `App.tsx` only holds the shell (banner, header, view switch).

---

## 2. Visual language (match existing ARGUS)

Use the tokens already in `apps/argus/src/styles.css`. Do not add colours.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#faf8f4` | Page and panel background. Never pure white. |
| `--paper-deep` | `#efeae1` | Borders, tracks, empty bars, muted fills |
| `--ink` | `#14110f` | Text |
| `--ink-muted` | `#6a615a` | Secondary text, labels |
| `--burgundy` | `#7a1f2b` | Header band, primary buttons, active state, highest severity |
| `--burgundy-deep` | `#5e141e` | Hover, "critical" |
| `--font-display` | Geist Variable | Headings |
| `--font-body` | Inter Variable | Body |
| `--font-data` | IBM Plex Mono | Every number, date, countdown, score |

Reuse existing classes: `.panel`, `.panel-head`, `.eyebrow`, `.stage-badge` + `.stage-monitor|elevated|warning|critical`, `.meter`, `.score`, `.score-row`, `button.primary`, `button.ghost`, `button.link`, `table`, `.alert-modal` (native `<dialog>`), `fieldset`, `.review`, `.modal-actions`, `.sent`, `.caveat`, `.sim-banner`.

Phase status colours map onto the existing stage tokens, so no new hues are needed:

| Phase status | Class | Look |
|---|---|---|
| Not detected | `stage-monitor` | Paper-deep fill, ink text |
| Emerging | `stage-elevated` | Ink-muted fill, paper text |
| Active | `stage-warning` | Burgundy fill, paper text |
| Peak | `stage-critical` | Burgundy-deep fill, paper text |

Icons: reuse `STAGE_ICON` shapes (● ▲ ◆ ■) for the four statuses, in that order. Status must never be shown by colour alone: always icon + word.

---

## 3. App shell changes (all ARGUS views)

### 3.1 Header

Current header: `[ARGUS + GAIA→ link] [Tracked narrative] [Simulation time]`.

New header grid: `auto | minmax(0,1fr) | auto | auto`

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Simulated scenario. All entities are fictional.                                  (banner)│
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ ARGUS  [GAIA →]          [ Network replay | Election phases ]     NORVANE GENERAL ELECTION│
│ Disinformation early…     (view switch, centre)                   20d 21h 00m 00s         │
│                                                                   Sun 7 Mar 2027 · 07:00 │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- **View switch**: two buttons with `aria-pressed`, same style as `.view-toggle` but on burgundy (paper outline, paper fill when pressed, burgundy text when pressed). Keyboard: `1` = Network replay, `2` = Election phases. Keep the view in the URL hash (`#replay`, `#phases`) so a link opens the right view.
- **Network replay view** keeps "Tracked narrative" and "Simulation time" but moves them into a slim sub-bar under the header (same burgundy-deep background, 12px text), so the header's right-hand slot is free for the countdown.

### 3.2 Election countdown (top right, always visible)

Component: `ElectionCountdown.tsx`. Pinned in the header's right-most column on every view, including when a modal is open (it sits under the backdrop, that is fine).

| State | Eyebrow | Main line (mono, 22px, `tabular-nums`) | Sub line (12px) |
|---|---|---|---|
| Before polls open | `NORVANE GENERAL ELECTION` | `20d 21h 00m 00s` | `Sun 7 Mar 2027 · polls open 07:00` |
| Polls open (07:00–22:00 election day) | `POLLS OPEN` with a pulsing ● | `Closes in 10h 00m 00s` | `Election day · Sun 7 Mar 2027` |
| After polls close, before certification | `RESULT CERTIFICATION` | `Certified in 8d 02h` | `Polls closed 1d ago` |
| After certification | `ELECTION CERTIFIED` | `+3 days` | `Phase 3 monitoring continues until 7 Apr 2027` |

Rules:
- Time source is the **scenario clock** (§3.3), ticking once per second.
- Under 30 days: the main line gets a thin paper underline. Under 7 days: show the phase-3 hint `Integrity window` as a small paper-outline chip after the eyebrow.
- `aria-live="off"` on the ticking number; put a visually hidden, non-ticking summary in `aria-label` ("20 days until the Norvane general election on 7 March 2027").
- Clicking the countdown opens the Election phases view.

### 3.3 Scenario clock

The demo must be able to show all three phases. A real clock cannot, so the dashboard runs on a scenario date.

- `scenarioNow = presetDate + (Date.now() − presetChosenAt)`, so the countdown visibly ticks.
- `ScenarioDateControl.tsx` sits at the top of the Election phases view (not in the header): a segmented control with five presets plus a date slider.

| Preset | Scenario date | What it shows |
|---|---|---|
| `12 weeks out` | Tue 15 Dec 2026, 10:00 | Phase 1 active, phase 2 not detected |
| `3 weeks out` **(default)** | Sun 14 Feb 2027, 10:00 | Phase 1 sustained, phase 2 active, phase 3 emerging. "Moving towards phase 3" banner |
| `Election day` | Sun 7 Mar 2027, 12:00 | Polls open, polls-close countdown, hourly chart |
| `2 days after` | Tue 9 Mar 2027, 10:00 | Phase 3 at peak, certification countdown |
| `After certification` | Sat 20 Mar 2027, 12:00 | Election certified, phase 3 monitoring continues |

- The slider covers 2 Nov 2026 → 29 Mar 2027 in weekly steps, labelled with the mono week date.
- Label the control: `Scenario date (demo control)`. It is a demo device and should look like one: `.caveat` style text next to it, "In production this is today's date."
- Keyboard: `[` and `]` step the slider one week.

---

## 4. Election phases view — overview

### 4.1 Layout (desktop ≥ 1240px)

```
┌ Scenario date control ──────────────────────────────────────────────────────────────────┐
├ Status banner: "◆ Moving towards phase 3 · Election integrity (41% confidence)" ───────┤
├───────────────────────────── Phase overview (3 cards in a row) ──────────────────────────┤
│ ┌ 1 Candidates ─────────┐ ┌ 2 Campaign topics ────┐ ┌ 3 Election integrity ─┐          │
│ │ ■ Peak                │ │ ◆ Active              │ │ ▲ Emerging            │          │
│ │ 96%  confidence       │ │ 84%                   │ │ 41%                   │          │
│ │ started ~30 Nov 2026  │ │ started ~18 Jan 2027  │ │ precursors from 25 Jan│          │
│ │ ±3 days               │ │ ±3 days               │ │ not yet confirmed     │          │
│ │ [weekly sparkline]    │ │ [weekly sparkline]    │ │ [weekly sparkline]    │          │
│ │ Top: "Marsk is unwell"│ │ Top: "Energy cap…"    │ │ Top: "Postal votes…"  │          │
│ │ 7 narratives · 969    │ │ 7 narratives · 1,036  │ │ 2 narratives · 163    │          │
│ │ flagged accounts      │ │ flagged accounts      │ │ flagged accounts      │          │
│ │        Open phase →   │ │        Open phase →   │ │        Open phase →   │          │
│ └───────────────────────┘ └───────────────────────┘ └───────────────────────┘          │
├───────────────────────────── Phase timeline (full width) ────────────────────────────────┤
│ stacked weekly volumes for the 3 phases, election-day marker, "today" playhead,          │
│ detected start markers per phase                                                         │
├──────────────── Flagged accounts (left, 2/3) ──────┬──── Weekly oversight report (1/3) ─┤
│ BotCounter (§7)                                    │ Report card (§8)                    │
└────────────────────────────────────────────────────┴─────────────────────────────────────┘
```

- 980–1240px: phase cards stay 3-up, bottom row stacks.
- < 980px: everything single column, cards full width; header follows existing `@media (max-width: 980px)` rules (countdown drops under the brand, left-aligned).

### 4.2 Phase card (`PhaseCard.tsx`)

Whole card is a `<button>` (or has one full-card link) that opens the drill-down. Content top to bottom:

1. `.eyebrow`: `PHASE 1` · EEAS heading in muted text ("Delegitimising leaders").
2. Title (display font, 18px, burgundy): short label.
3. Status badge: icon + word (`Not detected` / `Emerging` / `Active` / `Peak`).
4. **Confidence that the phase has started**: big mono number (32px, `.score`), `%` small. Under it a `.meter`.
5. **Estimated start**: `started ~30 Nov 2026 ±3 days` (mono date). If status is `Emerging`: `precursors since 25 Jan 2027 · not yet confirmed`. If `Not detected`: `no start detected`.
6. Weekly sparkline (SVG, 120×32): this phase's narrative-matched posts per week up to `scenarioNow`. Detected start week marked with a short dashed tick.
7. Top narrative (one line, ellipsis) with its rank-1 label.
8. Footer facts in mono: `{n} narratives · {n} flagged accounts`.
9. `Open phase →` in burgundy.

The card for the **current phase** (the latest phase that is `Active` or `Peak`; if none, the latest `Emerging` phase; if none, no card) gets a 2px burgundy border and the label `Current phase` in the eyebrow.

### 4.3 How confidence is calculated (`engine/phases.ts`)

Show this logic in a `How is this scored?` `button.link` on each card, opening a small popover with the indicator list and their current values (same look as `SignalsPanel` meters).

Each phase has four indicators, each scored 0–100. Confidence = weighted sum, rounded.

| Phase | Indicator | Weight | Scores 100 at |
|---|---|---:|---|
| 1 | Candidate-targeted narratives from known FIMI sources (watchlist outlets) | 35% | 3 distinct narratives about listed candidates |
| 1 | Coordinated posting about candidates (near-duplicate text from an account cluster within 12 h) | 30% | 12 coordinated posts in 12 h |
| 1 | Volume vs. pre-campaign baseline | 20% | 4× baseline |
| 1 | Pickup outside the FIMI network (national outlets, organic groups) | 15% | 3 national outlets |
| 2 | Overlap between top-10 mainstream campaign topics and watchlist-outlet topics | 35% | 7 of 10 topics |
| 2 | False-claim share on those topics in known bot networks | 25% | 30% of topic mentions |
| 2 | Coordinated posting on campaign topics | 25% | 12 coordinated posts in 12 h |
| 2 | Cross-platform jump (same claim on ≥3 platforms in 72 h) | 15% | 4 platforms |
| 3 | Integrity-claim volume vs. baseline ("rigged", "fraud", "postal votes", "count") | 30% | 5× baseline |
| 3 | Pre-emptive "don't trust the count" framing from watchlist outlets | 25% | 4 outlets |
| 3 | Coordinated posting on integrity claims | 30% | 12 coordinated posts in 12 h |
| 3 | Elite pickup (candidate or broadcaster repeats an integrity claim) | 15% | 2 elite pickups |

Status from confidence:

| Status | Rule |
|---|---|
| Not detected | < 30 |
| Emerging | 30–59 |
| Active | ≥ 60 |
| Peak | ≥ 90 |

**Estimated start date** = the Monday of the first week whose confidence reached 60, with `±` = 3 days if confidence rose by 25 points or more that week, otherwise 5 days. Precursor date (for `Emerging`) = the Monday of the first week ≥ 30.

**"Moving towards phase N" banner**: shown when phase N is `Emerging` and phase N−1 is `Active` or `Peak`. Text template: `◆ Moving towards phase {N} · {short} · {confidence}% confidence, {up|down} {delta} points this week` (default preset: `◆ Moving towards phase 3 · Election integrity · 41% confidence, up 3 points this week`). Burgundy band, like `.warning-callout`, with a `Open phase 3` button.

For the demo, the per-week indicator scores are precomputed in `data/election.ts` (§10.3); `phases.ts` only selects the week for `scenarioNow`, applies the weights and derives status and dates. Keep weights and thresholds as named constants, like `detection.ts`.

### 4.4 Phase timeline

Full-width SVG, 160px tall:
- X axis: weeks 2 Nov 2026 → 29 Mar 2027 (mono, every 2nd week labelled).
- Three stacked areas, one per phase. Fills: phase 1 `--ink`, phase 2 `--ink-muted`, phase 3 `--burgundy`. Also a hatch pattern per phase so it works without colour.
- Weeks after `scenarioNow` are drawn in `--paper-deep` outline only ("not yet happened").
- Vertical dashed markers: each phase's detected start (`P1 start`, `P2 start`), election day (`Election · 7 Mar`, solid burgundy line), certification (`Certified · 17 Mar`).
- Playhead at `scenarioNow` (1px ink line, same as `Timeline.tsx`).
- Hover a week: tooltip (`.graph-tooltip`) with the three volumes and new flagged accounts that week.

---

## 5. Phase drill-down (`PhaseDetail.tsx`)

Opens when a phase card is clicked. Implementation: replaces the overview area below the scenario control (not a modal), with a back link `← All phases`, and a phase stepper at the top (`1 Candidates · 2 Campaign topics · 3 Election integrity`) to jump between phases. URL hash: `#phases/1`, `#phases/2`, `#phases/3`. `Esc` returns to the overview.

### 5.1 Common layout (all three phases)

```
┌ ← All phases     [1 Candidates] [2 Campaign topics] [3 Election integrity]                ┐
├ Phase header: title · EEAS heading · status badge · confidence 84% · started ~18 Jan ±3d ┤
│ One-paragraph "What this phase is" (copy in §5.2–5.4)                                    │
├──────────────────── Network analysis (left, 3/5) ───┬── Top narratives (right, 2/5) ────┤
│ PhaseNetwork                                         │ NarrativeList                     │
│                                                      │                                   │
├──────────────────── Phase-specific panel (full width) ───────────────────────────────────┤
│ P1: Candidate exposure table · P2: Topic repository · P3: Integrity watch               │
├──────────────────── Indicators (SignalsPanel-style meters) ──┬─ Accounts in this phase ──┤
└──────────────────────────────────────────────────────────────┴───────────────────────────┘
```

### 5.2 Network analysis (`PhaseNetwork.tsx`)

- Same five tiers and node shapes as the replay view: **Origin → Laundering → Relay → Amplification → Mainstream**. Import `tierShape` from `NetworkGraph.tsx` and the `.tier-fill-*` classes. Columns left to right; lanes are not by country here (single election), instead by **narrative**: the top 4 narratives of the phase are horizontal lanes, nodes sit in the lane of the narrative they carried most.
- **Static** (no playback). Only nodes and edges with `firstSeen ≤ scenarioNow` are drawn; newer ones are hidden.
- Node size: `4 + 22 * (influence/100)^1.6` (same formula as now).
- Hover: tooltip with name, kind, reach (use `formatReach`), first seen date, narratives carried, `Likely bot cluster` badge if it belongs to a flagged cluster.
- Click a node: right column temporarily switches from Top narratives to a node detail (reuse `NodeDetails` look: `dl` facts + "How it reached them" trace), with `× Back to narratives`.
- Click a narrative in the list: highlight its lane and path (`.edge-path`), dim others (`.edge-dim`, `.node.dimmed`). Click again to clear.
- Graph/Table toggle bottom-right, same as replay view; table lists nodes with tier, kind, reach, first seen, narratives.
- Legend row under the graph, same as `.legend`.
- Caption under legend (`.caveat`): `Attribution to a FIMI source is based on watchlist membership and coordination patterns. It is an assessment, not proof.`

### 5.3 Top narratives (`NarrativeList.tsx`)

Ranked list, up to 8 rows, only narratives with `firstSeen ≤ scenarioNow`. Each row:

- Rank (mono) · narrative label (bold) · trend arrow vs. last week (`↑ 32%` / `↓` / `→`, mono).
- Target chip (phase 1: candidate name; phase 2: campaign topic; phase 3: process step, e.g. "Postal voting").
- Small bar: posts this week vs. the phase's max.
- Meta line (12px muted): `{posts} posts · {accounts} flagged accounts · first seen {date} · origin: {outlet}`.
- Expand (chevron) shows: the **false claim** (quoted, `.claim` box), **what is true** (one or two sentences, with source label like "Electoral Commission, counting rules"), 2 example posts (synthetic, handles blurred as `@b•••••_07`), and a `Add to weekly report` checkbox (checked by default for the top 5 in each phase).

Never repeat a false claim as a headline without the correction beside it (this matters for the public page, §8.3).

### 5.4 Phase 1 · Candidates

What this phase is (copy): *"Months before the vote, FIMI networks try to discredit the people standing. Claims target health, corruption, loyalty and private life. We watch every registered candidate and party leader and match what known FIMI outlets and bot clusters say about them."*

Phase-specific panel: **Candidate exposure table**.

| Column | Content |
|---|---|
| Candidate | Name · party · role (fictional, §10.2) |
| Exposure | Narrative-matched posts about them to date, bar + mono number |
| Top false claim | One line |
| Narratives | Count |
| Trend | 4-week sparkline |
| Mainstream pickup | `Yes · 2 outlets` / `No` |

Click a row: filters the network and narrative list to that candidate (chip `Candidate: Elin Marsk ×` appears above both). Sorted by exposure, highest first.

Caveat line: `We list exposure, not guilt or innocence. A high number means a candidate is being targeted.`

### 5.5 Phase 2 · Campaign topics

What this phase is (copy): *"In the weeks before the vote, FIMI networks attach false claims to the topics voters actually care about. We first build a repository of the real campaign topics from mainstream news, then check how known FIMI outlets and bot networks talk about those same topics."*

Phase-specific panel: **Topic repository** (`TopicRepository.tsx`). Shown as a three-step pipeline, left to right, so the method is visible:

```
① Mainstream topics           ② Cross-check                         ③ False narratives found
Top campaign topics from      Same topics in watchlist outlets      Claims on that topic that
12 national outlets, by       (Varkova Today + 6 proxy sites)       match known disinformation
share of election coverage    and 3 known bot clusters
```

Then a table, one row per topic (top 10 by mainstream share):

| Column | Content |
|---|---|
| Topic | e.g. "Energy prices and the price cap" |
| Mainstream share | % of election coverage in national outlets this week (bar) |
| FIMI share | % of watchlist-outlet + bot-cluster election posts on this topic (bar, burgundy) |
| Overlap | `High` / `Medium` / `Low` (FIMI share ÷ mainstream share ≥ 1.5 = High, 0.75–1.5 = Medium, else Low) |
| False-claim rate | % of FIMI-side mentions that match a known false claim |
| Top false claim | One line |
| Sources | Count of watchlist outlets and bot clusters active on it |

- Row click filters the network and narrative list to that topic.
- Above the table, a small diverging dot plot ("Where FIMI pushes harder than the news"): each topic one row, dot for mainstream share, dot for FIMI share, line between. Topics where FIMI ≫ mainstream are the manufactured ones.
- Caveat: `Mainstream outlets are the baseline for what the campaign is about. They are not assessed as sources of disinformation.`

### 5.6 Phase 3 · Election integrity

What this phase is (copy): *"Shortly before, during and after election day, FIMI networks try to make people doubt the result: fraud, rigging, lost or swapped postal ballots, hacked counts. These claims often start weeks early so they are ready when the result comes in."*

Phase-specific panel: **Integrity watch**, two parts:

1. **Process map**: a horizontal strip of the voting process steps — `Voter registration · Postal vote applications · Postal ballots sent · Polling day · Count · Result announced · Certification`. Each step shows the number of false claims targeting it (mono) and a status icon. Steps that have not happened yet at `scenarioNow` are outlined only. Clicking a step filters narratives.
2. **Election-day hourly chart** (only when `scenarioNow` ≥ election day 00:00): integrity-claim posts per hour from 06:00 election day to +48 h, with markers `Polls open`, `Polls close`, `First results`. Before election day, show instead: `Hourly monitoring starts on election day. Integrity claims so far: {posts} posts, {n} narratives.` (default preset: 2,480 posts, 2 narratives; count only posts matched to a narrative already seen)

Link to existing ARGUS replay: if the "Swapped Ballots" narrative is in the list, its row has a `Replay how it spread →` link that switches to the Network replay view.

### 5.7 Indicators and accounts (bottom row, all phases)

- Left: the phase's four indicators as meters (reuse `.signals` markup from `SignalsPanel`), with the current score and a one-line detail each, e.g. `Coordination · 86 · 14 near-identical posts from cluster D in 9 h`.
- Right: `Accounts in this phase`: flagged count for this phase, top 3 clusters with account counts, `Review and report →` button that opens §7.2 pre-filtered to this phase.

---

## 6. Copy rules

- Plain English, short sentences, sentence case everywhere except `.eyebrow` labels.
- Always "likely bot account" or "flagged account", never "bot" as a fact. Always "assessed", "matches", "linked to", never "proven".
- Every false claim on screen is paired with its correction in the same view.
- Dates: `Sun 7 Mar 2027`, mono. Numbers: thousands with commas (`1,950`), mono.
- Keep the existing banner: `Simulated scenario. All entities are fictional.`
- Fictional stand-ins: **Varkova** = the state actor (stand-in for Russia), **Varkova Today** = its state media. Framework copy may say "Russian FIMI playbook" in the "How it works" popover only; on-screen entities stay fictional.

---

## 7. Flagged accounts (`BotCounter.tsx`)

### 7.1 Counter panel (overview, bottom-left)

```
┌ Flagged accounts ─────────────────────────────────────────── [Review and report →] ┐
│  1,950          likely bot accounts flagged since 2 Nov 2026                        │
│  +330 this week · 1,180 reported to platforms · 640 actioned by platforms          │
│                                                                                     │
│  By phase   P1 █████████ 969   P2 ██████████ 1,036   P3 ██ 163                    │
│  By platform  X 722 · Telegram 507 · TikTok 409 · Facebook 234 · YouTube 78        │
│  Confidence   High 566 · Medium 897 · Low 487                                      │
│                                                                                     │
│  ● Reporting status   Not reported 770 · Reported 540 · Actioned 640               │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

- The big number counts up (600 ms ease) when the scenario date changes. Respect `prefers-reduced-motion` (no animation).
- All numbers are cumulative up to `scenarioNow` (from weekly series in §10.4).
- An account counts in a phase if it posted at least 3 matched items for that phase; an account can be in several phases, so phase totals can exceed the headline. Say so in a `title` tooltip on "By phase".
- **Flag criteria** (shown in a `What makes an account "likely bot"?` link): created < 90 days ago, near-duplicate text with a known cluster, posting-rhythm match, follows/is followed mainly by flagged accounts, amplifies watchlist outlets within 30 min. High = 4+ criteria, Medium = 3, Low = 2.

### 7.2 Review and report modal (`ReportAccountsModal.tsx`)

Native `<dialog>` with `.alert-modal` styling, 960px wide.

1. **Filters** row: phase, platform, confidence, cluster, status (default: Not reported, High confidence).
2. **Table** (paged, 25 rows): checkbox · handle (blurred `@b•••••_07`) · platform · cluster · confidence · criteria met (icons) · first seen · matched posts · phase(s) · status.
3. Selection footer: `48 accounts selected · X 31 · Telegram 17`.
4. **Report via** `fieldset` (checkboxes): `Platform trust & safety report` (default on), `Coordinated inauthentic behaviour channel` (on), `Electoral Commission (copy)` (off), `National DSA coordinator` (off), `DSA Art. 16 illegal-content notice` (off, labelled "Only for content assessed as illegal"). A likely-bot flag alone is not a notice of illegal content.
5. Evidence pack summary: matched posts, cluster fingerprint, timestamps. `Download evidence pack (CSV)` produces a CSV of the selected rows (real download, synthetic data).
6. **Analyst review** checkbox, same pattern as `AlertModal`: `I have reviewed these accounts and the evidence.` Send is disabled until checked.
7. `Send reports` → `.sent` state: `Reports sent (simulated) · 48 accounts · reference ARG-2027-0214-03`. The counter moves those accounts from Not reported to Reported for the rest of the session (in-memory only).
8. Caveat: `Platforms decide on removal. ARGUS only flags and documents.`

---

## 8. Weekly report to electoral oversight

### 8.1 Report card (overview, bottom-right)

```
┌ Weekly oversight report ─────────────────────────────┐
│ Next report   Mon 15 Feb 2027 · 08:00   (in 22h 00m) │
│ To            Norvane Electoral Commission           │
│ Last sent     Mon 8 Feb 2027 · Report #15            │
│ This week     12 false narratives · all 3 phases     │
│                                                      │
│ [Preview this week's report]  [Past reports ▾]       │
└──────────────────────────────────────────────────────┘
```

- Generated automatically every Monday 08:00 (scenario clock), from the narratives checked `Add to weekly report` (§5.3). Report numbering: #1 = Mon 2 Nov 2026, so 8 Feb = #15 and 15 Feb = #16. Each report covers the seven days before it is issued.
- `Past reports ▾` lists the last 5 reports (number, date, narrative count), each opening the preview for that week.

### 8.2 Report preview (`WeeklyReportModal.tsx`)

`<dialog>`, 860px, printable (add a print stylesheet that prints only the dialog content).

Sections:
1. Header: `ARGUS weekly briefing #16 · week of 8–14 Feb 2027 · Norvane general election (T−21 days)`, recipient, classification line `For the Norvane Electoral Commission · contains assessments`.
2. **Summary**: 3 sentences. Current phase, confidence, what changed this week.
3. **Phase status table**: phase · status · confidence · change vs last week · estimated start.
4. **False narratives this week**, grouped by phase. Each: claim · what is true · first seen · reach (posts, estimated impressions) · trend · mainstream pickup yes/no · recommended response (`Prebunk`, `Debunk`, `Monitor`, `Do not amplify`).
5. **Flagged accounts**: new this week, reported, actioned.
6. **Recommended actions** (max 3), e.g. "Publish how postal ballots are checked before 22 Feb", "Brief returning officers on the 'swapped ballots' claim".
7. Method and caveats (fixed text).

Actions in the footer:
- `Download PDF` (calls `window.print()`).
- `Preview public page` → §8.3.
- Analyst review checkbox + `Send to Electoral Commission (simulated)` → `.sent` state.

### 8.3 Public debunk page preview (`DebunkPagePreview.tsx`)

A preview of what the **Electoral Commission can publish on its own website**. Shown inside the report modal as a second tab (`Briefing | Public page`), rendered in a neutral "government site" frame so it is clearly not ARGUS:

- Frame: thin grey top bar with a placeholder crest box and `Norvane Electoral Commission · elections.nv (fictional)`. Use `--paper`, `--ink`, and `--ink-muted` only. No burgundy, no ARGUS branding except a small footer line `Monitoring support: GroundTruth ARGUS`.
- Title: `Facts about the 2027 general election`. Sub: `Updated weekly · last updated Mon 15 Feb 2027`.
- Intro: `False claims about the election are circulating. Here are the facts.`
- One card per narrative, **truth-sandwich order**: (1) **Fact** first, in bold, (2) `Claim circulating:` the false claim in muted smaller text, (3) `Why it's false:` one or two sentences, (4) `Source:` official link label. No account handles, no links to the false content, no reach numbers.
- Grouped under `About the candidates`, `About campaign topics`, `About voting and counting`, matching phases 1–3.
- Buttons: `Copy HTML` (copies a clean, self-contained HTML snippet of the page to the clipboard) and `Download HTML`.
- Caveat in the ARGUS chrome above the frame: `The Commission decides what to publish. Narratives are included only after the analyst review.`

---

## 9. Interactions and accessibility checklist

- All clickable cards and rows reachable by Tab, activated by Enter/Space, with `:focus-visible` outline (existing token).
- Modals: native `<dialog>` with `showModal()`, focus trap, `Esc` closes, focus returns to the opener.
- Charts have a text alternative: each SVG gets `role="img"` and an `aria-label` summary; the phase timeline and network each have a Table toggle.
- Status never by colour alone (icon + word + hatch pattern).
- `prefers-reduced-motion`: no count-up, no pulsing dot, countdown still updates.
- Works at 375px width with no horizontal page scroll (tables scroll inside their panel).

---

## 10. Data (`data/election.ts`)

All synthetic. Types first, then the values to use. Keep everything in this one file so the demo can be re-themed.

### 10.1 Types

```ts
export type PhaseId = 1 | 2 | 3
export type PhaseStatus = 'Not detected' | 'Emerging' | 'Active' | 'Peak'
export type Platform = 'X' | 'Telegram' | 'TikTok' | 'Facebook' | 'YouTube'
export type Confidence = 'High' | 'Medium' | 'Low'
export type ReportStatus = 'Not reported' | 'Reported' | 'Actioned'

export interface Election {
  country: 'NV'
  name: string                // 'Norvane general election'
  pollsOpen: string           // ISO
  pollsClose: string
  certification: string
  monitoringEnds: string
  oversightBody: string       // 'Norvane Electoral Commission'
}

export interface PhaseDef {
  id: PhaseId
  short: string               // 'Candidates'
  eeas: string                // 'Delegitimising leaders'
  description: string         // copy from §5.4–5.6
  indicators: { id: string; label: string; weight: number; fullAt: string }[]
}

export interface WeekPoint {
  week: string                // ISO Monday
  volume: Record<PhaseId, number>                 // narrative-matched posts
  indicators: Record<PhaseId, number[]>           // 4 scores 0–100, order as PhaseDef.indicators
  newFlagged: Record<PhaseId, number>
}

export interface Candidate { id: string; name: string; party: string; role: string }

export interface CampaignTopic {
  id: string; label: string
  mainstreamShare: number     // 0–1
  fimiShare: number           // 0–1
  falseClaimRate: number      // 0–1
  sources: { outlets: number; clusters: number }
}

export interface Narrative {
  id: string
  phase: PhaseId
  rank: number
  label: string
  claim: string
  truth: string
  truthSource: string
  target: { kind: 'candidate' | 'topic' | 'process'; id: string; label: string }
  firstSeen: string           // ISO date
  originOutlet: string        // node id
  weekly: number[]            // posts per week, aligned with WEEKS
  flaggedShare: number       // share of the phase's flagged accounts; the count is derived per week
  mainstreamPickup: number    // maximum outlets; on-screen count uses edges already seen
  response: 'Prebunk' | 'Debunk' | 'Monitor' | 'Do not amplify'
  examplePosts: string[]
}

export interface PhaseNode {
  id: string; name: string; kind: string
  tier: 'origin' | 'laundering' | 'relay' | 'amplification' | 'mainstream'
  reach: number; influence: number
  firstSeen: string
  narratives: string[]        // narrative ids
  cluster?: string            // flagged cluster id
}
export interface PhaseEdge { source: string; target: string; firstSeen: string; narrative: string }

export interface FlaggedAccount {
  id: string; handle: string; platform: Platform; cluster: string
  confidence: Confidence; criteria: string[]; firstSeen: string
  matchedPosts: number
  phaseWeeks: Partial<Record<PhaseId, number>>  // week index the account joined each phase
  reportedWeek?: number; actionedWeek?: number  // status is derived from these and scenarioNow
}
```

Generate `FlaggedAccount[]` with a seeded generator (mulberry32, seed `20270307`) so phase, platform, confidence and reporting totals match §10.4 exactly at every week. Accounts are first seen on the Monday of their week. Splits use largest-remainder allocation so every breakdown sums to the headline. Generate 3,170 accounts (the end-of-period unique total, §10.4); the modal pages through the ones with `firstSeen ≤ scenarioNow`.

### 10.2 Election, candidates, sources

```ts
export const ELECTION: Election = {
  country: 'NV',
  name: 'Norvane general election',
  pollsOpen: '2027-03-07T07:00:00',
  pollsClose: '2027-03-07T22:00:00',
  certification: '2027-03-17T12:00:00',
  monitoringEnds: '2027-04-07T00:00:00',
  oversightBody: 'Norvane Electoral Commission',
}

export const CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Elin Marsk',     party: 'Norvane Civic League', role: 'Prime minister, standing again' },
  { id: 'c2', name: 'Tomas Vire',     party: 'Norvane Unity Bloc',   role: 'Leader of the opposition' },
  { id: 'c3', name: 'Ada Lindqvist',  party: 'Greens of Norvane',    role: 'Party leader' },
  { id: 'c4', name: 'Pavel Orrin',    party: 'Port Sella Regionalists', role: 'Party leader' },
  { id: 'c5', name: 'Mira Holt',      party: 'Norvane Civic League', role: 'Foreign minister' },
]
```

Reuse the existing ARGUS outlets as network nodes: origin `Varkova Today`; laundering `The Free Ledger`, `EuroTruth Wire`, `Open Dispatch`, `Continental Monitor`, `PolicyLeaks Digest`, `Daily Aggregate`; relay `Norvane Herald`, `Norvane Morning Post`, `Port Sella Courier`; amplification: coordinated clusters `Cluster A · Telegram relay`, `Cluster B · X amplifiers`, `Cluster C · TikTok video`, `Cluster D · election accounts` plus the Norvane organic groups (`Norvane Parents Forum`, `Port Sella Community`, `Norvane Election Chat`, `Norvane Veterans Circle`, `Norvane News Exchange`); mainstream `Norvane Unity Bloc MP`, `Norvane Civic League mayor`, plus a new broadcaster `Norvane Public Radio`. About 25–30 nodes per phase.

### 10.3 Weeks, volumes and indicator scores

22 weeks, Mondays from `2026-11-02` to `2027-03-29`. Election week = index 17 (`2027-03-01`).

```ts
export const WEEKS = ['2026-11-02','2026-11-09','2026-11-16','2026-11-23','2026-11-30','2026-12-07','2026-12-14','2026-12-21','2026-12-28','2027-01-04','2027-01-11','2027-01-18','2027-01-25','2027-02-01','2027-02-08','2027-02-15','2027-02-22','2027-03-01','2027-03-08','2027-03-15','2027-03-22','2027-03-29']

// narrative-matched posts per week
volume[1] = [120,140,180,260,1450,2100,2600,2300,1900,2400,2800,2600,2900,3300,3600,3900,4200,4600,2100,900,600,450]
volume[2] = [300,280,320,310,350,420,480,520,610,900,1300,3100,4200,5100,5900,6600,7200,7900,3000,1200,800,600]
volume[3] = [40,35,50,45,60,55,70,80,90,110,140,180,420,760,1300,2100,3400,6800,14200,9800,5200,2600]

// confidence that the phase has started, per week (the weighted indicator sum must reproduce these)
confidence[1] = [8,10,14,22,71,82,88,89,90,91,92,93,94,95,96,96,97,97,97,97,97,97]
confidence[2] = [6,6,7,8,9,12,15,18,22,31,44,72,79,82,84,86,88,90,90,90,90,90]
confidence[3] = [2,2,3,3,3,4,4,5,5,6,9,14,31,38,41,58,71,88,93,94,94,92]

// new flagged accounts per week
newFlagged[1] = [4,5,8,12,140,120,110,80,60,70,80,70,60,70,80,60,50,40,20,10,5,4]   // cumulative: 969 at week 14, 1,158 at end
newFlagged[2] = [6,5,7,6,8,10,12,14,18,40,70,180,210,220,230,210,180,150,60,20,10,6] // cumulative: 1,036 at week 14, 1,672 at end
newFlagged[3] = [1,1,1,1,1,1,2,2,2,3,5,8,30,45,60,80,110,160,120,40,15,6]            // cumulative: 163 at week 14, 694 at end
// Unique accounts (headline) = round to nearest 10 of 0.9 × (P1 + P2 + P3), because ~10% of accounts are active in more than one phase.
```

Phase 1's first indicator is derived from the number of listed narratives already seen (1 = 33, 2 = 67, 3+ = 100). Derive the four indicator scores per week so that `round(Σ weight × score) = confidence[phase][week]` (pick scores that rise in the shape of `volume`; any split that sums correctly is fine).

Always use the week that contains `scenarioNow` (Monday to Sunday). Expected results at the presets:

| Preset | Week index | P1 | P2 | P3 | Banner |
|---|---|---|---|---|---|
| 12 weeks out (Tue 15 Dec 2026) | 6 | Active 88%, started ~30 Nov 2026 ±3d | Not detected 15% | Not detected 4% | none |
| 3 weeks out (Sun 14 Feb 2027, default) | 14 | Peak 96%, started ~30 Nov 2026 ±3d | Active 84%, started ~18 Jan 2027 ±3d | Emerging 41%, precursors since 25 Jan 2027 | Moving towards phase 3, up 3 points |
| 2 days after (Tue 9 Mar 2027) | 18 | Peak 97% | Peak 90% | Peak 93%, started ~22 Feb 2027 ±5d | none |

### 10.4 Flagged-account totals

All values are cumulative up to the week containing `scenarioNow`.

| | Week 6 (12 weeks out) | Week 14 (default) | Week 18 (2 days after) | End (week 21) |
|---|---:|---:|---:|---:|
| Phase 1 | 399 | 969 | 1,139 | 1,158 |
| Phase 2 | 54 | 1,036 | 1,636 | 1,672 |
| Phase 3 | 8 | 163 | 633 | 694 |
| Unique headline (0.9 × sum, nearest 10) | 410 | 1,950 | 3,070 | 3,170 |
| Reported to platforms (incl. actioned) | 120 | 1,180 | 2,010 | 2,300 |
| Actioned by platforms | 40 | 640 | 1,240 | 1,520 |

Splits applied to the headline at every week: platform X 37% · Telegram 26% · TikTok 21% · Facebook 12% · YouTube 4%; confidence High 29% · Medium 46% · Low 25%. Reporting status on screen: Not reported = headline − reported; Reported = reported − actioned; Actioned = actioned.

### 10.5 Narratives (minimum set)

**Phase 1 · Candidates**

| id | Target | Label | Claim | What is true | First seen | Origin |
|---|---|---|---|---|---|---|
| p1n1 | Elin Marsk | "The PM is secretly unwell" | Marsk has a hidden illness and aides run the government. | Marsk's published annual medical statement shows no such condition, and she attends cabinet meetings in person. | 2026-11-30 | Varkova Today |
| p1n2 | Elin Marsk | "Marsk's family profits from Kestria aid" | Her brother's firm received aid contracts. | No family member holds an aid contract (public procurement register). | 2026-12-07 | The Free Ledger |
| p1n3 | Tomas Vire | "Vire is a foreign agent" | Vire takes money from a Western foundation. | Party funding filings show no foreign donations. | 2026-12-14 | EuroTruth Wire |
| p1n4 | Ada Lindqvist | "Greens will ban private cars" | Lindqvist plans a total car ban by 2030. | The Greens' manifesto proposes city-centre low-emission zones only. | 2027-01-04 | Open Dispatch |
| p1n5 | Mira Holt | "Foreign minister fakes her degree" | Holt's university degree is forged. | The university's public graduate register lists Holt's degree. | 2027-01-11 | Continental Monitor |
| p1n6 | Pavel Orrin | "Regionalists plan secession vote" | Orrin will hold an illegal independence referendum. | No such proposal exists in the party programme. | 2027-01-25 | PolicyLeaks Digest |
| p1n7 | Elin Marsk | Deepfake clip "Marsk admits vote deal" | A video shows Marsk admitting a deal to fix the vote. | The clip is synthetic; the original speech is on the parliament archive. | 2027-02-08 | Daily Aggregate |

**Phase 2 · Campaign topics** (topic repository rows; the seven topics with a false claim each have one narrative. First seen / origin: energy 4 Jan Varkova Today, military 11 Jan The Free Ledger, cost of living 18 Jan EuroTruth Wire, migration 18 Jan Open Dispatch, EU 25 Jan Continental Monitor, climate 1 Feb PolicyLeaks Digest, health 8 Feb Daily Aggregate)

| Topic | Mainstream share | FIMI share | False-claim rate | Top false claim | What is true |
|---|---:|---:|---:|---|---|
| Energy prices and the price cap | 22% | 31% | 38% | "The price cap ends the day after the election" | The cap is legislated until Dec 2028. |
| Cost of living and wages | 18% | 12% | 14% | "Pensions will be cut 20%" | No party proposes pension cuts; the pension index is fixed by law. |
| Military support for Kestria | 9% | 24% | 46% | "Norvane will send conscripts" | Norvane has no conscription; deployments need a parliamentary vote. |
| Migration and asylum | 12% | 15% | 33% | "50,000 migrants will get the vote" | Only citizens can vote in general elections. |
| Health care waiting times | 11% | 3% | 6% | "Hospitals closing in Port Sella" | No closures are planned (Health Ministry plan 2027). |
| Housing | 8% | 2% | 4% | — | — |
| EU rules and sovereignty | 6% | 9% | 41% | "Brussels picks the next PM" | The PM is elected by the Norvane parliament. |
| Climate and farming | 5% | 3% | 22% | "Farmers fined for every cow" | No livestock levy is proposed. |
| Crime and policing | 5% | 0.5% | 9% | — | — |
| Education | 4% | 0.5% | 2% | — | — |

**Phase 3 · Election integrity**

| id | Process step | Label | Claim | What is true | First seen |
|---|---|---|---|---|---|
| p3n1 | Postal ballots sent | "Swapped Ballots" (links to replay) | Postal ballots are secretly swapped at sorting centres. | Postal ballots are sealed, tracked and counted in public under observers from all parties. | 2027-01-25 |
| p3n2 | Count | "The count is pre-programmed" | The voting software already has the result. | Norvane counts paper ballots by hand; machines are not used. | 2027-02-08 |
| p3n3 | Voter registration | "Dead voters on the roll" | 200,000 dead people are registered to vote. | The roll is updated weekly from the civil register; independent audit found 0.01% errors. | 2027-02-15 |
| p3n4 | Polling day | "Pencils are erasable" | Polling-station pencils are erasable so votes can be changed. | Polling stations supply indelible pencils, voters may use their own pen, and every ballot is counted in public. | 2027-03-07 |
| p3n5 | Result announced | "Result announced before the count" | Media had the result before counting finished. | Exit polls are estimates; official results come only from the Commission. | 2027-03-07 |
| p3n6 | Certification | "Certification is rigged" | The Commission will certify a false result. | Results can be checked by any party and appealed to the Supreme Court. | 2027-03-09 |

Election-day hourly series (phase 3, posts per hour from 06:00 7 Mar to 06:00 9 Mar, 48 values) — generate from a smooth curve: baseline 18/h, polls-open bump to 66, rising to 310 at 22:00 (polls close), peak 460 at 01:00 (first results), decaying to 90 by +48 h. Hourly totals must fit inside the weekly volumes (6,800 for the week of 1 Mar, 14,200 for the week of 8 Mar).

---

## 11. Out of scope

- Real data, real platform APIs, real sending. All "send" actions are simulated and in-memory.
- Changes to Gaia or to the existing replay logic (`detection.ts`, `scenario.ts`) beyond moving JSX into `ReplayView.tsx`.
- Multiple simultaneous elections. One election, configured in `ELECTION`.

---

## 12. Acceptance criteria

1. `npm run build` and `npm test` pass in `apps/argus`.
2. The countdown is visible in the top-right on both views, ticks every second, and switches label correctly across the four states (§3.2) using the presets `3 weeks out`, `Election day`, `2 days after` and `After certification`.
3. Default load (`#phases`, preset "3 weeks out") shows: P1 Peak 96%, P2 Active 84%, P3 Emerging 41%, the "Moving towards phase 3" banner, and 1,950 flagged accounts.
4. Preset "12 weeks out" shows P1 Active 88%, P2 and P3 Not detected, no banner. Preset "2 days after" shows all three phases at Peak (97%, 90%, 93%) and the certification countdown.
5. Clicking each phase card opens its drill-down with network, top narratives and the phase-specific panel (candidates table / topic repository / integrity watch). `Esc` and `← All phases` go back; `#phases/2` deep-links.
6. No narrative, node or edge with `firstSeen` after `scenarioNow` is visible anywhere.
7. Flagged-accounts counter totals equal the cumulative sums for the week containing `scenarioNow`. Reporting 48 accounts moves 48 from Not reported to Reported.
8. Send buttons in both modals stay disabled until the analyst review box is checked.
9. Public page preview shows facts before claims, has no handles or reach numbers, and `Copy HTML` puts a self-contained snippet on the clipboard.
10. Unit tests in `engine/phases.test.ts` cover: weighted confidence, status thresholds (29/30/59/60/89/90), start-date estimate and ± rule, banner rule, current-phase rule, week lookup for a given `scenarioNow`, indicator sums for every week, account totals at every week, and hourly totals fitting the weekly volumes.
11. No horizontal page scroll at 375px; keyboard-only user can open a phase, a narrative, both modals, and send.
