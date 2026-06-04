import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// ============================================================
// HELPERS
// ============================================================

function getPeriod(monthsAgo: number): string {
  const d = new Date(2026, 5, 1) // June 2026
  d.setMonth(d.getMonth() - monthsAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n)}`
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`
}

function hScore(growth: number, runway: number, burn: number, mrr: number, nrr = 100): number {
  const g = growth >= 0.15 ? 100 : growth >= 0.08 ? 80 : growth >= 0.03 ? 60 : growth >= 0 ? 40 : growth >= -0.05 ? 20 : 5
  const rt = nrr >= 120 ? 100 : nrr >= 110 ? 85 : nrr >= 105 ? 70 : nrr >= 100 ? 50 : nrr >= 95 ? 30 : 15
  const r = runway >= 24 ? 100 : runway >= 18 ? 85 : runway >= 12 ? 70 : runway >= 9 ? 55 : runway >= 6 ? 35 : runway >= 3 ? 15 : 5
  const ratio = mrr > 0 ? burn / mrr : 99
  const b = ratio <= 0.5 ? 100 : ratio <= 1 ? 80 : ratio <= 2 ? 60 : ratio <= 3 ? 40 : ratio <= 5 ? 20 : 5
  return Math.round(g * 0.35 + rt * 0.25 + r * 0.25 + b * 0.15)
}

// ============================================================
// COMPANY DEFINITIONS
// ============================================================

interface C {
  name: string; slug: string
  sector: 'SAAS' | 'FINTECH' | 'AI' | 'DEVTOOLS' | 'CLIMATETECH'
  stage: 'PRE_SEED' | 'SEED' | 'SERIES_A' | 'SERIES_B'
  health: 'HEALTHY' | 'WATCHLIST' | 'AT_RISK'
  desc: string; year: number; website: string
  mrr: number  // current MRR
  g: number    // monthly growth rate
  burn: number // monthly burn
  cash: number // current cash
  hc: number   // headcount
  gm: number   // gross margin (0-1)
  nrr: number  // NRR as integer (110 = 110%)
}

