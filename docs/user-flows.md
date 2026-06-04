# SignalOS — User Flows

## Design Principle

Every flow is measured in time-to-value. Reducing friction is not a UX preference — it is a product requirement. The five flows below are the north star for every UI decision. If a design choice makes these flows slower, it is wrong.

---

## Personas

### Partner
- Time budget: 5 minutes
- Primary question: "What requires my attention right now?"
- Mental model: portfolio health, not individual company details
- Pain today: scattered across email, Notion, and spreadsheets

### Portfolio Operations Manager
- Time budget: 30–60 minutes per day
- Primary question: "What did founders report this week? What needs follow-up?"
- Mental model: workflow queue, not dashboard
- Pain today: manually reading update emails and logging into spreadsheets

### Finance / LP Relations
- Time budget: several hours per quarter
- Primary question: "Can I generate a client-ready LP report without two weeks of data gathering?"
- Pain today: manually aggregating metrics from multiple sources

### Founder
- Time budget: 3 minutes
- Primary question: "Can I submit my monthly update without it feeling like a chore?"
- Pain today: filling out long forms or writing update emails nobody reads

---

## Flow 1 — Partner Morning Brief

**Persona:** Partner  
**Time target:** Under 30 seconds to understand portfolio state  
**Entry point:** FundOS home `/`

### Happy Path

```
1. Land on Executive Dashboard
   └── Topbar shows: "Last updated 2 hours ago"

2. Portfolio Health Summary (above the fold)
   ├── 24 Healthy  (green chip)
   ├── 4 Watchlist (amber chip)
   └── 2 At Risk   (red chip — draws the eye immediately)

3. At-Risk Companies panel
   ├── Axiom AI — "Runway dropped to 4 months. Revenue flat."
   └── NovaPay — "3 consecutive months of declining growth."

4. Recent Alerts strip
   ├── [NEW] Axiom AI submitted update — 3 risks flagged
   ├── [NEW] Trend detected: 3 SaaS companies report slowing enterprise sales
   └── [RESOLVED] Luminary Health — runway extended after raise

5. Emerging Trends sidebar
   ├── "Hiring freezes across 5 portfolio companies"
   └── "Series B fundraising difficulty — 4 companies mentioned"

6. Partner clicks "Axiom AI" → Company Detail
   └── Sees full risk breakdown, AI summary, open requests
```

### UX Requirements

- The dashboard must never show an empty state in normal operation. Seed data ensures it looks real.
- At-Risk companies must be immediately visually distinct — red indicators, not just a label.
- "Last updated" timestamp must be visible — partners need to trust data freshness.
- No loading spinner on full page — skeleton states with streaming data.
- `⌘K` command palette must be accessible at all times for jumping to any company.

### Failure States

- If AI summaries are unavailable: show raw metrics. Never block on AI.
- If data is stale (>24h): show warning banner, not silent bad data.

---

## Flow 2 — Founder Monthly Update

**Persona:** Founder  
**Time target:** Under 3 minutes  
**Entry point:** `/updates/new` (or deep-linked email from ops team)

### Happy Path

```
1. Founder opens update form
   └── Pre-filled: company name, current month, last period's numbers

2. Metrics section (auto-advances)
   ├── Revenue this month: [input — last month shown as reference]
   ├── MoM Growth: [auto-calculated + editable]
   ├── Monthly Burn: [input]
   ├── Cash in Bank: [input]
   └── Runway: [auto-calculated from burn/cash]

3. Team section
   └── Current headcount: [input — last value pre-filled]

4. Narrative section (structured, not freeform)
   ├── Wins this month: [multi-line — 3 bullet prompt]
   ├── Risks / Blockers: [multi-line — "What's keeping you up?"]
   ├── Hiring needs: [structured: role, priority, timeline]
   └── Fundraising status: [dropdown + optional note]

5. Submit
   └── Confirmation: "Update received. AI summary will be ready in ~30 seconds."

6. [Background] System
   ├── Writes update to DB
   ├── Recalculates health score
   ├── Runs AI analysis
   └── Notifies portfolio ops team
```

### UX Requirements