const COMPANIES: C[] = [
  // ── SaaS (8) ────────────────────────────────────────────────
  { name: 'Axiom AI', slug: 'axiom-ai', sector: 'SAAS', stage: 'SERIES_A', health: 'WATCHLIST',
    desc: 'AI-powered workflow automation for B2B operations teams. Integrates with CRMs, ERPs, and data warehouses to eliminate repetitive work.',
    year: 2021, website: 'https://axiom.ai', mrr: 580000, g: 0.05, burn: 850000, cash: 6500000, hc: 45, gm: 0.72, nrr: 108 },
  { name: 'DataPulse', slug: 'datapulse', sector: 'SAAS', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'Product analytics platform for enterprise software teams. Replaces fragmented tooling with a unified behavioral data warehouse and insight layer.',
    year: 2020, website: 'https://datapulse.io', mrr: 2100000, g: 0.10, burn: 1800000, cash: 36000000, hc: 120, gm: 0.78, nrr: 118 },
  { name: 'Luminary Health', slug: 'luminary-health', sector: 'SAAS', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'Workforce management SaaS for hospital systems. Automates scheduling, credentialing, and compliance across multi-site health networks.',
    year: 2021, website: 'https://luminaryhealth.co', mrr: 820000, g: 0.08, burn: 680000, cash: 12000000, hc: 58, gm: 0.74, nrr: 114 },
  { name: 'NovaPay', slug: 'novapay', sector: 'SAAS', stage: 'SERIES_A', health: 'AT_RISK',
    desc: 'B2B payments infrastructure for SMBs. Combines invoicing, ACH rails, and working capital in a single API-first platform.',
    year: 2022, website: 'https://novapay.dev', mrr: 510000, g: -0.03, burn: 680000, cash: 1300000, hc: 38, gm: 0.61, nrr: 94 },
  { name: 'ClearDesk', slug: 'cleardesk', sector: 'SAAS', stage: 'SEED', health: 'AT_RISK',
    desc: 'Async work platform that replaces recurring meetings with structured written workflows. Targets distributed software teams.',
    year: 2022, website: 'https://cleardesk.app', mrr: 95000, g: -0.04, burn: 210000, cash: 410000, hc: 22, gm: 0.82, nrr: 88 },
  { name: 'Fieldstack', slug: 'fieldstack', sector: 'SAAS', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'Construction project management platform. Connects general contractors, subs, and owners in a real-time project coordination layer.',
    year: 2021, website: 'https://fieldstack.io', mrr: 760000, g: 0.09, burn: 620000, cash: 10500000, hc: 51, gm: 0.70, nrr: 112 },
  { name: 'Vantage CRM', slug: 'vantage-crm', sector: 'SAAS', stage: 'SEED', health: 'WATCHLIST',
    desc: 'Vertical CRM built for freight logistics brokers. Replaces generic CRMs with load-tracking, carrier scoring, and compliance workflows.',
    year: 2022, website: 'https://vantagecrm.com', mrr: 145000, g: 0.04, burn: 185000, cash: 1900000, hc: 18, gm: 0.76, nrr: 106 },
  { name: 'GridSync', slug: 'gridsync', sector: 'SAAS', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'Utility billing and revenue management SaaS. Serves municipal utilities and rural co-ops with metering, billing, and customer portal modules.',
    year: 2019, website: 'https://gridsync.com', mrr: 3200000, g: 0.07, burn: 2400000, cash: 35000000, hc: 145, gm: 0.69, nrr: 110 },

  // ── AI (7) ──────────────────────────────────────────────────
  { name: 'Resonance Labs', slug: 'resonance-labs', sector: 'AI', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'LLM fine-tuning and evaluation infrastructure for enterprises deploying domain-specific AI. Reduces model customization cost by 80% vs. training from scratch.',
    year: 2022, website: 'https://resonancelabs.ai', mrr: 920000, g: 0.12, burn: 780000, cash: 14000000, hc: 62, gm: 0.71, nrr: 122 },
  { name: 'Optic AI', slug: 'optic-ai', sector: 'AI', stage: 'SEED', health: 'WATCHLIST',
    desc: 'Computer vision quality assurance for discrete manufacturing. Replaces human visual inspection on production lines with real-time defect detection.',
    year: 2022, website: 'https://optic.ai', mrr: 180000, g: 0.05, burn: 280000, cash: 2100000, hc: 24, gm: 0.65, nrr: 105 },
  { name: 'Narrator AI', slug: 'narrator-ai', sector: 'AI', stage: 'SEED', health: 'HEALTHY',
    desc: 'Automated market research platform. Synthesizes primary research, news, and competitor signals into weekly intelligence briefs for strategy teams.',
    year: 2023, website: 'https://narratorai.com', mrr: 220000, g: 0.11, burn: 165000, cash: 4500000, hc: 19, gm: 0.83, nrr: 116 },
  { name: 'Vertex ML', slug: 'vertex-ml', sector: 'AI', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'ML operations platform for data science teams at scale. Manages experiment tracking, model registry, deployment pipelines, and drift monitoring.',
    year: 2020, website: 'https://vertexmlops.com', mrr: 4800000, g: 0.09, burn: 3900000, cash: 45000000, hc: 195, gm: 0.73, nrr: 119 },
  { name: 'Prism Intelligence', slug: 'prism-intelligence', sector: 'AI', stage: 'PRE_SEED', health: 'WATCHLIST',
    desc: 'Competitive intelligence AI for B2B sales teams. Monitors competitor pricing, feature launches, and win/loss patterns to inform deal strategy.',
    year: 2024, website: 'https://prismintel.ai', mrr: 28000, g: 0.03, burn: 85000, cash: 620000, hc: 9, gm: 0.88, nrr: 102 },
  { name: 'TrueSignal', slug: 'truesignal', sector: 'AI', stage: 'SEED', health: 'HEALTHY',
    desc: 'AI-native fraud detection for digital lending. Uses behavioral biometrics and device intelligence to cut fraud losses without increasing friction.',
    year: 2022, website: 'https://truesignal.io', mrr: 195000, g: 0.13, burn: 145000, cash: 3800000, hc: 17, gm: 0.80, nrr: 120 },
  { name: 'Forge AI', slug: 'forge-ai', sector: 'AI', stage: 'SERIES_A', health: 'WATCHLIST',
    desc: 'AI-native design tooling for product teams. Generates UI components, interaction patterns, and design tokens from natural language specifications.',
    year: 2022, website: 'https://forge.ai', mrr: 640000, g: 0.05, burn: 920000, cash: 7200000, hc: 52, gm: 0.77, nrr: 107 },

  // ── Fintech (6) ─────────────────────────────────────────────
  { name: 'Cascade Finance', slug: 'cascade-finance', sector: 'FINTECH', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'SMB lending platform combining cash-flow underwriting with embedded distribution through accounting software partnerships.',
    year: 2019, website: 'https://cascadefinance.com', mrr: 3800000, g: 0.11, burn: 2900000, cash: 42000000, hc: 168, gm: 0.58, nrr: 115 },
  { name: 'Ember Card', slug: 'ember-card', sector: 'FINTECH', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'Corporate expense management platform for high-growth startups. Combines virtual cards, receipt capture, and policy enforcement in one product.',
    year: 2021, website: 'https://embercard.com', mrr: 1100000, g: 0.08, burn: 890000, cash: 16000000, hc: 72, gm: 0.62, nrr: 113 },
  { name: 'BlockVault', slug: 'blockvault', sector: 'FINTECH', stage: 'SERIES_A', health: 'AT_RISK',
    desc: 'Institutional-grade crypto custody and treasury management. Serves hedge funds, family offices, and DAOs with multi-sig cold storage and compliance tooling.',
    year: 2021, website: 'https://blockvault.io', mrr: 420000, g: -0.05, burn: 620000, cash: 1100000, hc: 31, gm: 0.55, nrr: 91 },
  { name: 'Meridian Payments', slug: 'meridian-payments', sector: 'FINTECH', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'Cross-border payment infrastructure for emerging market corridors. Focuses on Africa-Europe and LatAm-US remittance and B2B settlement.',
    year: 2021, website: 'https://meridianpay.co', mrr: 890000, g: 0.09, burn: 720000, cash: 13000000, hc: 64, gm: 0.54, nrr: 111 },
  { name: 'Ledger Logic', slug: 'ledger-logic', sector: 'FINTECH', stage: 'SEED', health: 'HEALTHY',
    desc: 'Accounting automation for e-commerce brands. Connects Shopify, Amazon, and Stripe to reconcile, categorize, and close books automatically.',
    year: 2023, website: 'https://ledgerlogic.io', mrr: 165000, g: 0.12, burn: 130000, cash: 3200000, hc: 15, gm: 0.79, nrr: 118 },
  { name: 'Nova Credit', slug: 'nova-credit', sector: 'FINTECH', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'Alternative credit scoring using cash-flow, rent, and payroll data. Enables lenders to serve thin-file borrowers with lower default rates.',
    year: 2020, website: 'https://novacredit.io', mrr: 2900000, g: 0.10, burn: 2200000, cash: 38000000, hc: 142, gm: 0.66, nrr: 116 },

  // ── DevTools (5) ────────────────────────────────────────────
  { name: 'Shipyard', slug: 'shipyard', sector: 'DEVTOOLS', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'CI/CD platform built for monorepos. Intelligent build caching, affected-module detection, and parallelization cut build times by 10×.',
    year: 2021, website: 'https://shipyard.build', mrr: 1050000, g: 0.11, burn: 850000, cash: 15000000, hc: 68, gm: 0.82, nrr: 120 },
  { name: 'Depot', slug: 'depot', sector: 'DEVTOOLS', stage: 'SEED', health: 'HEALTHY',
    desc: 'Remote Docker build infrastructure. Eliminates slow local builds by running docker builds in the cloud with persistent layer caching.',
    year: 2022, website: 'https://depot.dev', mrr: 145000, g: 0.14, burn: 110000, cash: 3500000, hc: 14, gm: 0.85, nrr: 122 },
  { name: 'Relay', slug: 'relay', sector: 'DEVTOOLS', stage: 'SEED', health: 'HEALTHY',
    desc: 'API mocking and contract testing platform. Enables frontend and backend teams to develop in parallel without waiting for integration.',
    year: 2023, website: 'https://relay.dev', mrr: 125000, g: 0.10, burn: 95000, cash: 2800000, hc: 13, gm: 0.84, nrr: 115 },
  { name: 'Codemap', slug: 'codemap', sector: 'DEVTOOLS', stage: 'SERIES_A', health: 'WATCHLIST',
    desc: 'Dependency analysis and architectural intelligence for large codebases. Helps platform teams understand blast radius, ownership, and technical debt.',
    year: 2021, website: 'https://codemap.dev', mrr: 520000, g: 0.04, burn: 720000, cash: 5800000, hc: 44, gm: 0.80, nrr: 105 },
  { name: 'Runloop', slug: 'runloop', sector: 'DEVTOOLS', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'On-demand development environments as a service. Spins up fully configured, cloud-hosted dev environments from any git branch in under 60 seconds.',
    year: 2020, website: 'https://runloop.dev', mrr: 2400000, g: 0.12, burn: 1900000, cash: 32000000, hc: 128, gm: 0.76, nrr: 121 },

  // ── ClimateTech (4) ─────────────────────────────────────────
  { name: 'Arbor Systems', slug: 'arbor-systems', sector: 'CLIMATETECH', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'Carbon credit verification platform using satellite imagery and ML. Automates MRV workflows for reforestation and soil carbon projects.',
    year: 2021, website: 'https://arborsystems.earth', mrr: 780000, g: 0.09, burn: 640000, cash: 11500000, hc: 55, gm: 0.68, nrr: 113 },
  { name: 'Lumos Energy', slug: 'lumos-energy', sector: 'CLIMATETECH', stage: 'SEED', health: 'WATCHLIST',
    desc: 'Commercial solar financing platform for SMBs. Combines energy audits, installation coordination, and PPA structuring in a single workflow.',
    year: 2022, website: 'https://lumosenergy.com', mrr: 110000, g: 0.04, burn: 160000, cash: 1400000, hc: 16, gm: 0.51, nrr: 104 },
  { name: 'Cascade Biocarbon', slug: 'cascade-biocarbon', sector: 'CLIMATETECH', stage: 'PRE_SEED', health: 'HEALTHY',
    desc: 'Industrial carbon capture using enhanced rock weathering. Partners with agricultural operations to sequester CO2 at sub-$50/tonne cost.',
    year: 2024, website: 'https://cascadebiocarbon.com', mrr: 12000, g: 0.08, burn: 75000, cash: 1800000, hc: 8, gm: 0.42, nrr: 100 },
  { name: 'Verdant Grid', slug: 'verdant-grid', sector: 'CLIMATETECH', stage: 'SEED', health: 'HEALTHY',
    desc: 'Demand response SaaS for electric utilities. Aggregates behind-the-meter assets to provide grid balancing services and reduce peak-demand costs.',
    year: 2022, website: 'https://verdantgrid.com', mrr: 180000, g: 0.10, burn: 140000, cash: 3600000, hc: 18, gm: 0.72, nrr: 112 },
]