- Form must feel like filling out a smart document, not a CRM intake form.
- Previous period numbers shown alongside inputs as reference — reduces cognitive load.
- Auto-calculate runway and growth — founders shouldn't do math.
- Progress indicator: metrics → team → narrative → done. Three sections, not one long form.
- Mobile-optimized — founders often submit from their phone.
- No required AI — submission succeeds even if AI analysis job fails.

### Validation

- Revenue must be numeric
- Runway auto-calculated but editable
- Wins/Risks: minimum 1 entry each
- Fundraising status: required field

---

## Flow 3 — Portfolio Ops Update Review

**Persona:** Portfolio Operations Manager  
**Time target:** Under 5 minutes per update review session  
**Entry point:** `/updates`

### Happy Path

```
1. Open Updates inbox
   └── Sorted by: unreviewed first, then by health change

2. Update card shows:
   ├── Company name + health status change (e.g., "Watchlist → At Risk")
   ├── Key metrics delta: Revenue ▲12%, Burn ▲8%, Runway 7mo
   ├── AI Summary: "Strong revenue growth. Runway concern flagged — burn up 8%."
   ├── Detected Risks: [2 tags] "Burn increase", "Key hire delayed"
   └── Detected Requests: [1 tag] "Intro to Series B investor"

3. Ops manager clicks update → Full update view
   ├── Full narrative from founder
   ├── AI-generated summary
   ├── Risk cards with source quotes
   ├── Suggested actions: ["Schedule check-in call", "Intro to [investor name]"]
   └── Request cards

4. Ops manager acts:
   ├── Marks 1 request as "In Progress" → assigns to self
   ├── Creates task: "Follow up on key hire" → due date set
   └── Marks update as Reviewed

5. Returns to inbox → next unreviewed update
```

### UX Requirements

- Inbox must have clear reviewed/unreviewed state — no ambiguity about what's been seen.
- Health status changes must be visually prominent — "Watchlist → At Risk" in bold.
- AI summary is a first-class UI element, not a collapsed section.
- One-click to create a task from a detected request.
- Keyboard navigation: `j/k` to move between updates, `r` to mark reviewed, `t` to create task.
- Batch review mode: "Mark all from this week as reviewed" for periods of high volume.

---

## Flow 4 — LP Report Generation

**Persona:** Partner or Finance  
**Time target:** Under 10 minutes from start to export-ready  
**Entry point:** `/lp-reports/new`

### Happy Path

```
1. Open Report Generator
   └── Header: "Generate Q1 2025 LP Report"

2. Configuration step
   ├── Quarter: [dropdown — Q1 2025]
   ├── Companies: [multi-select — default: all active]
   └── Tone: [Standard / Conservative / Growth-focused]

3. Click "Generate Report"
   └── Shows progress indicator:
       "Fetching portfolio data..." → "Running AI analysis..." → "Assembling report..."

4. Report preview loads (30–60 seconds)
   ├── Executive Summary (AI narrative)
   ├── Portfolio Highlights (top performers, key wins)
   ├── Portfolio Risks (flagged companies + context)
   ├── Fund Metrics (aggregate revenue, growth, burn)
   └── Appendix: Company-by-company table

5. Partner reviews each section
   ├── Editable text fields — AI draft is starting point
   └── "Regenerate section" button per section

6. Export
   ├── Export PDF — formatted, ready to send
   └── Export Markdown — for Notion/email workflows

7. Report saved to /lp-reports with timestamp + version
```

### UX Requirements

- Generation must feel fast. Show incremental progress — section by section as AI generates.
- Draft is always editable — partners are not locked into AI text.
- Every AI claim must link to source data. "Revenue grew 47%" → links to metric record.
- PDF export must look polished — not a browser print. Proper typography, RTP branding placeholder.
- Reports are versioned — regenerating a report creates a new version, not overwrites.
- Markdown export for teams that use Notion or email.

### Failure States

- If AI fails mid-generation: show what was completed, allow manual editing of failed sections.
- If company has no data for the quarter: flag clearly, don't silently include empty numbers.

---

## Flow 5 — Trend Discovery

**Persona:** Partner or Portfolio Ops  
**Time target:** Pattern recognized in under 60 seconds; action created in under 2 minutes  
**Entry point:** `/trends`

### Happy Path