// ============================================================
// METRIC GENERATION
// ============================================================

interface MetricRow {
  period: string; mrr: number; arr: number; revenueGrowthMom: number
  burnRate: number; cashBalance: number; runway: number
  headcount: number; grossMargin: number; nrr: number; healthScore: number
}

function genMetrics(c: C): MetricRow[] {
  const MONTHS = 18
  const rows: MetricRow[] = []

  for (let i = 0; i <= MONTHS; i++) {
    const ago = MONTHS - i
    const period = getPeriod(ago)
    const mrr = c.mrr / Math.pow(1 + c.g, ago)
    const burnFactor = 0.55 + 0.45 * (i / MONTHS)
    const burn = c.burn * burnFactor

    // Cash at this point = current cash + all future burn from here to now
    let cash = c.cash
    for (let j = i + 1; j <= MONTHS; j++) {
      cash += c.burn * (0.55 + 0.45 * (j / MONTHS))
    }

    const runway = burn > 0 ? cash / burn : 999
    const prevMrr = c.mrr / Math.pow(1 + c.g, ago + 1)
    const growth = prevMrr > 0 ? (mrr - prevMrr) / prevMrr : 0
    const hc = Math.max(3, Math.round(c.hc * (0.45 + 0.55 * (i / MONTHS))))

    rows.push({
      period, mrr, arr: mrr * 12, revenueGrowthMom: growth,
      burnRate: burn, cashBalance: cash, runway,
      headcount: hc, grossMargin: c.gm, nrr: c.nrr,
      healthScore: hScore(growth, runway, burn, mrr, c.nrr),
    })
  }

  return rows
}

// ============================================================
// UPDATE NARRATIVE HELPERS
// ============================================================

function wins(c: C, m: MetricRow, monthsAgo: number): string {
  const prevMrr = c.mrr / Math.pow(1 + c.g, monthsAgo + 1)
  const added = m.mrr - prevMrr

  const byS: Record<string, string> = {
    SAAS: `Added ${fmt(added)} in net new MRR this month, bringing ARR to ${fmt(m.mrr * 12)}. Closed ${Math.max(2, Math.round(added / 25000))} new enterprise accounts. NRR tracking at ${m.nrr}%, driven by expansion in existing accounts.`,
    AI: `Shipped major model quality improvements — internal benchmarks show ${Math.round(8 + monthsAgo * 1.5)}% improvement over previous version. Converted ${Math.max(1, Math.round(added / 30000))} enterprise pilots to paid. ACV expanding as customers add more use cases.`,
    FINTECH: `Processed ${fmt(m.mrr * 18)} in monthly volume, up ${pct(c.g)} from prior month. Signed ${Math.max(1, Math.round(added / 40000))} new institutional clients. Compliance certifications progressing on schedule.`,
    DEVTOOLS: `Developer base grew to ${m.headcount * 180} active users. Closed ${Math.max(1, Math.round(added / 20000))} enterprise team deals. OSS community growing — ${Math.round(m.headcount * 85)} GitHub stars. Self-serve expansion strong.`,
    CLIMATETECH: `Onboarded ${Math.max(1, Math.round(added / 15000))} new corporate sustainability partners. MRV pipeline growing ahead of Q4 compliance deadlines. Partnership with major land asset manager advancing to contract stage.`,
  }
  return byS[c.sector] ?? byS.SAAS
}

function risks(c: C, m: MetricRow): string {
  if (c.health === 'AT_RISK') {
    const runway = m.cashBalance / m.burnRate
    return `Runway at ${runway.toFixed(1)} months. Revenue headwinds persisting — net churn elevated as customers reduce spend. Actively in conversations with ${c.stage === 'SERIES_A' ? 'lead investor and two new funds' : 'seed investors'} to extend runway. Hiring freeze in effect. Cost reduction initiatives identified; execution in progress.`
  }
  if (c.health === 'WATCHLIST') {
    return `Burn increased ${pct(0.06 + Math.random() * 0.04)} this month with addition of ${Math.max(1, Math.round(m.headcount * 0.05))} net new hires. Runway at ${(m.cashBalance / m.burnRate).toFixed(0)} months — monitoring closely. One late-stage enterprise deal pushed to next quarter due to procurement delays. Growth stabilizing but below target pace.`
  }
  return `No material risks to report. Monitoring burn rate discipline as team scales. Pipeline coverage healthy at ${(2.8 + Math.random() * 1.2).toFixed(1)}× quota. Macro environment creating some elongation in deal cycles for larger ACV opportunities.`
}