```
1. Open Trends page
   └── Shows trend cards, sorted by affected company count

2. Top trend card:
   ┌──────────────────────────────────────────────────────────────┐
   │  ENTERPRISE SALES SLOWDOWN                          4 companies│
   │  SaaS · Detected from updates in Feb–Mar 2025               │
   │  "Slowing enterprise deal cycles" mentioned across           │
   │  Axiom AI, DataPulse, NovaPay, and Luminary Health          │
   │  [View Evidence]  [Create Action]                            │
   └──────────────────────────────────────────────────────────────┘

3. Partner clicks "View Evidence"
   └── Expands to show:
       ├── Axiom AI — "Enterprise pipeline is slower than expected. Q2 projections revised."
       ├── DataPulse — "Decision cycles extending from 30 to 90 days."
       ├── NovaPay — "3 enterprise deals pushed to Q3."
       └── Luminary Health — "Procurement reviews adding 6-8 weeks."

4. Partner clicks "Create Action"
   └── Modal:
       ├── Action: "Schedule portfolio-wide check-in on enterprise sales motion"
       ├── Assign to: [Portfolio Ops]
       ├── Due: [date picker]
       └── Link to trend: auto-linked

5. Action created → visible on company detail pages for all 4 companies
```

### Trend Categories Detected

| Category | Signal Pattern |
|---|---|
| Shared Risks | Same risk phrase across 3+ companies in 60 days |
| Hiring Patterns | Same role requested by 3+ companies |
| Fundraising Difficulty | 3+ companies mention fundraising challenges |
| Burn Escalation | 3+ companies with MoM burn increase > 15% |
| Growth Slowdown | 3+ companies with YoY growth declining |
| Sector Signals | Market-level events tied to multiple portfolio companies |

### UX Requirements

- Trend cards must lead with the human-readable insight, not the data.
- Evidence is always one click away — never buried.
- Actions created from trends must propagate to all affected companies.
- Trends are time-bounded — "detected from updates in Feb–Mar 2025" — so partners know recency.
- Dismissed trends stay archived — don't resurface until new evidence emerges.

---

## Navigation Design

### Sidebar (persistent)

```
FundOS                    [⌘K Search]

OVERVIEW
  Dashboard               /
  Portfolio               /portfolio
  Updates                 /updates     [3 unread badge]

INTELLIGENCE
  Trends                  /trends      [2 new badge]
  Market Intelligence     /intelligence

REPORTING
  LP Reports              /lp-reports

SETTINGS
  Team
  Preferences
```

### Command Palette (`⌘K`)

Supports:
- Jump to any company by name
- Jump to any route
- "New update for [company]" — deep-link to update form
- "Generate LP Report" — opens report generator
- "Search updates" — full-text search across founder updates
- Recent pages

### Keyboard shortcuts (global)

| Shortcut | Action |
|---|---|
| `⌘K` | Open command palette |
| `⌘/` | Open keyboard shortcuts help |
| `⌘B` | Toggle sidebar |
| In updates inbox: `j/k` | Next/previous update |
| In updates inbox: `r` | Mark reviewed |
| In updates inbox: `t` | Create task |
| In portfolio table: `⌘F` | Filter |

---

## Empty States

Every screen has an intentional empty state:

| Screen | Empty State |
|---|---|
| Dashboard | "Add your first portfolio company to get started." → CTA |
| Portfolio | "No companies match your filter." → clear filters CTA |
| Updates inbox | "You're all caught up." — not a loading state |
| Trends | "No trends detected yet. Trends emerge after 3+ founder updates." |
| LP Reports | "No reports generated yet." → Generate first report CTA |
| Market Intelligence | "No signals this week." |

Empty states communicate system status, not emptiness.

---

## UX Principles

**Information density:** Show the maximum relevant data per screen without clutter. Inspired by Ramp and Linear. No padding as a substitute for content.

**Progressive disclosure:** Summary → detail → raw data. Partners see summaries; clicking reveals depth.

**Trust signals:** Data timestamps everywhere. "Last updated 2h ago." Partners need to know if data is fresh.

**Zero-loading pages:** Skeleton states for all async content. The shell renders instantly; data streams in.

**Actionability:** Every insight should have an obvious next action. Risk card → "Create task". Trend → "Create action". Update → "Mark reviewed" + "Assign request".