function hiring(c: C, m: MetricRow): string {
  const roles: Record<string, string> = {
    SAAS: `Enterprise AE (2 open), Senior Product Manager, Customer Success Manager`,
    AI: `Senior ML Engineer, Applied Research Scientist, Enterprise Solutions Engineer`,
    FINTECH: `Head of Compliance, Senior Backend Engineer, Partnerships Manager`,
    DEVTOOLS: `Senior Software Engineer (2 open), Developer Advocate, Solutions Architect`,
    CLIMATETECH: `Carbon Markets Analyst, Senior Data Scientist, Business Development Lead`,
  }
  if (c.health === 'AT_RISK') return 'Hiring freeze. Evaluating open roles on case-by-case basis only.'
  return `Actively hiring: ${roles[c.sector] ?? roles.SAAS}. Priority is technical depth heading into H2 roadmap execution.`
}

// ============================================================
// RISKS PER COMPANY
// ============================================================

function companyRisks(c: C): Array<{ title: string; description: string; severity: string; category: string; source: string }> {
  if (c.health === 'AT_RISK') return [
    { title: 'Critical runway — bridge financing required', description: `Current burn rate of ${fmt(c.burn)}/month against ${fmt(c.cash)} cash gives fewer than 3 months of runway. Bridge financing or immediate cost reduction is required.`, severity: 'CRITICAL', category: 'BURN', source: 'Founder update analysis' },
    { title: 'Revenue declining — churn exceeding new bookings', description: `MoM growth at ${pct(c.g)}, indicating net revenue contraction. Churn rate elevated above ${pct(Math.abs(c.g) + 0.03)}/month. Retention playbook needs urgent activation.`, severity: 'HIGH', category: 'REVENUE', source: 'Metrics analysis' },
    { title: 'Fundraising timeline at risk', description: 'No term sheet signed despite active process. Market conditions creating significant headwinds for next round at current metrics trajectory.', severity: 'HIGH', category: 'FUNDRAISING', source: 'Founder update' },
  ]
  if (c.health === 'WATCHLIST') return [
    { title: 'Burn elevated relative to growth', description: `Burn multiple of ${(c.burn / c.mrr).toFixed(1)}× at current MRR growth rate. Runway at ${(c.cash / c.burn).toFixed(0)} months. Target is 12+ months ahead of next raise.`, severity: 'MEDIUM', category: 'BURN', source: 'Metrics analysis' },
    { title: 'Growth decelerating below plan', description: `${pct(c.g)} MoM growth is below the ${pct(c.g + 0.04)} plan. Need to identify and address top-of-funnel constraints before Q4 board review.`, severity: 'MEDIUM', category: 'REVENUE', source: 'Founder update' },
  ]
  return [
    { title: 'Key hire risk in engineering leadership', description: 'VP Engineering role has been open for 8 weeks. Executing on roadmap with interim coverage — timeline risk if not closed this quarter.', severity: 'LOW', category: 'TEAM', source: 'Founder update' },
  ]
}

// ============================================================
// TREND FINDINGS
// ============================================================

const TRENDS = [
  {
    title: 'Enterprise sales cycles extending across SaaS portfolio',
    summary: '4 SaaS portfolio companies report procurement timelines extending 30–60 days, with procurement security reviews adding new friction for enterprise deals.',
    category: 'SHARED_RISK',
    severity: 'HIGH',
    companies: ['axiom-ai', 'datapulse', 'fieldstack', 'gridsync'],
    quotes: [
      'Enterprise procurement cycles extending — 3 late-stage deals pushed 30-45 days into next quarter.',
      'Seeing procurement security review requirements adding 4-6 weeks to healthcare deal timelines.',
      'Construction enterprise segment: procurement averaging 90 days, up from 60 days last year.',
      'Two Q2 enterprise deals pushed to Q3 due to new vendor security questionnaire requirements.',
    ],
  },
  {
    title: 'AI infrastructure cost pressure emerging',
    summary: '3 AI companies report margin pressure from rising inference costs, particularly as usage scales beyond initial pricing assumptions with foundation model providers.',
    category: 'SHARED_RISK',
    severity: 'MEDIUM',
    companies: ['resonance-labs', 'narrator-ai', 'forge-ai'],
    quotes: [
      'OpenAI pricing changes creating 12% margin pressure on our inference-heavy enterprise tier.',
      'Compute costs up 18% MoM with usage growth. Working on model optimization to offset.',
      'Foundation model API costs scaling faster than revenue. Evaluating open-source alternatives for inference.',
    ],
  },
  {
    title: 'Series A companies raising in compressed valuation environment',
    summary: '3 Series A portfolio companies actively in fundraising conversations report valuation compression of 25–40% vs. 2022 benchmarks, with longer timelines to close.',
    category: 'FUNDRAISING',
    severity: 'HIGH',
    companies: ['axiom-ai', 'forge-ai', 'novapay'],
    quotes: [
      'Extending Series B conversations — investors focused on path to profitability. Expecting 3–4 more months to close.',
      'Market expects 4× revenue multiple versus 8× we raised Series A at. Adjusting expectations.',
      'Bridge conversations underway. Existing investors supportive but new money is slow. Need resolution by August.',
    ],
  },
  {
    title: 'DevTools companies reporting strong developer community growth',
    summary: '3 DevTools companies report accelerating OSS adoption translating to enterprise pipeline, with community-led growth outperforming direct sales channels.',
    category: 'GROWTH_PATTERN',
    severity: 'LOW',
    companies: ['depot', 'relay', 'shipyard'],
    quotes: [
      'GitHub stars doubled in 90 days. Self-serve to enterprise conversion at 8%, up from 5%.',
      'Developer community driving 65% of new enterprise leads. Inbound pipeline at all-time high.',
      'Word-of-mouth from OSS contributors converting to paid teams at 3× our paid acquisition rate.',
    ],
  },
  {
    title: 'Hiring slowdowns across watchlist companies',
    summary: '4 portfolio companies on the watchlist have paused or significantly reduced hiring, indicating caution around burn management heading into H2.',
    category: 'HIRING_PATTERN',
    severity: 'MEDIUM',
    companies: ['axiom-ai', 'optic-ai', 'codemap', 'lumos-energy'],
    quotes: [
      'Paused 4 open engineering roles pending Q3 revenue confirmation. Protecting 9 months runway.',
      'Reduced hiring plan from 8 to 3 net new hires in H2. Engineering headcount growth on hold.',
      'Board-approved plan to extend runway to 14 months means no net new headcount this quarter.',
      'Only hiring revenue-generating roles — AE and CS. Pausing all engineering growth until MRR improves.',
    ],
  },
]

// ============================================================
// MARKET SIGNALS
// ============================================================

const SIGNALS = [
  { title: 'Salesforce acquires workflow automation startup for $1.4B', summary: 'Salesforce acquires Automation Anywhere competitor to expand its Einstein AI portfolio, signaling continued consolidation in the B2B workflow automation space.', source: 'TechCrunch', category: 'ACQUISITION', companies: ['axiom-ai'], publishedAgo: 5 },
  { title: 'OpenAI cuts API pricing by 50% for GPT-4o tier', summary: 'OpenAI announces significant price reductions for its latest models, benefiting AI application builders while creating margin pressure for inference-heavy services.', source: 'OpenAI Blog', category: 'MARKET_TREND', companies: ['resonance-labs', 'narrator-ai', 'forge-ai'], publishedAgo: 12 },
  { title: 'Stripe launches embedded lending product for platforms', summary: 'Stripe Capital extends to platform-embedded lending, directly competing with SMB fintech lenders using payment data for underwriting.', source: 'Financial Times', category: 'COMPETITOR_ACTIVITY', companies: ['cascade-finance', 'novapay'], publishedAgo: 8 },
  { title: 'EU AI Act enforcement begins for high-risk applications', summary: 'The EU AI Act begins enforcement for high-risk categories including financial services and employment tools, requiring conformity assessments and documentation.', source: 'Reuters', category: 'REGULATION', companies: ['resonance-labs', 'vertex-ml', 'truesignal', 'nova-credit'], publishedAgo: 3 },
  { title: 'Linear raises $35M Series B at $400M valuation', summary: 'Project management tool Linear raises growth round on continued ARR expansion, validating the market for opinionated productivity tools targeting engineering teams.', source: 'Axios', category: 'FUNDING_NEWS', companies: ['cleardesk', 'fieldstack'], publishedAgo: 18 },
  { title: 'Construction tech market projected to reach $25B by 2028', summary: 'New Gartner report highlights accelerating digitization in construction, with project management, BIM, and financial tools seeing strongest adoption.', source: 'Gartner', category: 'MARKET_TREND', companies: ['fieldstack'], publishedAgo: 22 },
  { title: 'GitHub Copilot usage hits 1.8M paid subscribers', summary: 'Microsoft reports continued strong adoption of AI coding tools, confirming developer productivity tooling as a mainstream enterprise procurement category.', source: 'Microsoft Blog', category: 'MARKET_TREND', companies: ['shipyard', 'depot', 'runloop'], publishedAgo: 9 },
  { title: 'Andreessen Horowitz leads $120M round in MLOps platform', summary: 'Weights & Biases competitor secures growth funding, validating continued investment appetite for ML infrastructure despite public market compression.', source: 'The Information', category: 'FUNDING_NEWS', companies: ['vertex-ml', 'resonance-labs'], publishedAgo: 31 },
  { title: 'Cross-border payment volume from Africa hits $48B annually', summary: 'World Bank data shows record remittance volumes in Africa-EU corridor, driven by diaspora growth and improving fintech infrastructure.', source: 'World Bank', category: 'MARKET_TREND', companies: ['meridian-payments'], publishedAgo: 14 },
  { title: 'Carbon credit market volumes up 35% in H1 2026', summary: 'Voluntary carbon market sees record activity ahead of anticipated mandatory compliance frameworks in the US and EU. Verification backlog creating bottlenecks.', source: 'Bloomberg NEF', category: 'MARKET_TREND', companies: ['arbor-systems', 'cascade-biocarbon'], publishedAgo: 4 },
  { title: 'Rippling raises Series F at $13.5B valuation', summary: 'HR and workforce management platform raises mega-round, reinforcing the market opportunity for modern workforce operating systems in regulated industries.', source: 'Wall Street Journal', category: 'FUNDING_NEWS', companies: ['luminary-health', 'ember-card'], publishedAgo: 25 },
  { title: 'US crypto custody regulation framework published', summary: 'SEC and OCC release joint guidance on institutional digital asset custody, creating both compliance burden and competitive moat for regulated custodians.', source: 'CoinDesk', category: 'REGULATION', companies: ['blockvault'], publishedAgo: 7 },
  { title: 'Shopify reports 28% merchant growth in Q1 2026', summary: 'Shopify growth accelerates, expanding the addressable market for e-commerce tooling including accounting, analytics, and operations platforms.', source: 'Shopify Investor Relations', category: 'MARKET_TREND', companies: ['ledger-logic', 'datapulse'], publishedAgo: 16 },
  { title: 'Vercel acquires infrastructure startup, doubles down on DX', summary: 'Deployment platform acquisition signals continued consolidation in developer experience tooling and remote build infrastructure.', source: 'Vercel Blog', category: 'ACQUISITION', companies: ['depot', 'runloop', 'shipyard'], publishedAgo: 20 },
  { title: 'Insurance sector mandates AI explainability in underwriting', summary: 'State insurance regulators in 12 US states require AI-based underwriting decisions to include human-readable explanations, affecting credit scoring and lending AI.', source: 'Insurance Journal', category: 'REGULATION', companies: ['nova-credit', 'truesignal', 'cascade-finance'], publishedAgo: 11 },
  { title: 'AWS announces 40% price cut on GPU compute', summary: 'Amazon reduces pricing for ML training and inference instances, benefiting AI startups with significant compute costs and expanding the cost-efficiency window.', source: 'AWS Blog', category: 'MARKET_TREND', companies: ['resonance-labs', 'vertex-ml', 'optic-ai'], publishedAgo: 6 },
  { title: 'Utility grid stress events up 60% YoY in summer 2026', summary: 'Record heat and EV adoption driving grid stress across US markets, accelerating utility investment in demand response and smart grid capabilities.', source: 'NERC', category: 'MARKET_TREND', companies: ['verdant-grid', 'gridsync'], publishedAgo: 2 },
  { title: 'Plaid raises growth round, expands into payments infrastructure', summary: 'Plaid broadens its product footprint from data connectivity into payment initiation, competing more directly with API-first payment infrastructure providers.', source: 'Bloomberg', category: 'COMPETITOR_ACTIVITY', companies: ['novapay', 'meridian-payments'], publishedAgo: 28 },
  { title: 'Enterprise software spending growth forecast at 12% for 2026', summary: 'Gartner forecasts accelerating enterprise software spend driven by AI productivity tools, security, and cloud infrastructure. SMB segment slower.', source: 'Gartner', category: 'MARKET_TREND', companies: ['axiom-ai', 'datapulse', 'gridSync'], publishedAgo: 35 },
  { title: 'Y Combinator W26 batch: 40% of companies AI-native', summary: 'YC cohort composition signals continued investment in AI-native applications across verticals, intensifying competition in applied AI markets.', source: 'TechCrunch', category: 'MARKET_TREND', companies: ['narrator-ai', 'prism-intelligence', 'forge-ai'], publishedAgo: 42 },
]

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('Seeding FundOS database...')

  // Clear all tables in FK order
  await db.trendEvidence.deleteMany()
  await db.trendFinding.deleteMany()
  await db.companySignal.deleteMany()
  await db.marketSignal.deleteMany()
  await db.action.deleteMany()
  await db.opportunity.deleteMany()
  await db.risk.deleteMany()
  await db.founderUpdate.deleteMany()
  await db.metricSnapshot.deleteMany()
  await db.task.deleteMany()
  await db.reportCompany.deleteMany()
  await db.lPReportSection.deleteMany()
  await db.lPReport.deleteMany()
  await db.company.deleteMany()

  await db.user.upsert({
    where: { id: 'SYSTEM' },
    update: {},
    create: {
      id: 'SYSTEM',
      clerkId: 'system',
      email: 'system@fundos.local',
      name: 'System',
      role: 'PORTFOLIO_OPS',
    },
  })

  const companyMap: Record<string, string> = {} // slug → id

  // ── Companies + Metrics + Updates + Risks ───────────────────
  for (const c of COMPANIES) {
    const metrics = genMetrics(c)
    const latestMetric = metrics[metrics.length - 1]!
    const currentScore = hScore(latestMetric.revenueGrowthMom, latestMetric.runway, latestMetric.burnRate, latestMetric.mrr, latestMetric.nrr)

    const company = await db.company.create({
      data: {
        name: c.name, slug: c.slug,
        sector: c.sector, stage: c.stage,
        healthStatus: c.health, healthScore: currentScore,
        description: c.desc, website: c.website,
        foundedYear: c.year, country: 'US',
      },
    })
    companyMap[c.slug] = company.id
    console.log(`  ✓ ${c.name} (${c.health})`)

    // Metric snapshots (19 months: 18 historical + current)
    await db.metricSnapshot.createMany({
      data: metrics.map((m) => ({ companyId: company.id, ...m, source: 'FOUNDER_UPDATE' })),
    })

    // Founder updates (last 6 months)
    for (let ago = 6; ago >= 1; ago--) {
      const period = getPeriod(ago)
      const mIdx = metrics.findIndex((m) => m.period === period)
      const m = mIdx >= 0 ? metrics[mIdx]! : latestMetric

      const isReviewed = ago > 1
      const update = await db.founderUpdate.create({
        data: {
          companyId: company.id, period,
          mrr: m.mrr, burnRate: m.burnRate,
          cashBalance: m.cashBalance, runway: m.runway,
          headcount: m.headcount,
          fundraisingStatus: c.health === 'AT_RISK' ? 'ACTIVELY_RAISING' : c.stage === 'SERIES_B' ? 'NOT_RAISING' : ago <= 2 ? 'EXPLORING' : 'NOT_RAISING',
          wins: wins(c, m, ago),
          risks: risks(c, m),
          hiringNeeds: hiring(c, m),
          aiSummary: ago === 1
            ? `${c.name} reported ${c.health === 'AT_RISK' ? 'concerning' : c.health === 'WATCHLIST' ? 'mixed' : 'strong'} results for ${period}. MRR at ${fmt(m.mrr)} (${pct(c.g)} MoM). Burn at ${fmt(m.burnRate)}/month with ${m.runway.toFixed(1)} months runway. ${c.health === 'AT_RISK' ? 'Immediate attention required on runway and revenue trajectory.' : c.health === 'WATCHLIST' ? 'Monitoring burn and growth rate closely.' : 'On track vs. plan.'}`
            : null,
          aiProcessedAt: ago === 1 ? new Date() : null,
          reviewedAt: isReviewed ? new Date(Date.now() - ago * 30 * 24 * 60 * 60 * 1000) : null,
        },
      })

      // Generate risks for most recent update
      if (ago === 1) {
        const riskDefs = companyRisks(c)
        await db.risk.createMany({
          data: riskDefs.map((r) => ({
            companyId: company.id,
            updateId: update.id,
            title: r.title,
            description: r.description,
            severity: r.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
            category: r.category as 'BURN' | 'REVENUE' | 'TEAM' | 'PRODUCT' | 'MARKET' | 'FUNDRAISING' | 'OPERATIONAL' | 'LEGAL' | 'OTHER',
            source: r.source,
            status: 'OPEN',
          })),
        })
      }
    }
  }

  // ── Trend Findings ───────────────────────────────────────────
  for (const t of TRENDS) {
    const evidenceCompanies = t.companies.filter((s) => companyMap[s])
    const trend = await db.trendFinding.create({
      data: {
        title: t.title, summary: t.summary,
        category: t.category as 'SHARED_RISK' | 'HIRING_PATTERN' | 'FUNDRAISING' | 'GROWTH_PATTERN' | 'MARKET_EVENT' | 'OPERATIONAL',
        severity: t.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        affectedCount: evidenceCompanies.length,
        periodStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(),
        status: 'ACTIVE',
      },
    })

    await db.trendEvidence.createMany({
      data: evidenceCompanies.map((slug, i) => ({
        trendId: trend.id,
        companyId: companyMap[slug]!,
        quote: t.quotes[i] ?? t.quotes[0]!,
      })),
    })
  }
  console.log(`  ✓ ${TRENDS.length} trend findings`)

  // ── Market Signals ───────────────────────────────────────────
  for (const s of SIGNALS) {
    const signal = await db.marketSignal.create({
      data: {
        title: s.title, summary: s.summary,
        source: s.source, url: null,
        category: s.category as 'FUNDING_NEWS' | 'COMPETITOR_ACTIVITY' | 'MARKET_TREND' | 'REGULATION' | 'ACQUISITION' | 'IPO' | 'OTHER',
        publishedAt: new Date(Date.now() - s.publishedAgo * 24 * 60 * 60 * 1000),
        relevance: 0.8,
      },
    })

    const validSlugs = s.companies.filter((slug) => companyMap[slug])
    if (validSlugs.length > 0) {
      await db.companySignal.createMany({
        data: validSlugs.map((slug) => ({
          signalId: signal.id,
          companyId: companyMap[slug]!,
          relevanceExplanation: `${signal.title} directly impacts ${COMPANIES.find((c) => c.slug === slug)?.name} given their market position.`,
        })),
      })
    }
  }
  console.log(`  ✓ ${SIGNALS.length} market signals`)

  // ── Summary ──────────────────────────────────────────────────
  const counts = {
    companies: await db.company.count(),
    metrics: await db.metricSnapshot.count(),
    updates: await db.founderUpdate.count(),
    risks: await db.risk.count(),
    trends: await db.trendFinding.count(),
    signals: await db.marketSignal.count(),
  }
  console.log('\nSeed complete:')
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
}

main().catch(console.error).finally(() => db.$disconnect())
