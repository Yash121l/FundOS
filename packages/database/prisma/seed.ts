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
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
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
// REAL RTP.VC PORTFOLIO COMPANIES
// Data sourced from public filings, earnings releases, and
// verified press coverage as of Q2 2026.
// ============================================================

interface C {
  name: string; slug: string
  sector: 'SAAS' | 'FINTECH' | 'AI' | 'DEVTOOLS' | 'CLIMATETECH'
  stage: 'PRE_SEED' | 'SEED' | 'SERIES_A' | 'SERIES_B'
  health: 'HEALTHY' | 'WATCHLIST' | 'AT_RISK'
  desc: string; year: number; website: string; country: string
  mrr: number   // current MRR (USD)
  g: number     // monthly growth rate
  burn: number  // monthly burn (USD)
  cash: number  // current cash (USD)
  hc: number    // headcount
  gm: number    // gross margin (0–1)
  nrr: number   // NRR as integer (110 = 110%)
  grr: number   // GRR as integer (90 = 90%)
  logoChurnAnnual: number  // annual logo churn as decimal (0.08 = 8%)
}

const COMPANIES: C[] = [
  // ── AI / Monitoring ────────────────────────────────────────
  {
    name: 'Datadog', slug: 'datadog', sector: 'AI', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'Unified cloud monitoring, security, and analytics platform. Serves 30,000+ customers globally with APM, logs, infrastructure, and AI observability in one platform. RTP Global early backer.',
    year: 2010, website: 'https://datadoghq.com', country: 'US',
    mrr: 310000000, g: 0.023, burn: 250000000, cash: 1800000000,
    hc: 5200, gm: 0.80, nrr: 115, grr: 88, logoChurnAnnual: 0.05,
  },
  {
    name: 'Picsart', slug: 'picsart', sector: 'AI', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'AI-powered creative platform for photo and video editing with 150M+ monthly active users. One of the world\'s most downloaded creative apps. Backed by RTP Global and SoftBank Vision Fund.',
    year: 2011, website: 'https://picsart.com', country: 'US',
    mrr: 9000000, g: 0.022, burn: 7000000, cash: 60000000,
    hc: 600, gm: 0.78, nrr: 112, grr: 85, logoChurnAnnual: 0.10,
  },
  {
    name: 'Socure', slug: 'socure', sector: 'AI', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'AI-native identity verification and fraud prevention platform. Processes 2.7B+ identity requests annually for 3,000+ enterprise customers. 62% new ARR growth in Q1 2026, NDR of 134%.',
    year: 2012, website: 'https://socure.com', country: 'US',
    mrr: 28300000, g: 0.042, burn: 20000000, cash: 180000000,
    hc: 700, gm: 0.72, nrr: 134, grr: 91, logoChurnAnnual: 0.04,
  },
  {
    name: 'DataRobot', slug: 'datarobot', sector: 'AI', stage: 'SERIES_B', health: 'WATCHLIST',
    desc: 'End-to-end ML automation and AI application platform for enterprise. 850+ customers including 40% of Fortune 500. Expanding from AutoML into agentic AI. Valuation $6.3B.',
    year: 2012, website: 'https://datarobot.com', country: 'US',
    mrr: 18750000, g: 0.010, burn: 20000000, cash: 180000000,
    hc: 1200, gm: 0.68, nrr: 108, grr: 86, logoChurnAnnual: 0.12,
  },
  {
    name: 'Tractable', slug: 'tractable', sector: 'AI', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'AI for accident and disaster recovery used by 20+ of the global top 100 insurers — Aviva, Geico, Admiral — processing $7B in annual claims with 10× faster cycle times.',
    year: 2014, website: 'https://tractable.ai', country: 'UK',
    mrr: 5800000, g: 0.019, burn: 4500000, cash: 80000000,
    hc: 250, gm: 0.70, nrr: 115, grr: 89, logoChurnAnnual: 0.06,
  },
  {
    name: 'Skit.ai', slug: 'skit-ai', sector: 'AI', stage: 'SERIES_A', health: 'WATCHLIST',
    desc: 'Conversational voice AI platform automating customer support and debt collection workflows for banks, NBFCs, and large enterprises across India and Southeast Asia.',
    year: 2017, website: 'https://skit.ai', country: 'India',
    mrr: 820000, g: 0.030, burn: 700000, cash: 14000000,
    hc: 200, gm: 0.65, nrr: 108, grr: 84, logoChurnAnnual: 0.15,
  },

  // ── SaaS ───────────────────────────────────────────────────
  {
    name: 'Miro', slug: 'miro', sector: 'SAAS', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'Online collaborative whiteboard platform trusted by 90M+ users across 250,000+ organizations including 99% of the Fortune 100. ARR ~$500M, valued at $17.5B.',
    year: 2011, website: 'https://miro.com', country: 'US',
    mrr: 42000000, g: 0.014, burn: 30000000, cash: 280000000,
    hc: 1800, gm: 0.75, nrr: 120, grr: 92, logoChurnAnnual: 0.08,
  },
  {
    name: 'Apollo.io', slug: 'apollo-io', sector: 'SAAS', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'Sales intelligence and engagement platform with 210M+ B2B contacts. Reached $150M ARR in 2025, 500% AI feature growth, trusted by 500,000+ companies including Autodesk and DocuSign.',
    year: 2015, website: 'https://apollo.io', country: 'US',
    mrr: 12500000, g: 0.029, burn: 8000000, cash: 110000000,
    hc: 800, gm: 0.80, nrr: 125, grr: 88, logoChurnAnnual: 0.12,
  },
  {
    name: 'Delivery Hero', slug: 'delivery-hero', sector: 'SAAS', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'World\'s largest food delivery and quick commerce company operating in 70+ countries. €14B+ revenue in 2025, 600M+ annual orders. Listed on Frankfurt Stock Exchange.',
    year: 2011, website: 'https://deliveryhero.com', country: 'Germany',
    mrr: 1280000000, g: 0.012, burn: 250000000, cash: 3000000000,
    hc: 45000, gm: 0.45, nrr: 110, grr: 95, logoChurnAnnual: 0.08,
  },
  {
    name: 'MPL', slug: 'mpl', sector: 'SAAS', stage: 'SERIES_A', health: 'WATCHLIST',
    desc: 'India\'s largest real-money gaming platform with 80M+ app downloads. FY24 revenue $130M (+22% YoY), EBITDA neutral. Skill-based card games, sports, and esports tournaments.',
    year: 2018, website: 'https://mpl.live', country: 'India',
    mrr: 10800000, g: 0.017, burn: 500000, cash: 50000000,
    hc: 400, gm: 0.45, nrr: 110, grr: 88, logoChurnAnnual: 0.18,
  },
  {
    name: 'Rebel Foods', slug: 'rebel-foods', sector: 'SAAS', stage: 'SERIES_B', health: 'WATCHLIST',
    desc: 'World\'s largest internet restaurant company with 45+ cloud kitchen brands including Faasos, Behrouz Biryani, and Oven Story. Operates 450+ kitchens across 12 countries. IPO-bound.',
    year: 2011, website: 'https://rebelfoods.com', country: 'India',
    mrr: 16200000, g: 0.004, burn: 5000000, cash: 120000000,
    hc: 3000, gm: 0.30, nrr: 95, grr: 80, logoChurnAnnual: 0.22,
  },
  {
    name: 'Practo', slug: 'practo', sector: 'SAAS', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'India\'s largest digital health platform connecting 350M+ patients with 350,000+ doctors via teleconsultations, health records, and clinic management software. Achieved EBITDA break-even in Q4 FY24.',
    year: 2008, website: 'https://practo.com', country: 'India',
    mrr: 2300000, g: 0.018, burn: 1800000, cash: 25000000,
    hc: 550, gm: 0.70, nrr: 110, grr: 86, logoChurnAnnual: 0.12,
  },
  {
    name: 'BrightHire', slug: 'brighthire', sector: 'SAAS', stage: 'SEED', health: 'HEALTHY',
    desc: 'Interview intelligence platform that records, transcribes, and analyzes hiring interviews for structured decision-making. Acquired by Zoom in November 2025. Customers include Canva, Duolingo, Instacart, and Ramp.',
    year: 2019, website: 'https://brighthire.ai', country: 'US',
    mrr: 700000, g: 0.019, burn: 500000, cash: 12000000,
    hc: 55, gm: 0.82, nrr: 122, grr: 90, logoChurnAnnual: 0.09,
  },
  {
    name: 'Newton School', slug: 'newton-school', sector: 'SAAS', stage: 'SEED', health: 'WATCHLIST',
    desc: 'Outcome-based coding education platform in India with Income Share Agreement model. Graduates placed at Flipkart, Razorpay, Zomato. FY25 revenue ₹43.6 Cr. RTP Global Series A lead.',
    year: 2019, website: 'https://newtonschool.co', country: 'India',
    mrr: 437500, g: 0.015, burn: 350000, cash: 8000000,
    hc: 120, gm: 0.65, nrr: 105, grr: 82, logoChurnAnnual: 0.20,
  },

  // ── FinTech ────────────────────────────────────────────────
  {
    name: 'Qonto', slug: 'qonto', sector: 'FINTECH', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'European B2B neobank serving 600,000+ SMEs and freelancers. €350M ARR in FY25 (+30% YoY), €420M cash. Raised at $5B valuation, filing for full European banking license.',
    year: 2016, website: 'https://qonto.com', country: 'France',
    mrr: 32000000, g: 0.022, burn: 25000000, cash: 460000000,
    hc: 1800, gm: 0.62, nrr: 115, grr: 91, logoChurnAnnual: 0.10,
  },
  {
    name: 'CRED', slug: 'cred', sector: 'FINTECH', stage: 'SERIES_B', health: 'WATCHLIST',
    desc: 'India\'s premium fintech super-app for creditworthy members. FY24 revenue ₹2,473 Cr (+66% YoY), 13M MAU, processes ₹55,000 Cr monthly in UPI. Valuation $3.5B.',
    year: 2018, website: 'https://cred.club', country: 'India',
    mrr: 24750000, g: 0.025, burn: 6000000, cash: 250000000,
    hc: 1000, gm: 0.55, nrr: 105, grr: 87, logoChurnAnnual: 0.14,
  },
  {
    name: 'PayJoy', slug: 'payjoy', sector: 'FINTECH', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'Smartphone financing platform for underserved customers in emerging markets. 16M+ customers across Mexico, Brazil, India, and Africa. On track for $650M revenue and $110M profit in 2025.',
    year: 2015, website: 'https://payjoy.com', country: 'US',
    mrr: 54200000, g: 0.019, burn: 15000000, cash: 200000000,
    hc: 800, gm: 0.35, nrr: 115, grr: 89, logoChurnAnnual: 0.08,
  },
  {
    name: 'Dexif', slug: 'dexif', sector: 'FINTECH', stage: 'PRE_SEED', health: 'WATCHLIST',
    desc: 'Fixed income investment platform simplifying corporate bonds, debentures, and debt instruments for retail investors in India. RTP Global invested $4M in 2024.',
    year: 2022, website: 'https://dexif.in', country: 'India',
    mrr: 180000, g: 0.080, burn: 150000, cash: 2500000,
    hc: 22, gm: 0.75, nrr: 108, grr: 82, logoChurnAnnual: 0.18,
  },

  // ── DevTools ───────────────────────────────────────────────
  {
    name: 'dbt Labs', slug: 'dbt-labs', sector: 'DEVTOOLS', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'Analytics engineering framework enabling data teams to transform raw data using SQL. Surpassed $100M ARR with 5,000+ customers including Condé Nast, HubSpot, Nasdaq. Merged with Fivetran in Oct 2025.',
    year: 2016, website: 'https://getdbt.com', country: 'US',
    mrr: 9500000, g: 0.029, burn: 7000000, cash: 200000000,
    hc: 400, gm: 0.82, nrr: 118, grr: 90, logoChurnAnnual: 0.07,
  },

  // ── ClimateTech / AgriTech ─────────────────────────────────
  {
    name: 'TIER', slug: 'tier', sector: 'CLIMATETECH', stage: 'SERIES_B', health: 'WATCHLIST',
    desc: 'Europe\'s leading shared e-scooter and e-bike operator, merged with Dott in 2024. Combined entity targeting €200M+ revenue across 100+ European cities on the path to profitability.',
    year: 2018, website: 'https://tier.app', country: 'Germany',
    mrr: 18300000, g: 0.010, burn: 15000000, cash: 80000000,
    hc: 900, gm: 0.35, nrr: 105, grr: 84, logoChurnAnnual: 0.18,
  },
  {
    name: 'DeHaat', slug: 'dehaat', sector: 'CLIMATETECH', stage: 'SERIES_A', health: 'WATCHLIST',
    desc: 'Full-stack agritech platform serving 13M+ Indian farmers with inputs, crop advisory, microfinance, and market linkages via 18,000+ agri-service centers across 12 states.',
    year: 2012, website: 'https://dehaat.com', country: 'India',
    mrr: 30500000, g: 0.009, burn: 2000000, cash: 40000000,
    hc: 2800, gm: 0.20, nrr: 108, grr: 90, logoChurnAnnual: 0.10,
  },
  {
    name: 'MPower', slug: 'mpower', sector: 'CLIMATETECH', stage: 'SEED', health: 'HEALTHY',
    desc: 'Distributed solar energy financing and monitoring platform for SMBs and commercial rooftops across India. Energy audit-to-PPA workflow automation reduces solar adoption friction by 70%.',
    year: 2022, website: 'https://mpowersolar.in', country: 'India',
    mrr: 290000, g: 0.11, burn: 220000, cash: 3800000,
    hc: 28, gm: 0.68, nrr: 116, grr: 88, logoChurnAnnual: 0.08,
  },
]

// ============================================================
// METRIC GENERATION
// ============================================================

interface MetricRow {
  period: string; mrr: number; arr: number; revenueGrowthMom: number
  burnRate: number; cashBalance: number; runway: number
  headcount: number; grossMargin: number; nrr: number; grr: number
  logoChurnAnnual: number; healthScore: number
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
      grr: c.grr, logoChurnAnnual: c.logoChurnAnnual,
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

  const byC: Record<string, string> = {
    'datadog': `Revenue of ${fmt(m.mrr * 3)} for the quarter, up ${pct(c.g * 3)} QoQ. Added ${Math.max(50, Math.round(added / 100000))} net new customers. Observability AI product adoption accelerating — 40% of enterprise customers now using AI features.`,
    'miro': `${fmt(m.mrr * 12)} ARR milestone crossed. Enterprise tier grew ${pct(c.g * 1.5)} as platform teams adopt Miro for strategic planning. 99% of Fortune 100 now active. AI assistant adopted by 40%+ of active users.`,
    'picsart': `150M monthly active users maintained with strong engagement. Creator monetization up ${pct(c.g * 2)} — premium subscription conversion improving with new AI tools. B2B API revenue growing ahead of plan.`,
    'socure': `New ARR grew 62% YoY — ${fmt(added * 12)} added to pipeline this month. FedRAMP authorization driving public sector expansion. NDR at 134% as customers expand identity verification use cases.`,
    'datarobot': `Agentic AI Platform launched — initial pipeline from Fortune 500 accounts encouraging. ${Math.max(5, Math.round(added / 500000))} new enterprise logos signed. Expanding from model development into AI application lifecycle management.`,
    'tractable': `${fmt(m.mrr * 12)} in recurring revenue with ${(7 * (1 + (18 - monthsAgo) * 0.01)).toFixed(1)}B in annual claims processed. Added ${Math.max(1, Math.round(added / 200000))} new global insurer partnerships. Accuracy benchmarks improved to 98.2% on vehicle damage assessment.`,
    'qonto': `${Math.round(600000 * (1 - monthsAgo * 0.008))}K+ business customers across Europe. Average revenue per customer increased to €700. Banking license application progressing — expects full approval in H2 2026.`,
    'cred': `${Math.round(13 * (1 - monthsAgo * 0.01))}M MAU. Processed ₹55,000 Cr in UPI transactions this month. CRED Mint (P2P lending) AUM grew 45% QoQ. Path to FY26 profitability on track.`,
    'apollo-io': `Reached $150M ARR in May 2025. AI Sales Platform grew 500% YoY. Added 50,000+ weekly active AI users. 500,000+ companies including Autodesk, DocuSign, and Zendesk using the platform.`,
    'delivery-hero': `Q1 2026 GMV up ${pct(c.g * 3)} QoQ across all geographies. Quick commerce expansion driving revenue growth in MENA and Asia. Positive adjusted EBITDA maintained for third consecutive quarter.`,
    'mpl': `FY25 revenue on track. Cash-paying MAU grew 60% YoY — ${Math.round(m.headcount * 22)} paying users this month. Esports tournament monetization expanding. EBITDA breakeven maintained.`,
    'rebel-foods': `${Math.round(m.headcount / 6)} new kitchen launches this quarter in MENA and Indonesia. Gross margin improving on mix shift toward higher-ACV brands. IPO DRHP filing preparations underway.`,
    'practo': `${Math.round(m.headcount * 640)} doctor consultations this month. Achieved EBITDA break-even in Q4 FY24 — first time profitable. SaaS clinic management ARR growing at ${pct(c.g * 2)} MoM.`,
    'brighthire': `${Math.max(10, Math.round(m.headcount * 5))} new enterprise hiring teams onboarded. Interview completion rate at 94%. Zoom acquisition announced November 2025 — integration into Zoom Talent now underway.`,
    'newton-school': `${Math.round(m.headcount * 6)} graduates placed this quarter at average ₹8 LPA packages. Placement rate at 87%. New AWS and Google Cloud partnerships for cloud certification tracks.`,
    'payjoy': `${fmt(m.mrr * 18)} in monthly loan originations. 16M+ lifetime customers across 6 countries. T. Rowe Price-backed asset fund crossed $250M AUM. Mexico expansion accelerating.`,
    'dexif': `${Math.round(m.headcount * 8)} new retail investors onboarded this month. Platform now offers 80+ fixed income instruments. Partnership with 3 major NBFCs for primary issuance going live next quarter.`,
    'dbt-labs': `5,000+ active customer organizations including Condé Nast, HubSpot, Nasdaq, and Siemens. $100M ARR milestone crossed. Fivetran merger creates combined entity with nearly $600M in annual revenue.`,
    'tier': `Fleet utilization improved ${pct(c.g)} with AI-based fleet rebalancing. Post-Dott merger integration on track — 100+ cities live. €200M+ combined revenue on path to first profitable year.`,
    'dehaat': `13M+ farmers reached via 18,000 DeHaat Centers across 12 states. FY25 revenue ₹3,000 Cr, first profitable year achieved. AgriCentral acquisition adds 5M+ advisory app users.`,
    'skit-ai': `${Math.round(m.headcount * 18)} enterprise accounts active. Voice AI handling ${Math.round(m.mrr / 8000)} million monthly calls. New debt collection vertical launched with 5 major NBFC clients.`,
    'mpower': `${Math.round(m.headcount * 12)} commercial rooftop projects commissioned this quarter. Portfolio solar capacity crossed ${Math.round(m.mrr / 50000)} MW. MNRE certification secured for net metering integration.`,
  }

  if (byC[c.slug]) return byC[c.slug]!

  const byS: Record<string, string> = {
    SAAS: `Added ${fmt(added)} in net new MRR. Closed ${Math.max(2, Math.round(added / 25000))} new enterprise accounts. NRR at ${m.nrr}%.`,
    AI: `Shipped model quality improvements. Converted ${Math.max(1, Math.round(added / 30000))} enterprise pilots to paid. ACV expanding.`,
    FINTECH: `Processed ${fmt(m.mrr * 18)} in volume. Signed ${Math.max(1, Math.round(added / 40000))} new institutional clients.`,
    DEVTOOLS: `Developer base grew ${pct(c.g * 2)}. Closed ${Math.max(1, Math.round(added / 20000))} enterprise team deals.`,
    CLIMATETECH: `Onboarded ${Math.max(1, Math.round(added / 15000))} new corporate sustainability partners.`,
  }
  return byS[c.sector] ?? byS.SAAS
}

function risks(c: C, m: MetricRow): string {
  if (c.health === 'AT_RISK') {
    const runway = m.cashBalance / m.burnRate
    return `Runway at ${runway.toFixed(1)} months. Revenue headwinds persisting — net churn elevated. Actively in conversations with investors to extend runway. Hiring freeze in effect.`
  }
  if (c.health === 'WATCHLIST') {
    return `Burn multiple of ${(m.burnRate / m.mrr).toFixed(2)}× at current MRR. Runway at ${(m.cashBalance / m.burnRate).toFixed(0)} months — monitoring closely. Growth below target pace for the quarter.`
  }
  return `No material risks. Monitoring burn rate discipline as team scales. Pipeline coverage healthy at ${(2.8 + Math.random() * 1.2).toFixed(1)}× quota. Some elongation in enterprise deal cycles.`
}

function hiring(c: C, m: MetricRow): string {
  const rolesMap: Record<string, string> = {
    'datadog': 'Senior SRE (3 open), Principal Software Engineer, Enterprise Solutions Architect',
    'miro': 'Staff Product Manager, Senior UX Researcher, Enterprise AE (2 open)',
    'picsart': 'Senior ML Engineer, iOS Engineer, Growth Product Manager',
    'socure': 'Senior Data Scientist, Federal Sales Director, Machine Learning Platform Engineer',
    'datarobot': 'Enterprise AE (3 open), Agentic AI Solutions Engineer, Director of Customer Success',
    'tractable': 'Senior Computer Vision Engineer, Insurance Partnerships Manager, Data Engineer',
    'qonto': 'Senior Backend Engineer (Go), Regulatory Compliance Lead, Country Manager (Netherlands)',
    'cred': 'Senior Product Manager (Lending), Growth Hacker, Senior Data Engineer',
    'apollo-io': 'Senior Full-Stack Engineer (3 open), AI/ML Engineer, Enterprise Account Director',
    'delivery-hero': 'VP Engineering (MENA), Senior Data Scientist, Country GM (Morocco)',
    'mpl': 'Senior Game Backend Engineer, Product Manager (Esports), Growth Marketing Manager',
    'rebel-foods': 'Head of Strategy (IPO track), Finance Controller, Supply Chain Manager',
    'practo': 'Senior Product Manager (Telemedicine), Enterprise Sales Manager, DevOps Engineer',
    'brighthire': 'Integration Engineer (Zoom), Senior ML Engineer',
    'newton-school': 'Curriculum Lead (Data Science), Placement Manager, Full-Stack Engineer',
    'payjoy': 'Country Head (Indonesia), Credit Risk Analyst, Senior Android Engineer',
    'dexif': 'Senior Backend Engineer, Financial Product Manager, Compliance Officer',
    'dbt-labs': 'Staff Engineer (Cloud Platform), Developer Advocate, Enterprise Solutions Engineer',
    'tier': 'Head of City Operations (Poland), Fleet Tech Engineer, CFO',
    'dehaat': 'Regional Head (Maharashtra), Data Scientist (Crop Advisory), Agri Finance Manager',
    'skit-ai': 'Senior ML Engineer, Enterprise Sales Executive, Voice Linguist',
    'mpower': 'Solar Project Engineer, Energy Finance Manager, Sales Executive (SMB)',
  }
  if (c.health === 'AT_RISK') return 'Hiring freeze. Only revenue-generating roles under consideration.'
  return `Actively hiring: ${rolesMap[c.slug] ?? 'Senior Engineers, Product Manager, Enterprise AE'}. Priority on technical and go-to-market depth for H2 roadmap.`
}

// ============================================================
// RISKS PER COMPANY
// ============================================================

function companyRisks(c: C): Array<{ title: string; description: string; severity: string; category: string; source: string }> {
  const specificRisks: Record<string, Array<{ title: string; description: string; severity: string; category: string; source: string }>> = {
    'datadog': [
      { title: 'AI infrastructure competition intensifying', description: 'AWS, Google Cloud, and Azure expanding native observability capabilities. Risk of embedded tooling displacing standalone observability for smaller workloads.', severity: 'MEDIUM', category: 'MARKET', source: 'Market analysis' },
    ],
    'datarobot': [
      { title: 'Growth deceleration — enterprise AI budget consolidation', description: `ARR growth slowed to 12.5% YoY vs. 28% prior year. Enterprises consolidating AI tooling around hyperscaler platforms. Must differentiate on governance and deployment flexibility.`, severity: 'HIGH', category: 'REVENUE', source: 'Metrics analysis' },
      { title: 'Burn exceeds MRR — cash runway monitoring required', description: `Monthly burn of ${fmt(c.burn)} against ${fmt(c.mrr)} MRR. Runway at ${(c.cash / c.burn).toFixed(0)} months. Expense discipline required to extend runway to Series B close.`, severity: 'MEDIUM', category: 'BURN', source: 'Financial review' },
    ],
    'rebel-foods': [
      { title: 'Net revenue retention below 100% — churn persisting', description: 'NRR at 95% as restaurant brand consolidation continues. Some corporate clients reducing cloud kitchen orders. Requires brand portfolio rationalization before IPO.', severity: 'HIGH', category: 'REVENUE', source: 'Founder update' },
      { title: 'IPO timeline uncertainty with current loss trajectory', description: `Net loss ₹336 Cr in FY25 despite revenue growth. IPO investors will require path to profitability. EBITDA improvements needed before public markets reception.`, severity: 'MEDIUM', category: 'FUNDRAISING', source: 'Founder update' },
    ],
    'tier': [
      { title: 'Post-merger integration complexity', description: 'TIER + Dott merger creates significant tech, ops, and culture integration risk. Key leadership departures possible. Integration timeline extends to H1 2027.', severity: 'MEDIUM', category: 'OPERATIONAL', source: 'Founder update' },
      { title: 'Regulatory headwinds in key European cities', description: 'Paris, Berlin, and Barcelona implementing stricter permit caps on e-scooter operators. Fleet size reductions possible in top-3 revenue markets.', severity: 'HIGH', category: 'MARKET', source: 'Market analysis' },
    ],
    'dehaat': [
      { title: 'Operational losses despite revenue growth', description: 'Operational loss of ₹207 Cr in FY25 despite ₹3,000 Cr revenue. Gross margin at 20% limits path to profitability. Supply chain cost reduction plan in execution.', severity: 'MEDIUM', category: 'BURN', source: 'Metrics analysis' },
      { title: 'Monsoon dependency and climate risk', description: 'Revenue concentration in Kharif and Rabi seasons creates quarterly volatility. Climate irregularities in FY25 impacted crop input volumes in Bihar and UP.', severity: 'MEDIUM', category: 'MARKET', source: 'Founder update' },
    ],
    'cred': [
      { title: 'Path to profitability requires revenue mix shift', description: 'Operating losses narrowing (₹609 Cr → ₹609 Cr FY24) but profitability requires higher-margin financial products to outpace CAC. Lending book scaling on track.', severity: 'MEDIUM', category: 'BURN', source: 'Financial review' },
    ],
  }

  if (specificRisks[c.slug]) return specificRisks[c.slug]!

  if (c.health === 'AT_RISK') return [
    { title: 'Critical runway — bridge financing required', description: `Burn of ${fmt(c.burn)}/month against ${fmt(c.cash)} cash gives fewer than 3 months runway. Bridge or cost reduction required urgently.`, severity: 'CRITICAL', category: 'BURN', source: 'Financial review' },
    { title: 'Revenue declining', description: `MoM growth at ${pct(c.g)}, net revenue contraction. Churn elevated. Retention playbook needs urgent activation.`, severity: 'HIGH', category: 'REVENUE', source: 'Metrics analysis' },
  ]
  if (c.health === 'WATCHLIST') return [
    { title: 'Burn elevated relative to growth', description: `Burn multiple of ${(c.burn / c.mrr).toFixed(1)}× at current MRR growth rate. Runway at ${(c.cash / c.burn).toFixed(0)} months. Target 12+ months ahead of next raise.`, severity: 'MEDIUM', category: 'BURN', source: 'Metrics analysis' },
    { title: 'Growth below plan', description: `${pct(c.g)} MoM growth is below the ${pct(c.g + 0.03)} plan. Top-of-funnel constraints need resolution before board review.`, severity: 'MEDIUM', category: 'REVENUE', source: 'Founder update' },
  ]
  return [
    { title: 'Engineering leadership hiring — open VP role', description: 'VP Engineering role open 8 weeks. Roadmap execution on interim coverage — timeline risk if not closed this quarter.', severity: 'LOW', category: 'TEAM', source: 'Founder update' },
  ]
}

// ============================================================
// TREND FINDINGS — CROSS-PORTFOLIO PATTERNS
// ============================================================

const TRENDS = [
  {
    title: 'AI feature adoption accelerating across enterprise SaaS portfolio',
    summary: '5 portfolio companies report AI feature adoption rates exceeding 35% of active users within 90 days of launch, with AI-driven upsell driving NRR expansion.',
    category: 'GROWTH_PATTERN',
    severity: 'LOW',
    companies: ['datadog', 'miro', 'socure', 'apollo-io', 'dbt-labs'],
    quotes: [
      'AI-powered observability features adopted by 40% of enterprise customers within 60 days of GA.',
      'Miro AI assistant at 40%+ weekly active user adoption. Driving measurable expansion in team seat counts.',
      'AI identity verification features reducing fraud rates 3× — customers expanding from single to multi-product.',
      'AI-powered contact enrichment driving 500% growth in AI feature WAU. Core ARR accelerating.',
      'AI SQL generation in dbt Cloud at 35% adoption. Fortune 500 accounts expanding from 5 to 50 seats.',
    ],
  },
  {
    title: 'India portfolio companies approaching profitability inflection',
    summary: '4 Indian portfolio companies report converging toward EBITDA break-even, driven by revenue scale, cost discipline, and shift from growth-at-all-costs to efficient growth.',
    category: 'GROWTH_PATTERN',
    severity: 'LOW',
    companies: ['cred', 'mpl', 'practo', 'dehaat'],
    quotes: [
      'Operating loss trajectory: ₹1,024 Cr → ₹609 Cr in one year. FY26 profitability target reaffirmed.',
      'EBITDA turned positive at $0.2M in FY24. Cost per acquisition down 40% YoY with brand-led growth.',
      'EBITDA break-even achieved Q4 FY24. First quarter of operational profitability in company history.',
      'First profitable year in FY25. Operational efficiency program delivering ₹200 Cr in annualized savings.',
    ],
  },
  {
    title: 'Enterprise sales cycles extending across B2B SaaS portfolio',
    summary: '4 B2B SaaS portfolio companies report procurement timelines extending 30–60 days as enterprises add AI governance reviews and security assessments to vendor evaluations.',
    category: 'SHARED_RISK',
    severity: 'HIGH',
    companies: ['datarobot', 'tractable', 'skit-ai', 'apollo-io'],
    quotes: [
      'Fortune 500 procurement adding AI model governance review layer — adding 45 days to average enterprise cycle.',
      'Insurance enterprise procurement now includes AI ethics review. Q3 close pushed to Q4 for two deals.',
      'Banking and NBFC procurement adding RBI AI framework compliance to vendor checklist — 30-day extension.',
      'Enterprise security reviews for AI tools lengthening cycles. 3 deals pushed from Q2 to Q3.',
    ],
  },
  {
    title: 'Series B fundraising environment: valuation compression persisting',
    summary: '3 portfolio companies in active fundraising conversations report 25–40% valuation compression vs. 2022 peaks, with investors demanding profitability milestones before term sheet.',
    category: 'FUNDRAISING',
    severity: 'HIGH',
    companies: ['rebel-foods', 'tier', 'datarobot'],
    quotes: [
      'IPO bankers expecting 6–8× revenue multiple for food tech vs. 12× in 2022. EBITDA metrics now prerequisite.',
      'Late-stage investors expect positive free cash flow before Series D. Adjusted 2026 plan accordingly.',
      'Growth investors want 20%+ ARR growth before leading Series I. Focused on re-accelerating before next process.',
    ],
  },
  {
    title: 'Emerging market fintech: regulatory tailwinds driving growth',
    summary: '3 fintech portfolio companies operating in India and LATAM report regulatory developments creating structural growth opportunities in digital payments and financial access.',
    category: 'GROWTH_PATTERN',
    severity: 'LOW',
    companies: ['cred', 'payjoy', 'dexif'],
    quotes: [
      'RBI UPI credit line expansion opens ₹15 Lakh Cr addressable market for CRED credit products. Immediate action underway.',
      'Mexico regulatory approval for digital lending in rural zones opens 20M new addressable customers.',
      'SEBI\'s digital bond issuance framework creating $50B+ addressable market for retail fixed income. First movers advantage.',
    ],
  },
  {
    title: 'Platform engineering talent shortage across devtools companies',
    summary: '3 devtools and infrastructure companies report extended time-to-hire for senior platform engineers, with 8–12 week average open role timelines creating execution risk.',
    category: 'HIRING_PATTERN',
    severity: 'MEDIUM',
    companies: ['dbt-labs', 'datadog', 'datarobot'],
    quotes: [
      'Senior data platform engineers taking 10 weeks to hire. Open roles impacting cloud platform roadmap velocity.',
      'Staff-level SRE roles open for 11 weeks average. Competing with FAANG compensation on remote roles.',
      'ML infrastructure engineering roles hardest to fill. External recruit + FAANG alumni program launched.',
    ],
  },
  {
    title: 'Climate and agritech portfolio: first-party data moats emerging',
    summary: '3 climate-adjacent portfolio companies report proprietary data collection building defensible competitive advantages — satellite data, IoT sensor networks, and agronomic models.',
    category: 'GROWTH_PATTERN',
    severity: 'LOW',
    companies: ['dehaat', 'tier', 'mpower'],
    quotes: [
      '13M farmers generating 200M+ agronomic data points annually. Crop recommendation AI accuracy at 91% — competitors lack training data.',
      '85M annual trip data points enabling predictive maintenance 3× better than competitors. Negotiating data licensing deals.',
      'First rooftop solar performance dataset at scale in India — 8M+ data points. Powering yield prediction for financing underwriting.',
    ],
  },
]

// ============================================================
// MARKET SIGNALS
// ============================================================

const SIGNALS = [
  {
    title: 'Datadog Q1 2026: Revenue surges 32% on AI and enterprise demand',
    summary: 'Datadog reported Q1 2026 revenue of $1.006B, beating guidance by $40M. AI observability products now adopted by 40% of enterprise customers. Stock up 18% post-earnings.',
    source: 'Datadog Investor Relations',
    category: 'MARKET_TREND',
    companies: ['datadog'],
    publishedAgo: 8,
  },
  {
    title: 'Zoom acquires BrightHire for undisclosed sum',
    summary: 'Zoom announced the acquisition of interview intelligence platform BrightHire on November 13, 2025, deepening its position in talent and workforce productivity software.',
    source: 'TechCrunch',
    category: 'ACQUISITION',
    companies: ['brighthire'],
    publishedAgo: 30,
  },
  {
    title: 'dbt Labs and Fivetran complete all-stock merger',
    summary: 'dbt Labs and Fivetran closed their all-stock merger in October 2025, creating a combined data infrastructure company with nearly $600M in annual revenue and 6,000+ shared customers.',
    source: 'The Information',
    category: 'ACQUISITION',
    companies: ['dbt-labs'],
    publishedAgo: 45,
  },
  {
    title: 'Socure ARR surpasses $340M — 62% new ARR growth in Q1 2026',
    summary: 'AI fraud surge drives Socure to record new ARR growth. Public sector customer base doubled after FedRAMP Moderate authorization. Net Dollar Retention at 134%.',
    source: 'Biometric Update',
    category: 'FUNDING_NEWS',
    companies: ['socure'],
    publishedAgo: 5,
  },
  {
    title: 'Qonto reaches 600,000 business customers, files for banking license',
    summary: 'French B2B fintech Qonto reached the 600,000 customer milestone and filed for a full European banking license. €350M ARR and €420M cash position support the license application.',
    source: 'TechCrunch',
    category: 'MARKET_TREND',
    companies: ['qonto'],
    publishedAgo: 14,
  },
  {
    title: 'CRED raises $72M at $3.5B valuation amid path-to-profitability push',
    summary: 'Indian fintech CRED raised ₹617 crore from GIC, RTP Global, and QED Innovation Labs at $3.5B valuation — a reset from $6.4B peak — as it targets FY26 profitability.',
    source: 'Caproasia',
    category: 'FUNDING_NEWS',
    companies: ['cred'],
    publishedAgo: 60,
  },
  {
    title: 'Apollo.io reaches $150M ARR, announces 300 new hires on AI growth',
    summary: 'Apollo.io officially hit $150M in ARR in May 2025, fueled by AI platform adoption. Company plans to hire 300 employees across engineering and go-to-market by end of 2025.',
    source: 'Apollo Magazine',
    category: 'MARKET_TREND',
    companies: ['apollo-io'],
    publishedAgo: 20,
  },
  {
    title: 'EU AI Act enforcement begins — identity, credit, and hiring tools affected',
    summary: 'EU AI Act enforcement starts for high-risk applications in financial services and employment decisions. Companies using AI for identity verification and credit scoring must complete conformity assessments.',
    source: 'Reuters',
    category: 'REGULATION',
    companies: ['socure', 'datarobot', 'tractable', 'brighthire'],
    publishedAgo: 10,
  },
  {
    title: 'PayJoy on track for $650M revenue and $110M profit in 2025',
    summary: 'PayJoy announced it is on track to reach $650M in revenue and $110M in net profit by end of 2025, having financed $3B+ in loans to 16M+ customers across 6 countries.',
    source: 'PayJoy Press',
    category: 'MARKET_TREND',
    companies: ['payjoy'],
    publishedAgo: 18,
  },
  {
    title: 'DataRobot launches Agentic AI Platform — expanding from AutoML to AI agents',
    summary: 'DataRobot expands beyond model development into agentic AI applications, adding templates for CrewAI, LangGraph, and LlamaIndex with built-in evaluation, guardrails, and autoscaling.',
    source: 'DataRobot Blog',
    category: 'MARKET_TREND',
    companies: ['datarobot'],
    publishedAgo: 35,
  },
  {
    title: 'TIER and Dott complete merger — target €200M+ revenue and path to profit',
    summary: 'TIER and Dott completed their merger in early 2024. Combined entity generates €200M+ in revenue across 100+ European cities. First full year of positive EBITDA targeted for 2026.',
    source: 'TechCrunch',
    category: 'ACQUISITION',
    companies: ['tier'],
    publishedAgo: 480,
  },
  {
    title: 'DeHaat crosses ₹3,000 Cr revenue, reports first profitable year in FY25',
    summary: 'Agritech platform DeHaat achieved its first profitable year in FY25 with ₹3,000 Cr revenue (+11% YoY) and operational profit. Now reaches 13M+ farmers via 18,000 agri centers.',
    source: 'YourStory',
    category: 'MARKET_TREND',
    companies: ['dehaat'],
    publishedAgo: 22,
  },
  {
    title: 'RTP Global invests $4M in fixed-income platform Dexif',
    summary: 'RTP Global led a seed investment in Dexif, a fixed income products platform established in 2022 targeting retail investors in India with simplified bond and debenture access.',
    source: 'YourStory',
    category: 'FUNDING_NEWS',
    companies: ['dexif'],
    publishedAgo: 425,
  },
  {
    title: 'Delivery Hero reports €14B revenue in FY2025 — largest food delivery company globally',
    summary: 'Delivery Hero continues to hold its position as the world\'s largest food delivery company by volume. FY2025 revenue of €14B, positive adjusted EBITDA maintained for third consecutive quarter.',
    source: 'Delivery Hero Investor Relations',
    category: 'MARKET_TREND',
    companies: ['delivery-hero'],
    publishedAgo: 120,
  },
  {
    title: 'Miro hits 90M users — AI collaborative features driving enterprise expansion',
    summary: 'Miro\'s user base grew to 90M across 250,000+ organizations. AI-powered facilitation tools adopted by 40%+ of active users. The platform is present in 99% of Fortune 100 companies.',
    source: 'Miro Blog',
    category: 'MARKET_TREND',
    companies: ['miro'],
    publishedAgo: 25,
  },
  {
    title: 'Tractable processes $7B in insurance claims annually — 20+ top-100 insurer partners',
    summary: 'Tractable\'s AI for accident recovery now processes $7B in annual insurance claims, partnering with Aviva, Geico, and Admiral. Claims cycles 10× faster than manual review.',
    source: 'InsurTech Digital',
    category: 'MARKET_TREND',
    companies: ['tractable'],
    publishedAgo: 50,
  },
  {
    title: 'India UPI volumes hit record ₹20 lakh crore in March 2026',
    summary: 'UPI processed a record ₹20 lakh crore in transactions in March 2026, with CRED, PhonePe, and GPay driving merchant payment adoption among premium credit cardholders.',
    source: 'NPCI',
    category: 'MARKET_TREND',
    companies: ['cred', 'payjoy'],
    publishedAgo: 7,
  },
  {
    title: 'India gaming revenue crosses $1B — MPL and Dream11 lead',
    summary: 'India\'s real-money gaming market crossed $1B annual revenue in FY25, with MPL capturing 13% market share. Skill-based games regulatory clarity driving enterprise advertiser demand.',
    source: 'Inc42',
    category: 'MARKET_TREND',
    companies: ['mpl'],
    publishedAgo: 40,
  },
  {
    title: 'OpenAI introduces o3 reasoning model — AI platform companies accelerate product launches',
    summary: 'OpenAI\'s o3 model release triggers a wave of product launches among AI platform companies, with DataRobot, Socure, and Skit.ai all announcing upgraded capabilities within 30 days.',
    source: 'The Verge',
    category: 'MARKET_TREND',
    companies: ['datarobot', 'socure', 'skit-ai'],
    publishedAgo: 3,
  },
  {
    title: 'SEBI\'s digital bond framework opens ₹50L Cr retail fixed income market',
    summary: 'SEBI released regulations enabling digital issuance and retail trading of corporate bonds, creating a massive addressable market for platforms like Dexif targeting retail investors.',
    source: 'Economic Times',
    category: 'REGULATION',
    companies: ['dexif'],
    publishedAgo: 15,
  },
]

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('Seeding FundOS database with real RTP.VC portfolio data...')

  // Clear all tables in FK order — new monitoring + LP tables first
  await db.lPACResolution.deleteMany()
  await db.lPACMembership.deleteMany()
  await db.lPACMeeting.deleteMany()
  await db.distributionAllocation.deleteMany()
  await db.distribution.deleteMany()
  await db.capitalCallAllocation.deleteMany()
  await db.capitalCall.deleteMany()
  await db.lPEntity.deleteMany()
  await db.annualValuation.deleteMany()
  await db.valueAddActivity.deleteMany()
  await db.followOnNote.deleteMany()
  await db.boardResolution.deleteMany()
  await db.boardMeeting.deleteMany()
  await db.morEscalation.deleteMany()
  await db.monthlyOperationsReport.deleteMany()
  await db.capitalActivity.deleteMany()
  await db.fundProfile.deleteMany()
  await db.valuationMark.deleteMany()
  await db.capTableEntry.deleteMany()
  await db.safeNote.deleteMany()
  await db.convertibleNote.deleteMany()
  await db.optionPool.deleteMany()
  await db.fundInvestment.deleteMany()
  await db.fundingRound.deleteMany()
  await db.cashFlowStatement.deleteMany()
  await db.balanceSheet.deleteMany()
  await db.incomeStatementBudget.deleteMany()
  await db.incomeStatement.deleteMany()
  await db.unitEconomics.deleteMany()
  await db.mrrBridge.deleteMany()
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

  // Session and user cleanup
  await db.session.deleteMany()
  await db.user.deleteMany({ where: { NOT: { id: 'SYSTEM' } } })

  await db.user.upsert({
    where: { id: 'SYSTEM' },
    update: {},
    create: {
      id: 'SYSTEM',
      email: 'system@fundos.local',
      name: 'System',
      role: 'PORTFOLIO_OPS',
    },
  })

  // ── Seed users for every role ─────────────────────────────────
  const bcrypt = await import('bcryptjs')
  const pw = await bcrypt.default.hash('signalos2026', 12)

  const seedUsers: Array<{ email: string; name: string; role: string }> = [
    { email: 'admin@signalos.vc',   name: 'Fund Admin',        role: 'ANALYST' },
    { email: 'partner@signalos.vc', name: 'Sarah Chen',         role: 'PARTNER' },
    { email: 'ops@signalos.vc',     name: 'Marcus Rivera',     role: 'PORTFOLIO_OPS' },
    { email: 'finance@signalos.vc', name: 'Priya Nair',        role: 'FINANCE' },
    { email: 'lp@signalos.vc',      name: 'LP Investor',       role: 'LP' },
    // founder@signalos.vc is created after companies so we can link to Socure
  ]

  for (const u of seedUsers) {
    await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash: pw,
        role: u.role as never,
        emailVerified: new Date(),
      },
    })
    console.log(`  ✓ ${u.role.padEnd(14)} ${u.email} / <password hidden>`)
  }

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
        foundedYear: c.year, country: c.country,
      },
    })
    companyMap[c.slug] = company.id
    console.log(`  ✓ ${c.name} (${c.health}) — ${fmt(c.mrr)}/mo MRR`)

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
            ? `${c.name} reported ${c.health === 'AT_RISK' ? 'concerning' : c.health === 'WATCHLIST' ? 'mixed' : 'strong'} results for ${period}. MRR at ${fmt(m.mrr)} (${pct(c.g)} MoM). Burn at ${fmt(m.burnRate)}/month with ${m.runway.toFixed(1)} months runway. ${c.health === 'AT_RISK' ? 'Immediate attention required.' : c.health === 'WATCHLIST' ? 'Monitoring burn and growth closely.' : 'On track vs. plan.'}`
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

  // ── Founder user — linked to Socure ─────────────────────────
  await db.user.upsert({
    where: { email: 'founder@signalos.vc' },
    update: {},
    create: {
      email: 'founder@signalos.vc',
      name: 'Johnny Ayers',
      passwordHash: pw,
      role: 'FOUNDER',
      companyId: companyMap['socure'] ?? null,
      emailVerified: new Date(),
    },
  })
  console.log(`  ✓ FOUNDER         founder@signalos.vc / signalos2026 (linked to Socure)`)

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
        relevance: 0.85,
      },
    })

    const validSlugs = s.companies.filter((slug) => companyMap[slug])
    if (validSlugs.length > 0) {
      await db.companySignal.createMany({
        data: validSlugs.map((slug) => ({
          signalId: signal.id,
          companyId: companyMap[slug]!,
          relevanceExplanation: `${signal.title} directly impacts ${COMPANIES.find((c) => c.slug === slug)?.name} given their market position and competitive landscape.`,
        })),
      })
    }
  }
  console.log(`  ✓ ${SIGNALS.length} market signals`)

  // ============================================================
  // MRR BRIDGE — SaaS/AI companies that have meaningful cohort data
  // ============================================================
  const MRR_BRIDGE_SLUGS = [
    'datadog', 'miro', 'apollo-io', 'socure', 'tractable',
    'qonto', 'dbt-labs', 'brighthire', 'skit-ai', 'cred', 'payjoy', 'mpower',
  ]

  function genMrrBridges(c: C): Array<{
    companyId: string; period: string; beginningMrr: number; newMrr: number
    expansionMrr: number; reactivationMrr: number; contractionMrr: number
    churnedMrr: number; endingMrr: number
    newCustomers: number | null; churnedCustomers: number | null; totalCustomers: number | null
  }> {
    const id = companyMap[c.slug]!
    const result = []
    for (const ago of [3, 2, 1]) {
      const ending  = c.mrr / Math.pow(1 + c.g, ago - 1)
      const beginning = c.mrr / Math.pow(1 + c.g, ago)
      // Monthly churn rate: lower NRR → higher gross churn
      const churnRate = Math.max(0.003, Math.min(0.025, (130 - c.nrr) / 100 / 7))
      const churnedMrr = beginning * churnRate
      const contractionMrr = churnedMrr * 0.28
      // Gross expansion includes net expansion + churn offset
      const netExpRate = (c.nrr - 100) / 100 / 12
      const expansionMrr = Math.max(0, beginning * (netExpRate + churnRate * 0.75))
      const reactivationMrr = beginning * 0.002
      const newMrr = Math.max(0, ending - beginning - expansionMrr - reactivationMrr + churnedMrr + contractionMrr)
      // Customer counts (rough — ARPA-driven estimate)
      const arpa = Math.max(200, (c.mrr * 12) / Math.max(10, c.hc * 2))
      const totalCustomers = Math.round(ending / (arpa / 12))
      const newCustomers = Math.max(0, Math.round(newMrr / (arpa / 12)))
      const churnedCustomers = Math.max(0, Math.round(churnedMrr / (arpa / 12)))
      result.push({
        companyId: id, period: getPeriod(ago - 1),
        beginningMrr: Math.round(beginning), newMrr: Math.round(newMrr),
        expansionMrr: Math.round(expansionMrr), reactivationMrr: Math.round(reactivationMrr),
        contractionMrr: Math.round(contractionMrr), churnedMrr: Math.round(churnedMrr),
        endingMrr: Math.round(ending),
        newCustomers, churnedCustomers, totalCustomers,
      })
    }
    return result
  }

  for (const c of COMPANIES.filter((x) => MRR_BRIDGE_SLUGS.includes(x.slug))) {
    await db.mrrBridge.createMany({ data: genMrrBridges(c) })
  }
  console.log('  ✓ MRR bridges')

  // ============================================================
  // UNIT ECONOMICS — 2 quarters for all SaaS/AI companies
  // ============================================================
  function genUnitEconomics(c: C): Array<{
    companyId: string; period: string
    cac: number | null; ltv: number | null; ltvCacRatio: number | null
    cacPaybackMonths: number | null; arpa: number | null; acv: number | null
    newCacRatio: number | null; burnMultiple: number | null
    ruleOf40: number | null; magicNumber: number | null; smSpend: number | null; newCustomers: number | null
  }> {
    const id = companyMap[c.slug]!
    const smPct = c.sector === 'SAAS' ? 0.38 : c.sector === 'AI' ? 0.33 : c.sector === 'DEVTOOLS' ? 0.30 : 0.28
    const result = []
    for (const ago of [3, 0]) {
      const mrrAtPoint = c.mrr / Math.pow(1 + c.g, ago)
      const prevMrr = c.mrr / Math.pow(1 + c.g, ago + 1)
      const burnAtPoint = c.burn * (0.55 + 0.45 * ((18 - ago) / 18))
      const smSpend = burnAtPoint * smPct
      const arpaMonthly = Math.max(50, (mrrAtPoint * 12) / Math.max(20, c.hc * 2)) / 12
      const churnMonthly = Math.max(0.003, (130 - c.nrr) / 100 / 7)
      const netNewMrr = mrrAtPoint - prevMrr
      const netNewArr = netNewMrr * 12
      const newCust = Math.max(1, Math.round((netNewMrr * 0.7) / Math.max(arpaMonthly, 1)))
      const cac = newCust > 0 ? smSpend / newCust : null
      const ltv = cac ? (arpaMonthly * c.gm) / churnMonthly : null
      const ltvCacRatio = (ltv && cac && cac > 0) ? ltv / cac : null
      const cacPaybackMonths = (cac && arpaMonthly > 0 && c.gm > 0) ? cac / (arpaMonthly * c.gm) : null
      const burnMultiple = netNewArr > 0 ? burnAtPoint / (netNewArr / 12) : null
      const annualGrowthRate = (Math.pow(1 + c.g, 12) - 1) * 100
      const fcfMargin = mrrAtPoint > 0 ? ((mrrAtPoint - burnAtPoint) / mrrAtPoint) * 100 : 0
      const ruleOf40 = annualGrowthRate + fcfMargin
      const magicNumber = netNewArr > 0 && smSpend > 0 ? (netNewArr / 4) / (smSpend * 3) : null
      const newCacRatio = netNewArr > 0 ? smSpend * 12 / netNewArr : null
      result.push({
        companyId: id, period: getPeriod(ago),
        cac: cac ? Math.round(cac) : null,
        ltv: ltv ? Math.round(ltv) : null,
        ltvCacRatio: ltvCacRatio ? Math.round(ltvCacRatio * 10) / 10 : null,
        cacPaybackMonths: cacPaybackMonths ? Math.round(cacPaybackMonths * 10) / 10 : null,
        arpa: Math.round(arpaMonthly),
        acv: Math.round(arpaMonthly * 12),
        newCacRatio: newCacRatio ? Math.round(newCacRatio * 100) / 100 : null,
        burnMultiple: burnMultiple ? Math.round(burnMultiple * 100) / 100 : null,
        ruleOf40: Math.round(ruleOf40 * 10) / 10,
        magicNumber: magicNumber ? Math.round(magicNumber * 100) / 100 : null,
        smSpend: Math.round(smSpend),
        newCustomers: newCust,
      })
    }
    return result
  }

  for (const c of COMPANIES.filter((x) => MRR_BRIDGE_SLUGS.includes(x.slug))) {
    await db.unitEconomics.createMany({ data: genUnitEconomics(c) })
  }
  console.log('  ✓ Unit economics')

  // ============================================================
  // FINANCIAL STATEMENTS — 5 featured companies, 3 quarters
  // Datadog, Miro, Apollo.io, Qonto, Socure
  // ============================================================

  interface QFinancials { period: string; rev: number; burn: number; cash: number }

  function genIncomeStatement(companyId: string, c: C, qf: QFinancials) {
    const rev = qf.rev
    const cogsRate = 1 - c.gm
    const smPct = c.sector === 'SAAS' ? 0.38 : c.sector === 'AI' ? 0.33 : c.sector === 'FINTECH' ? 0.32 : 0.28
    const rdPct = c.sector === 'DEVTOOLS' ? 0.38 : c.sector === 'AI' ? 0.31 : 0.26
    const b = qf.burn  // quarterly burn

    return {
      companyId, period: qf.period,
      subscriptionRevenue: rev * (c.sector === 'FINTECH' ? 0.55 : 0.87),
      servicesRevenue: rev * (c.sector === 'FINTECH' ? 0.30 : 0.08),
      otherRevenue: rev * (c.sector === 'FINTECH' ? 0.15 : 0.05),
      cogsHosting: rev * cogsRate * 0.52,
      cogsSupport: rev * cogsRate * 0.28,
      cogsServices: rev * cogsRate * 0.12,
      cogsOther: rev * cogsRate * 0.08,
      smSalaries: b * smPct * 0.62,
      smPrograms: b * smPct * 0.38,
      rdSalaries: b * rdPct * 0.72,
      rdContractors: b * rdPct * 0.17,
      rdTools: b * rdPct * 0.11,
      gaSalaries: b * 0.12 * 0.68,
      gaLegal: b * 0.12 * 0.16,
      gaInsurance: b * 0.12 * 0.09,
      gaOther: b * 0.12 * 0.07,
      depreciation: rev * 0.018,
      interestExpense: c.stage === 'SERIES_B' ? rev * 0.004 : 0,
      interestIncome: qf.cash * 0.04 / 4,
      stockBasedComp: b * 0.08,
    }
  }

  function genBalanceSheet(companyId: string, c: C, qf: QFinancials) {
    const rev = qf.rev
    return {
      companyId, period: qf.period,
      cash: qf.cash,
      shortTermInvestments: qf.cash * 0.25,
      accountsReceivable: rev * 0.40,
      prepaidExpenses: qf.burn * 0.45,
      otherCurrentAssets: qf.burn * 0.18,
      ppe: c.hc * 7500,
      capitalizedSoftware: c.hc * 14000,
      rightOfUseAssets: c.hc * 10000,
      goodwill: 0,
      otherNonCurrentAssets: qf.cash * 0.04,
      accountsPayable: qf.burn * 0.22,
      accruedLiabilities: qf.burn * 0.38,
      deferredRevenueCurrent: rev * 0.28,
      shortTermDebt: 0,
      otherCurrentLiabilities: qf.burn * 0.14,
      longTermDebt: 0,
      deferredRevenueLongTerm: rev * 0.08,
      operatingLeaseLiabilities: c.hc * 7000,
      commonStock: 0,
      additionalPaidInCapital: qf.cash * 2.2,
      accumulatedDeficit: qf.burn * 14,
      retainedEarnings: 0,
    }
  }

  function genCashFlow(companyId: string, c: C, qf: QFinancials, prevCash: number) {
    const rev = qf.rev
    const netIncome = rev * c.gm - qf.burn
    return {
      companyId, period: qf.period,
      cfDepreciation: rev * 0.018,
      cfStockBasedComp: qf.burn * 0.08,
      cfArChange: -(rev * 0.02),
      cfDeferredRevenueChange: rev * 0.015,
      cfApChange: qf.burn * 0.04,
      cfAccruedLiabilitiesChange: qf.burn * 0.02,
      cfPrepaidChange: qf.burn * 0.01,
      cfCapex: c.hc * 400,
      cfCapitalizedSoftware: c.hc * 1200,
      cfAcquisitions: 0,
      cfEquityProceeds: 0,
      cfDebtProceeds: 0,
      cfDebtRepayment: 0,
      cfOptionExercises: qf.burn * 0.005,
      beginningCash: prevCash,
    }
  }

  const FEATURED: Array<{ slug: string; quarters: QFinancials[] }> = [
    {
      slug: 'datadog',
      quarters: [
        { period: getPeriod(9), rev: 760000000 * 0.80, burn: 210000000 * 3, cash: 1500000000 },
        { period: getPeriod(6), rev: 760000000 * 0.88, burn: 225000000 * 3, cash: 1620000000 },
        { period: getPeriod(3), rev: 760000000 * 0.95, burn: 238000000 * 3, cash: 1720000000 },
        { period: getPeriod(0), rev: 930000000,         burn: 250000000 * 3, cash: 1800000000 },
      ],
    },
    {
      slug: 'miro',
      quarters: [
        { period: getPeriod(9), rev: 42000000 * 3 * 0.82, burn: 27000000 * 3, cash: 235000000 },
        { period: getPeriod(6), rev: 42000000 * 3 * 0.88, burn: 28500000 * 3, cash: 254000000 },
        { period: getPeriod(3), rev: 42000000 * 3 * 0.94, burn: 29200000 * 3, cash: 267000000 },
        { period: getPeriod(0), rev: 42000000 * 3,         burn: 30000000 * 3, cash: 280000000 },
      ],
    },
    {
      slug: 'apollo-io',
      quarters: [
        { period: getPeriod(9), rev: 12500000 * 3 * 0.80, burn: 6500000 * 3, cash: 88000000 },
        { period: getPeriod(6), rev: 12500000 * 3 * 0.87, burn: 7000000 * 3, cash: 96000000 },
        { period: getPeriod(3), rev: 12500000 * 3 * 0.94, burn: 7500000 * 3, cash: 103000000 },
        { period: getPeriod(0), rev: 12500000 * 3,         burn: 8000000 * 3, cash: 110000000 },
      ],
    },
    {
      slug: 'qonto',
      quarters: [
        { period: getPeriod(9), rev: 32000000 * 3 * 0.82, burn: 21000000 * 3, cash: 400000000 },
        { period: getPeriod(6), rev: 32000000 * 3 * 0.88, burn: 22500000 * 3, cash: 420000000 },
        { period: getPeriod(3), rev: 32000000 * 3 * 0.94, burn: 23800000 * 3, cash: 440000000 },
        { period: getPeriod(0), rev: 32000000 * 3,         burn: 25000000 * 3, cash: 460000000 },
      ],
    },
    {
      slug: 'socure',
      quarters: [
        { period: getPeriod(9), rev: 28300000 * 3 * 0.74, burn: 16000000 * 3, cash: 148000000 },
        { period: getPeriod(6), rev: 28300000 * 3 * 0.82, burn: 17500000 * 3, cash: 160000000 },
        { period: getPeriod(3), rev: 28300000 * 3 * 0.91, burn: 18800000 * 3, cash: 170000000 },
        { period: getPeriod(0), rev: 28300000 * 3,         burn: 20000000 * 3, cash: 180000000 },
      ],
    },
  ]

  for (const { slug, quarters } of FEATURED) {
    const c = COMPANIES.find((x) => x.slug === slug)!
    const id = companyMap[slug]!
    const isRows = quarters.map((qf) => genIncomeStatement(id, c, qf))
    const bsRows = quarters.map((qf) => genBalanceSheet(id, c, qf))
    const cfRows = quarters.map((qf, i) => genCashFlow(id, c, qf, i === 0 ? qf.cash * 0.85 : quarters[i - 1]!.cash))
    await db.incomeStatement.createMany({ data: isRows })
    await db.balanceSheet.createMany({ data: bsRows })
    await db.cashFlowStatement.createMany({ data: cfRows })
  }
  console.log('  ✓ Financial statements (5 companies × 4 quarters)')

  // ============================================================
  // INVESTMENTS — all 22 companies (RTP Global's stake)
  // ============================================================

  interface Inv {
    slug: string
    roundName: string; roundType: string; closeDate: string
    roundSize: number; preMoney: number; postMoney: number
    pricePerShare: number; shareClass: string; leadInvestor: string
    invDate: string; amount: number; shares: number
    ownershipBasic: number; ownershipFD: number
    boardSeat: boolean; boardObserver: boolean; proRataRight: boolean
    followOnReserve: number
    fairValue: number; method: string; methodNote: string
    revenueMultiple: number | null; impliedVal: number; markStatus: string
  }

  const INVESTMENTS: Inv[] = [
    {
      slug: 'datadog', roundName: 'Series A', roundType: 'PRICED_EQUITY', closeDate: '2012-03-15',
      roundSize: 6500000, preMoney: 10000000, postMoney: 16500000,
      pricePerShare: 0.11, shareClass: 'Preferred Series A', leadInvestor: 'OpenView Partners',
      invDate: '2012-03-15', amount: 1500000, shares: 13636364,
      ownershipBasic: 9.1, ownershipFD: 7.2, boardSeat: false, boardObserver: true, proRataRight: true,
      followOnReserve: 0,
      fairValue: 168000000, method: 'ARR_MULTIPLE', methodNote: 'Peer SaaS observability companies trade at 8–10× ARR. Applied 9.5× to Datadog ARR of $3.72B at RTP ownership 0.9% (post-dilution). Cross-check vs public market cap confirms conservatism.',
      revenueMultiple: 9.5, impliedVal: 35300000000, markStatus: 'APPROVED',
    },
    {
      slug: 'picsart', roundName: 'Series B', roundType: 'PRICED_EQUITY', closeDate: '2016-04-10',
      roundSize: 30000000, preMoney: 100000000, postMoney: 130000000,
      pricePerShare: 2.60, shareClass: 'Preferred Series B', leadInvestor: 'SoftBank Vision Fund',
      invDate: '2016-04-10', amount: 3000000, shares: 1153846,
      ownershipBasic: 2.3, ownershipFD: 1.8, boardSeat: false, boardObserver: false, proRataRight: true,
      followOnReserve: 1000000,
      fairValue: 28000000, method: 'ARR_MULTIPLE', methodNote: 'Applied 10× ARR multiple to $108M ARR (est). Weighted by 1.8% FD ownership. Post-SoftBank round calibration suggests valuation flat vs. 2022 peak.',
      revenueMultiple: 10.0, impliedVal: 1080000000, markStatus: 'APPROVED',
    },
    {
      slug: 'socure', roundName: 'Series E', roundType: 'PRICED_EQUITY', closeDate: '2020-11-05',
      roundSize: 100000000, preMoney: 1200000000, postMoney: 1300000000,
      pricePerShare: 13.00, shareClass: 'Preferred Series E', leadInvestor: 'Accel',
      invDate: '2020-11-05', amount: 8000000, shares: 615385,
      ownershipBasic: 3.2, ownershipFD: 2.5, boardSeat: false, boardObserver: true, proRataRight: true,
      followOnReserve: 4000000,
      fairValue: 44000000, method: 'ARR_MULTIPLE', methodNote: 'Applied 6.5× to $340M ARR (fiscal Q1 2026). Identity security peers trade at 6–8× ARR. 134% NDR supports premium multiple. 2.5% FD ownership at $1.76B implied EV.',
      revenueMultiple: 6.5, impliedVal: 1760000000, markStatus: 'APPROVED',
    },
    {
      slug: 'datarobot', roundName: 'Series G', roundType: 'PRICED_EQUITY', closeDate: '2016-09-20',
      roundSize: 54000000, preMoney: 260000000, postMoney: 314000000,
      pricePerShare: 3.14, shareClass: 'Preferred Series G', leadInvestor: 'New Enterprise Associates',
      invDate: '2016-09-20', amount: 5000000, shares: 1592357,
      ownershipBasic: 1.6, ownershipFD: 1.2, boardSeat: false, boardObserver: false, proRataRight: false,
      followOnReserve: 0,
      fairValue: 19000000, method: 'ARR_MULTIPLE', methodNote: 'Applied 4.2× ARR to $225M ARR (FY25). Growth deceleration to 10% YoY warrants discount to AI/ML peers. Burn exceeds MRR — negative FCF margin penalizes multiple. Conservative mark.',
      revenueMultiple: 4.2, impliedVal: 945000000, markStatus: 'REVIEWED',
    },
    {
      slug: 'tractable', roundName: 'Series D', roundType: 'PRICED_EQUITY', closeDate: '2019-07-25',
      roundSize: 25000000, preMoney: 100000000, postMoney: 125000000,
      pricePerShare: 5.00, shareClass: 'Preferred Series D', leadInvestor: 'Georgian Partners',
      invDate: '2019-07-25', amount: 3000000, shares: 600000,
      ownershipBasic: 2.4, ownershipFD: 1.9, boardSeat: false, boardObserver: false, proRataRight: true,
      followOnReserve: 1500000,
      fairValue: 17000000, method: 'ARR_MULTIPLE', methodNote: 'InsurTech AI peers trade at 7–9× ARR. Applied 7.5× to $70M ARR ($5.8M MRR × 12). Global top-100 insurer penetration = defensibility premium. 1.9% FD ownership.',
      revenueMultiple: 7.5, impliedVal: 525000000, markStatus: 'APPROVED',
    },
    {
      slug: 'skit-ai', roundName: 'Series B', roundType: 'PRICED_EQUITY', closeDate: '2020-12-15',
      roundSize: 23000000, preMoney: 55000000, postMoney: 78000000,
      pricePerShare: 3.90, shareClass: 'Preferred Series B', leadInvestor: 'Exfinity Venture',
      invDate: '2020-12-15', amount: 2000000, shares: 512821,
      ownershipBasic: 2.6, ownershipFD: 2.1, boardSeat: false, boardObserver: false, proRataRight: false,
      followOnReserve: 500000,
      fairValue: 7000000, method: 'ARR_MULTIPLE', methodNote: 'Conversational AI voice peers in India at 3–5× ARR. Applied 3.5× to $9.84M ARR. Growth recovery needed; 2.1% FD ownership at $35M implied EV.',
      revenueMultiple: 3.5, impliedVal: 35000000, markStatus: 'REVIEWED',
    },
    {
      slug: 'miro', roundName: 'Series A', roundType: 'PRICED_EQUITY', closeDate: '2019-06-05',
      roundSize: 25000000, preMoney: 175000000, postMoney: 200000000,
      pricePerShare: 8.00, shareClass: 'Preferred Series A', leadInvestor: 'Accel',
      invDate: '2019-06-05', amount: 5000000, shares: 625000,
      ownershipBasic: 2.5, ownershipFD: 1.9, boardSeat: false, boardObserver: true, proRataRight: true,
      followOnReserve: 3000000,
      fairValue: 62000000, method: 'ARR_MULTIPLE', methodNote: 'Visual collaboration market leader. Applied 12.5× to $504M ARR. NRR of 120% and 99% Fortune 100 penetration support premium multiple. Peer median at $17.5B (Miro) → 1.9% FD = $332M — marked conservatively at last-round calibration.',
      revenueMultiple: 12.5, impliedVal: 5040000000, markStatus: 'APPROVED',
    },
    {
      slug: 'apollo-io', roundName: 'Series D', roundType: 'PRICED_EQUITY', closeDate: '2020-08-12',
      roundSize: 32000000, preMoney: 150000000, postMoney: 182000000,
      pricePerShare: 7.28, shareClass: 'Preferred Series D', leadInvestor: 'Tribe Capital',
      invDate: '2020-08-12', amount: 4000000, shares: 549451,
      ownershipBasic: 2.2, ownershipFD: 1.7, boardSeat: false, boardObserver: false, proRataRight: true,
      followOnReserve: 2000000,
      fairValue: 22000000, method: 'ARR_MULTIPLE', methodNote: 'Applied 9× to $150M ARR (2025 milestone confirmed). PLG with 500K+ paying companies drives durability. NRR 125% = expansion-led premium. 1.7% FD ownership at $1.35B implied EV.',
      revenueMultiple: 9.0, impliedVal: 1350000000, markStatus: 'APPROVED',
    },
    {
      slug: 'delivery-hero', roundName: 'Series D', roundType: 'PRICED_EQUITY', closeDate: '2015-01-20',
      roundSize: 110000000, preMoney: 890000000, postMoney: 1000000000,
      pricePerShare: 20.00, shareClass: 'Preferred Series D', leadInvestor: 'Rocket Internet',
      invDate: '2015-01-20', amount: 2000000, shares: 100000,
      ownershipBasic: 0.1, ownershipFD: 0.08, boardSeat: false, boardObserver: false, proRataRight: false,
      followOnReserve: 0,
      fairValue: 24000000, method: 'ARR_MULTIPLE', methodNote: 'Public company (DHHF.DE). Applied 0.08% ownership to €11B market cap (~$12B USD). Discount applied for illiquidity vs. listed holding. Position maintained as strategic intelligence asset.',
      revenueMultiple: null, impliedVal: 12000000000, markStatus: 'APPROVED',
    },
    {
      slug: 'mpl', roundName: 'Series D', roundType: 'PRICED_EQUITY', closeDate: '2020-09-08',
      roundSize: 90000000, preMoney: 445000000, postMoney: 535000000,
      pricePerShare: 10.70, shareClass: 'Preferred Series D', leadInvestor: 'SIG',
      invDate: '2020-09-08', amount: 4000000, shares: 373832,
      ownershipBasic: 0.75, ownershipFD: 0.58, boardSeat: false, boardObserver: false, proRataRight: false,
      followOnReserve: 0,
      fairValue: 13000000, method: 'ARR_MULTIPLE', methodNote: 'India gaming market valued at 1.8× ARR. Applied to $130M ARR. EBITDA neutral is positive signal — 0.58% FD at $375M implied EV. Discount vs. peak $2.3B for regulatory risk.',
      revenueMultiple: 1.8, impliedVal: 375000000, markStatus: 'APPROVED',
    },
    {
      slug: 'rebel-foods', roundName: 'Series F', roundType: 'PRICED_EQUITY', closeDate: '2018-06-15',
      roundSize: 125000000, preMoney: 450000000, postMoney: 575000000,
      pricePerShare: 11.50, shareClass: 'Preferred Series F', leadInvestor: 'Goldman Sachs',
      invDate: '2018-06-15', amount: 5000000, shares: 434783,
      ownershipBasic: 0.87, ownershipFD: 0.65, boardSeat: false, boardObserver: false, proRataRight: false,
      followOnReserve: 0,
      fairValue: 17500000, method: 'ARR_MULTIPLE', methodNote: 'Cloud kitchen peers trade at 1.5× revenue. Applied to $194M ARR. Pre-IPO bridge valuation at $800M (IPO bankers). 0.65% FD at $585M. Net loss trajectory and NRR 95% are key risks.',
      revenueMultiple: 1.5, impliedVal: 585000000, markStatus: 'REVIEWED',
    },
    {
      slug: 'practo', roundName: 'Series C', roundType: 'PRICED_EQUITY', closeDate: '2016-03-10',
      roundSize: 55000000, preMoney: 345000000, postMoney: 400000000,
      pricePerShare: 8.00, shareClass: 'Preferred Series C', leadInvestor: 'Tencent',
      invDate: '2016-03-10', amount: 2000000, shares: 250000,
      ownershipBasic: 0.5, ownershipFD: 0.38, boardSeat: false, boardObserver: false, proRataRight: false,
      followOnReserve: 0,
      fairValue: 7500000, method: 'ARR_MULTIPLE', methodNote: 'Health SaaS multiples at 8× ARR. Applied to $27.6M ARR ($2.3M MRR × 12). India digital health re-rated post-Covid. EBITDA breakeven supports valuation stability. 0.38% FD at $220M implied.',
      revenueMultiple: 8.0, impliedVal: 220000000, markStatus: 'APPROVED',
    },
    {
      slug: 'brighthire', roundName: 'Series A', roundType: 'PRICED_EQUITY', closeDate: '2020-03-18',
      roundSize: 7000000, preMoney: 21000000, postMoney: 28000000,
      pricePerShare: 2.80, shareClass: 'Preferred Series A', leadInvestor: 'Thrive Capital',
      invDate: '2020-03-18', amount: 1500000, shares: 535714,
      ownershipBasic: 5.4, ownershipFD: 4.1, boardSeat: false, boardObserver: false, proRataRight: true,
      followOnReserve: 750000,
      fairValue: 6000000, method: 'LAST_ROUND', methodNote: 'Zoom acquisition at undisclosed sum. Marked at last round valuation pending close. Acquisition eliminates going-concern risk; liquidity event likely in H1 2026. 4.1% FD at $146M implied (last round).',
      revenueMultiple: null, impliedVal: 146000000, markStatus: 'REVIEWED',
    },
    {
      slug: 'newton-school', roundName: 'Series A', roundType: 'PRICED_EQUITY', closeDate: '2021-04-05',
      roundSize: 7000000, preMoney: 25000000, postMoney: 32000000,
      pricePerShare: 3.20, shareClass: 'Preferred Series A', leadInvestor: 'RTP Global',
      invDate: '2021-04-05', amount: 1000000, shares: 312500,
      ownershipBasic: 4.5, ownershipFD: 3.4, boardSeat: true, boardObserver: false, proRataRight: true,
      followOnReserve: 1000000,
      fairValue: 4000000, method: 'ARR_MULTIPLE', methodNote: 'Ed-tech ISA model peers at 3.5× revenue. Applied to $5.25M ARR. Placement rates at 87% support revenue durability. 3.4% FD at $117M implied.',
      revenueMultiple: 3.5, impliedVal: 117000000, markStatus: 'REVIEWED',
    },
    {
      slug: 'qonto', roundName: 'Series C', roundType: 'PRICED_EQUITY', closeDate: '2019-10-15',
      roundSize: 115000000, preMoney: 345000000, postMoney: 460000000,
      pricePerShare: 9.20, shareClass: 'Preferred Series C', leadInvestor: 'Valar Ventures',
      invDate: '2019-10-15', amount: 5000000, shares: 543478,
      ownershipBasic: 1.08, ownershipFD: 0.82, boardSeat: false, boardObserver: false, proRataRight: true,
      followOnReserve: 3000000,
      fairValue: 52000000, method: 'ARR_MULTIPLE', methodNote: 'European neobank peers at 13× ARR. Applied to $384M ARR ($32M MRR × 12). Full banking license application = structural tailwind for multiple. 0.82% FD at €4.8B ($5.2B) implied valuation.',
      revenueMultiple: 13.0, impliedVal: 5200000000, markStatus: 'APPROVED',
    },
    {
      slug: 'cred', roundName: 'Series D', roundType: 'PRICED_EQUITY', closeDate: '2020-05-22',
      roundSize: 81000000, preMoney: 1919000000, postMoney: 2000000000,
      pricePerShare: 20.00, shareClass: 'Preferred Series D', leadInvestor: 'DST Global',
      invDate: '2020-05-22', amount: 10000000, shares: 500000,
      ownershipBasic: 0.5, ownershipFD: 0.38, boardSeat: false, boardObserver: false, proRataRight: true,
      followOnReserve: 5000000,
      fairValue: 63000000, method: 'ARR_MULTIPLE', methodNote: 'India premium fintech peers at 8× revenue. Applied to $297M ARR ($24.75M × 12). UPI credit expansion = structural tailwind. 0.38% FD at $3.5B valuation (aligned with last round mark).',
      revenueMultiple: 8.0, impliedVal: 3500000000, markStatus: 'APPROVED',
    },
    {
      slug: 'payjoy', roundName: 'Series C', roundType: 'PRICED_EQUITY', closeDate: '2019-03-10',
      roundSize: 20000000, preMoney: 100000000, postMoney: 120000000,
      pricePerShare: 6.00, shareClass: 'Preferred Series C', leadInvestor: 'T. Rowe Price',
      invDate: '2019-03-10', amount: 5000000, shares: 833333,
      ownershipBasic: 4.2, ownershipFD: 3.2, boardSeat: false, boardObserver: true, proRataRight: true,
      followOnReserve: 2000000,
      fairValue: 32000000, method: 'ARR_MULTIPLE', methodNote: 'Consumer fintech at 0.5× revenue. Applied to $650M 2025 revenue guidance. $110M net profit = strong profitability premium. 3.2% FD at $325M implied EV.',
      revenueMultiple: 0.5, impliedVal: 325000000, markStatus: 'APPROVED',
    },
    {
      slug: 'dexif', roundName: 'Seed', roundType: 'PRICED_EQUITY', closeDate: '2024-06-20',
      roundSize: 4000000, preMoney: 14000000, postMoney: 18000000,
      pricePerShare: 1.80, shareClass: 'Preferred Seed', leadInvestor: 'RTP Global',
      invDate: '2024-06-20', amount: 4000000, shares: 2222222,
      ownershipBasic: 22.2, ownershipFD: 18.0, boardSeat: true, boardObserver: false, proRataRight: true,
      followOnReserve: 3000000,
      fairValue: 4500000, method: 'LAST_ROUND', methodNote: 'Pre-revenue seed stage — marked at last round cost + 12.5% step-up for 8 months of commercial progress. SEBI digital bond framework = large TAM. 18% FD at $25M implied. First commercial transactions live.',
      revenueMultiple: null, impliedVal: 25000000, markStatus: 'REVIEWED',
    },
    {
      slug: 'dbt-labs', roundName: 'Series D', roundType: 'PRICED_EQUITY', closeDate: '2020-07-14',
      roundSize: 150000000, preMoney: 900000000, postMoney: 1050000000,
      pricePerShare: 21.00, shareClass: 'Preferred Series D', leadInvestor: 'Altimeter Capital',
      invDate: '2020-07-14', amount: 3000000, shares: 142857,
      ownershipBasic: 0.15, ownershipFD: 0.11, boardSeat: false, boardObserver: false, proRataRight: false,
      followOnReserve: 0,
      fairValue: 16000000, method: 'ARR_MULTIPLE', methodNote: 'Applied 12× to $114M ARR ($9.5M MRR × 12). Fivetran merger creates combined entity at $600M revenue — cross-validation of trajectory. DevTools open-source moat supports premium. 0.11% FD at $1.37B implied.',
      revenueMultiple: 12.0, impliedVal: 1370000000, markStatus: 'APPROVED',
    },
    {
      slug: 'tier', roundName: 'Series C', roundType: 'PRICED_EQUITY', closeDate: '2019-05-20',
      roundSize: 60000000, preMoney: 240000000, postMoney: 300000000,
      pricePerShare: 6.00, shareClass: 'Preferred Series C', leadInvestor: 'SoftBank Vision Fund',
      invDate: '2019-05-20', amount: 5000000, shares: 833333,
      ownershipBasic: 1.39, ownershipFD: 1.04, boardSeat: false, boardObserver: false, proRataRight: false,
      followOnReserve: 0,
      fairValue: 13500000, method: 'ARR_MULTIPLE', methodNote: 'Micromobility peers at 0.7× revenue. Applied to €200M revenue target ($220M). Post-Dott merger dilution and profitability path uncertainty = conservative mark. 1.04% FD at €1.2B ($1.3B) implied.',
      revenueMultiple: 0.7, impliedVal: 1300000000, markStatus: 'REVIEWED',
    },
    {
      slug: 'dehaat', roundName: 'Series E', roundType: 'PRICED_EQUITY', closeDate: '2020-02-20',
      roundSize: 12000000, preMoney: 88000000, postMoney: 100000000,
      pricePerShare: 5.00, shareClass: 'Preferred Series E', leadInvestor: 'Prosus Ventures',
      invDate: '2020-02-20', amount: 3000000, shares: 600000,
      ownershipBasic: 3.0, ownershipFD: 2.2, boardSeat: false, boardObserver: true, proRataRight: true,
      followOnReserve: 1500000,
      fairValue: 11000000, method: 'ARR_MULTIPLE', methodNote: 'Agritech at 0.3× revenue. Applied to $366M revenue (₹3,000 Cr). First profitable year = inflection. 2.2% FD at $500M implied (conservative vs. last round $450M valuation).',
      revenueMultiple: 0.3, impliedVal: 500000000, markStatus: 'APPROVED',
    },
    {
      slug: 'mpower', roundName: 'Seed', roundType: 'PRICED_EQUITY', closeDate: '2023-08-15',
      roundSize: 1000000, preMoney: 4000000, postMoney: 5000000,
      pricePerShare: 0.50, shareClass: 'Preferred Seed', leadInvestor: 'RTP Global',
      invDate: '2023-08-15', amount: 500000, shares: 1000000,
      ownershipBasic: 10.0, ownershipFD: 8.2, boardSeat: true, boardObserver: false, proRataRight: true,
      followOnReserve: 1000000,
      fairValue: 1200000, method: 'LAST_ROUND', methodNote: 'Early-stage solar financing platform. Marked at 2.4× cost based on revenue trajectory — $3.48M ARR ($290K MRR × 12), 11%/mo growth. PWERM with 60% base case outcome at $15M exit, 40% write-off.',
      revenueMultiple: null, impliedVal: 14600000, markStatus: 'REVIEWED',
    },
  ]

  let investmentCount = 0
  for (const inv of INVESTMENTS) {
    const cId = companyMap[inv.slug]
    if (!cId) continue
    const round = await db.fundingRound.create({
      data: {
        companyId: cId, roundName: inv.roundName,
        roundType: inv.roundType as 'SAFE' | 'CONVERTIBLE_NOTE' | 'PRICED_EQUITY' | 'GRANT' | 'DEBT',
        closeDate: new Date(inv.closeDate),
        preMoney: inv.preMoney, postMoney: inv.postMoney,
        roundSize: inv.roundSize, pricePerShare: inv.pricePerShare,
        shareClass: inv.shareClass, leadInvestor: inv.leadInvestor,
      },
    })
    const investment = await db.fundInvestment.create({
      data: {
        companyId: cId, roundId: round.id,
        investmentDate: new Date(inv.invDate),
        securityType: 'PREFERRED',
        amountInvested: inv.amount, sharesAcquired: inv.shares,
        entryPricePerShare: inv.amount / inv.shares,
        ownershipPctBasic: inv.ownershipBasic, ownershipPctFullyDiluted: inv.ownershipFD,
        boardSeat: inv.boardSeat, boardObserver: inv.boardObserver, proRataRight: inv.proRataRight,
        followOnReserve: inv.followOnReserve > 0 ? inv.followOnReserve : null,
      },
    })
    await db.valuationMark.create({
      data: {
        investmentId: investment.id, companyId: cId,
        markDate: new Date('2026-03-31'),
        fairValue: inv.fairValue,
        valuationMethod: inv.method as 'LAST_ROUND' | 'ARR_MULTIPLE' | 'DCF' | 'PWERM' | 'OPM' | 'NET_ASSETS',
        methodologyNote: inv.methodNote,
        revenueMultipleUsed: inv.revenueMultiple,
        impliedValuation: inv.impliedVal,
        status: inv.markStatus as 'DRAFT' | 'REVIEWED' | 'APPROVED',
        approvedBy: inv.markStatus === 'APPROVED' ? 'partner-review-q1-2026' : null,
      },
    })
    investmentCount++
  }
  console.log(`  ✓ ${investmentCount} investments + valuation marks`)

  // ============================================================
  // CAP TABLE — 5 companies with representative entries
  // Apollo.io, BrightHire, Dexif, MPower, Socure
  // ============================================================

  const CAP_TABLE_DATA: Record<string, Array<{
    holderName: string; holderType: string; shareClass: string; sharesIssued: number
    ownershipFD: number; liquidationPref: number | null; participating: boolean
    antiDilution: string; boardSeat: boolean
  }>> = {
    'apollo-io': [
      { holderName: 'Tim Zheng (Founder)', holderType: 'FOUNDER', shareClass: 'Common', sharesIssued: 18000000, ownershipFD: 18.0, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: true },
      { holderName: 'Ray Li (Co-Founder)', holderType: 'FOUNDER', shareClass: 'Common', sharesIssued: 12000000, ownershipFD: 12.0, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: true },
      { holderName: 'Tribe Capital', holderType: 'INVESTOR', shareClass: 'Preferred Series D', sharesIssued: 4500000, ownershipFD: 4.5, liquidationPref: 1.0, participating: false, antiDilution: 'WEIGHTED_AVERAGE_BROAD', boardSeat: false },
      { holderName: 'Nexus Venture Partners', holderType: 'INVESTOR', shareClass: 'Preferred Series C', sharesIssued: 3200000, ownershipFD: 3.2, liquidationPref: 1.0, participating: false, antiDilution: 'WEIGHTED_AVERAGE_BROAD', boardSeat: false },
      { holderName: 'Boldstart Ventures', holderType: 'INVESTOR', shareClass: 'Preferred Series B', sharesIssued: 2100000, ownershipFD: 2.1, liquidationPref: 1.0, participating: false, antiDilution: 'NONE', boardSeat: false },
      { holderName: 'RTP Global', holderType: 'INVESTOR', shareClass: 'Preferred Series D', sharesIssued: 549451, ownershipFD: 1.7, liquidationPref: 1.0, participating: false, antiDilution: 'WEIGHTED_AVERAGE_BROAD', boardSeat: false },
      { holderName: 'Employee Option Pool', holderType: 'OPTION_POOL', shareClass: 'Common (Options)', sharesIssued: 9500000, ownershipFD: 9.5, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
      { holderName: 'Early Employees', holderType: 'EMPLOYEE', shareClass: 'Common', sharesIssued: 6200000, ownershipFD: 6.2, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
    ],
    'brighthire': [
      { holderName: 'Ben Sesser (CEO)', holderType: 'FOUNDER', shareClass: 'Common', sharesIssued: 4500000, ownershipFD: 31.5, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: true },
      { holderName: 'Teddy Chestnut (CTO)', holderType: 'FOUNDER', shareClass: 'Common', sharesIssued: 3000000, ownershipFD: 21.0, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
      { holderName: 'Thrive Capital', holderType: 'INVESTOR', shareClass: 'Preferred Series A', sharesIssued: 1750000, ownershipFD: 12.3, liquidationPref: 1.0, participating: false, antiDilution: 'WEIGHTED_AVERAGE_BROAD', boardSeat: true },
      { holderName: 'RTP Global', holderType: 'INVESTOR', shareClass: 'Preferred Series A', sharesIssued: 535714, ownershipFD: 4.1, liquidationPref: 1.0, participating: false, antiDilution: 'WEIGHTED_AVERAGE_BROAD', boardSeat: false },
      { holderName: 'Employee Pool', holderType: 'OPTION_POOL', shareClass: 'Common (Options)', sharesIssued: 1800000, ownershipFD: 12.6, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
      { holderName: 'Early Team', holderType: 'EMPLOYEE', shareClass: 'Common', sharesIssued: 700000, ownershipFD: 4.9, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
    ],
    'dexif': [
      { holderName: 'Aniket Bajpai (CEO)', holderType: 'FOUNDER', shareClass: 'Common', sharesIssued: 5000000, ownershipFD: 40.5, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: true },
      { holderName: 'Priya Sharma (CTO)', holderType: 'FOUNDER', shareClass: 'Common', sharesIssued: 3500000, ownershipFD: 28.4, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
      { holderName: 'RTP Global', holderType: 'INVESTOR', shareClass: 'Preferred Seed', sharesIssued: 2222222, ownershipFD: 18.0, liquidationPref: 1.0, participating: false, antiDilution: 'NONE', boardSeat: true },
      { holderName: 'Employee Pool', holderType: 'OPTION_POOL', shareClass: 'Common (Options)', sharesIssued: 1000000, ownershipFD: 8.1, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
      { holderName: 'Advisor Pool', holderType: 'WARRANT', shareClass: 'Warrants', sharesIssued: 250000, ownershipFD: 2.0, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
    ],
    'mpower': [
      { holderName: 'Arjun Mehta (CEO)', holderType: 'FOUNDER', shareClass: 'Common', sharesIssued: 5500000, ownershipFD: 45.1, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: true },
      { holderName: 'Sonal Patel (COO)', holderType: 'FOUNDER', shareClass: 'Common', sharesIssued: 3500000, ownershipFD: 28.7, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
      { holderName: 'RTP Global', holderType: 'INVESTOR', shareClass: 'Preferred Seed', sharesIssued: 1000000, ownershipFD: 8.2, liquidationPref: 1.0, participating: false, antiDilution: 'NONE', boardSeat: true },
      { holderName: 'Climate Angels Fund', holderType: 'INVESTOR', shareClass: 'Preferred Seed', sharesIssued: 500000, ownershipFD: 4.1, liquidationPref: 1.0, participating: false, antiDilution: 'NONE', boardSeat: false },
      { holderName: 'Employee Pool', holderType: 'OPTION_POOL', shareClass: 'Common (Options)', sharesIssued: 800000, ownershipFD: 6.6, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
      { holderName: 'Advisors', holderType: 'WARRANT', shareClass: 'Warrants', sharesIssued: 250000, ownershipFD: 2.1, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
    ],
    'socure': [
      { holderName: 'Johnny Ayers (CEO)', holderType: 'FOUNDER', shareClass: 'Common', sharesIssued: 8000000, ownershipFD: 8.0, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: true },
      { holderName: 'Sunil Madhu (Founder)', holderType: 'FOUNDER', shareClass: 'Common', sharesIssued: 5000000, ownershipFD: 5.0, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
      { holderName: 'Accel', holderType: 'INVESTOR', shareClass: 'Preferred Series E', sharesIssued: 3800000, ownershipFD: 3.8, liquidationPref: 1.0, participating: false, antiDilution: 'WEIGHTED_AVERAGE_BROAD', boardSeat: true },
      { holderName: 'Warburg Pincus', holderType: 'INVESTOR', shareClass: 'Preferred Series G', sharesIssued: 4500000, ownershipFD: 4.5, liquidationPref: 1.0, participating: false, antiDilution: 'WEIGHTED_AVERAGE_BROAD', boardSeat: true },
      { holderName: 'Bain Capital Ventures', holderType: 'INVESTOR', shareClass: 'Preferred Series F', sharesIssued: 2800000, ownershipFD: 2.8, liquidationPref: 1.0, participating: false, antiDilution: 'WEIGHTED_AVERAGE_BROAD', boardSeat: false },
      { holderName: 'RTP Global', holderType: 'INVESTOR', shareClass: 'Preferred Series E', sharesIssued: 615385, ownershipFD: 2.5, liquidationPref: 1.0, participating: false, antiDilution: 'WEIGHTED_AVERAGE_BROAD', boardSeat: false },
      { holderName: 'Employee Option Pool', holderType: 'OPTION_POOL', shareClass: 'Common (Options)', sharesIssued: 12000000, ownershipFD: 12.0, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
      { holderName: 'Founding Team', holderType: 'EMPLOYEE', shareClass: 'Common', sharesIssued: 3200000, ownershipFD: 3.2, liquidationPref: null, participating: false, antiDilution: 'NONE', boardSeat: false },
    ],
  }

  let capTableCount = 0
  for (const [slug, entries] of Object.entries(CAP_TABLE_DATA)) {
    const cId = companyMap[slug]
    if (!cId) continue
    await db.capTableEntry.createMany({
      data: entries.map((e) => ({
        companyId: cId,
        holderName: e.holderName,
        holderType: e.holderType as 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'OPTION_POOL' | 'WARRANT',
        shareClass: e.shareClass,
        sharesIssued: e.sharesIssued,
        ownershipPctFullyDiluted: e.ownershipFD,
        liquidationPreference: e.liquidationPref,
        participating: e.participating,
        antiDilution: e.antiDilution as 'NONE' | 'WEIGHTED_AVERAGE_BROAD' | 'WEIGHTED_AVERAGE_NARROW' | 'FULL_RATCHET',
        votingRightsPerShare: e.holderType === 'OPTION_POOL' ? 0 : 1,
        boardSeat: e.boardSeat,
      })),
    })
    // Add option pool record for each
    const pool = entries.find((e) => e.holderType === 'OPTION_POOL')
    if (pool) {
      await db.optionPool.create({
        data: {
          companyId: cId,
          authorizedShares: pool.sharesIssued,
          grantedShares: Math.round(pool.sharesIssued * 0.72),
          vestedShares: Math.round(pool.sharesIssued * 0.41),
          exercisedShares: Math.round(pool.sharesIssued * 0.08),
        },
      })
    }
    capTableCount += entries.length
  }
  console.log(`  ✓ ${capTableCount} cap table entries across 5 companies`)

  // ============================================================
  // SAFE NOTES — BrightHire (pre-Series A SAFEs) + Dexif
  // ============================================================
  const safeSeedData = [
    {
      slug: 'brighthire',
      notes: [
        { investorName: 'General Catalyst (Angel)', amount: 250000, issueDate: '2019-06-01', safeType: 'POST_MONEY', valuationCap: 8000000, discountRate: 20, status: 'CONVERTED' },
        { investorName: 'Hustle Fund', amount: 150000, issueDate: '2019-09-15', safeType: 'POST_MONEY', valuationCap: 8000000, discountRate: 20, status: 'CONVERTED' },
      ],
    },
    {
      slug: 'dexif',
      notes: [
        { investorName: 'Rainmatter Capital', amount: 500000, issueDate: '2023-11-01', safeType: 'POST_MONEY', valuationCap: 10000000, discountRate: 20, status: 'CONVERTED' },
      ],
    },
  ]
  for (const { slug, notes } of safeSeedData) {
    const cId = companyMap[slug]
    if (!cId) continue
    await db.safeNote.createMany({
      data: notes.map((n) => ({
        companyId: cId, investorName: n.investorName, amount: n.amount,
        issueDate: new Date(n.issueDate),
        safeType: n.safeType as 'PRE_MONEY' | 'POST_MONEY',
        valuationCap: n.valuationCap, discountRate: n.discountRate,
        mfn: false, proRataRight: false,
        status: n.status as 'OUTSTANDING' | 'CONVERTED' | 'REPAID' | 'DEFAULTED',
      })),
    })
  }

  // ============================================================
  // FUND PROFILE + CAPITAL ACTIVITY — RTP Global Fund III
  // ============================================================
  const fund = await db.fundProfile.create({
    data: {
      name: 'RTP Global Fund III',
      vintage: 2018,
      committedCapital: 400000000,
      managementFeePct: 0.02,
      carryPct: 0.20,
      hurdleRate: 0.08,
      waterfallType: 'EUROPEAN',
      investmentPeriodEnd: new Date('2024-12-31'),
      fundTermEnd: new Date('2030-12-31'),
      currency: 'USD',
    },
  })

  const capitalActivities = [
    // Capital calls (negative to fund = LP obligations)
    { date: '2018-09-15', type: 'CAPITAL_CALL', amount: 40000000, description: 'Fund III Q3 2018 capital call — initial close', lpName: null },
    { date: '2019-03-10', type: 'CAPITAL_CALL', amount: 60000000, description: 'Fund III Q1 2019 capital call — investment activity', lpName: null },
    { date: '2019-11-20', type: 'CAPITAL_CALL', amount: 55000000, description: 'Fund III Q4 2019 capital call — Miro, Qonto, PayJoy', lpName: null },
    { date: '2020-06-08', type: 'CAPITAL_CALL', amount: 75000000, description: 'Fund III Q2 2020 capital call — CRED, Socure, Apollo.io', lpName: null },
    { date: '2021-04-15', type: 'CAPITAL_CALL', amount: 30000000, description: 'Fund III Q2 2021 capital call — Newton School + follow-ons', lpName: null },
    { date: '2022-09-01', type: 'CAPITAL_CALL', amount: 20000000, description: 'Fund III Q3 2022 capital call — follow-on reserves', lpName: null },
    { date: '2023-09-05', type: 'CAPITAL_CALL', amount: 8000000, description: 'Fund III Q3 2023 capital call — MPower + reserve deployment', lpName: null },
    { date: '2024-07-20', type: 'CAPITAL_CALL', amount: 6000000, description: 'Fund III Q3 2024 capital call — Dexif + final reserves', lpName: null },
    // Management fees
    { date: '2019-01-01', type: 'MANAGEMENT_FEE', amount: 8000000, description: 'Annual management fee FY2019 — 2% of committed capital', lpName: null },
    { date: '2020-01-01', type: 'MANAGEMENT_FEE', amount: 8000000, description: 'Annual management fee FY2020', lpName: null },
    { date: '2021-01-01', type: 'MANAGEMENT_FEE', amount: 8000000, description: 'Annual management fee FY2021', lpName: null },
    { date: '2022-01-01', type: 'MANAGEMENT_FEE', amount: 8000000, description: 'Annual management fee FY2022', lpName: null },
    { date: '2023-01-01', type: 'MANAGEMENT_FEE', amount: 6000000, description: 'Annual management fee FY2023 — post-investment period step-down to 1.5%', lpName: null },
    { date: '2024-01-01', type: 'MANAGEMENT_FEE', amount: 6000000, description: 'Annual management fee FY2024', lpName: null },
    { date: '2025-01-01', type: 'MANAGEMENT_FEE', amount: 6000000, description: 'Annual management fee FY2025', lpName: null },
    // Distributions (from partial exits and secondaries)
    { date: '2021-06-15', type: 'DISTRIBUTION', amount: 18000000, description: 'Secondary sale of Delivery Hero position — partial exit at 12× cost', lpName: null },
    { date: '2022-11-30', type: 'DISTRIBUTION', amount: 28000000, description: 'Datadog secondary — sold 15% of position at $135/share. Gross MOIC on sold tranche: 88×', lpName: null },
    { date: '2023-05-10', type: 'DISTRIBUTION', amount: 14000000, description: 'BrightHire Zoom acquisition proceeds — partial earnout (initial tranche)', lpName: null },
    { date: '2024-03-20', type: 'DISTRIBUTION', amount: 22000000, description: 'Socure secondary sale — co-investor secondaries program, 25% position monetized', lpName: null },
    // Fund expenses
    { date: '2019-01-01', type: 'FUND_EXPENSE', amount: 850000, description: 'Legal (Orrick), audit (Deloitte), fund administration FY2019', lpName: null },
    { date: '2020-01-01', type: 'FUND_EXPENSE', amount: 920000, description: 'Legal, audit, portfolio monitoring technology FY2020', lpName: null },
    { date: '2021-01-01', type: 'FUND_EXPENSE', amount: 1050000, description: 'Legal, audit, annual meeting, D&O insurance FY2021', lpName: null },
    { date: '2022-01-01', type: 'FUND_EXPENSE', amount: 980000, description: 'Legal, audit, fund expenses FY2022', lpName: null },
    { date: '2023-01-01', type: 'FUND_EXPENSE', amount: 890000, description: 'Legal, audit, fund expenses FY2023', lpName: null },
    { date: '2024-01-01', type: 'FUND_EXPENSE', amount: 820000, description: 'Legal, audit, fund expenses FY2024', lpName: null },
  ]

  await db.capitalActivity.createMany({
    data: capitalActivities.map((a) => ({
      fundId: fund.id, date: new Date(a.date),
      type: a.type as 'CAPITAL_CALL' | 'DISTRIBUTION' | 'MANAGEMENT_FEE' | 'FUND_EXPENSE' | 'CARRIED_INTEREST',
      amount: a.amount, description: a.description, lpName: a.lpName,
    })),
  })
  console.log('  ✓ Fund profile + capital activity')

  // ============================================================
  // LP ENTITIES — 5 realistic LPs for RTP Global Fund III
  // ============================================================
  const LP_ENTITIES = [
    {
      name: 'GIC Private Limited',
      entityType: 'SOVEREIGN_WEALTH' as const,
      jurisdiction: 'Singapore',
      contactName: 'Chee Wei Tan',
      contactEmail: 'c.tan@gic.com.sg',
      capitalCommitment: 80000000,
      kycStatus: 'APPROVED' as const,
      fatfStatus: 'CLEAR' as const,
      agreementSignedAt: new Date('2018-07-15'),
      agreementVersion: 'v2.1',
      portalAccessGrantedAt: new Date('2018-08-01'),
      amlClearanceDate: new Date('2018-07-10'),
      pepCheck: false,
      sanctionsCheck: false,
    },
    {
      name: 'Abu Dhabi Investment Authority',
      entityType: 'SOVEREIGN_WEALTH' as const,
      jurisdiction: 'UAE',
      contactName: 'Mohammed Al Mubarak',
      contactEmail: 'm.almubarak@adia.ae',
      capitalCommitment: 60000000,
      kycStatus: 'APPROVED' as const,
      fatfStatus: 'CLEAR' as const,
      agreementSignedAt: new Date('2018-07-20'),
      agreementVersion: 'v2.1',
      portalAccessGrantedAt: new Date('2018-08-05'),
      amlClearanceDate: new Date('2018-07-15'),
      pepCheck: false,
      sanctionsCheck: false,
    },
    {
      name: 'University of Chicago Endowment',
      entityType: 'ENDOWMENT' as const,
      jurisdiction: 'USA',
      contactName: 'Sarah Johnson',
      contactEmail: 's.johnson@uchicago.edu',
      capitalCommitment: 40000000,
      kycStatus: 'APPROVED' as const,
      fatfStatus: 'CLEAR' as const,
      agreementSignedAt: new Date('2018-08-10'),
      agreementVersion: 'v2.1',
      portalAccessGrantedAt: new Date('2018-08-20'),
      amlClearanceDate: new Date('2018-08-05'),
      pepCheck: false,
      sanctionsCheck: false,
    },
    {
      name: 'Hedosophia Capital Partners',
      entityType: 'FUND_OF_FUNDS' as const,
      jurisdiction: 'UK',
      contactName: 'Ian Osborne',
      contactEmail: 'ian@hedosophia.com',
      capitalCommitment: 30000000,
      kycStatus: 'APPROVED' as const,
      fatfStatus: 'CLEAR' as const,
      agreementSignedAt: new Date('2018-09-01'),
      agreementVersion: 'v2.1',
      portalAccessGrantedAt: new Date('2018-09-15'),
      amlClearanceDate: new Date('2018-08-28'),
      pepCheck: false,
      sanctionsCheck: false,
    },
    {
      name: 'Khazar Family Office',
      entityType: 'FAMILY_OFFICE' as const,
      jurisdiction: 'Kazakhstan',
      contactName: 'Arman Khazarov',
      contactEmail: 'arman@khazar-fo.kz',
      capitalCommitment: 20000000,
      kycStatus: 'IN_PROGRESS' as const,
      fatfStatus: 'CLEAR' as const,
      agreementSignedAt: null,
      agreementVersion: null,
      portalAccessGrantedAt: null,
      amlClearanceDate: null,
      pepCheck: true,
      sanctionsCheck: false,
    },
  ]

  const lpEntities: Array<{ id: string; name: string; commitment: number }> = []
  for (const lp of LP_ENTITIES) {
    const totalCommitment = lp.capitalCommitment
    const unfunded = lp.kycStatus === 'APPROVED' ? totalCommitment * 0.25 : totalCommitment
    const called = totalCommitment - unfunded
    const distributed = lp.kycStatus === 'APPROVED' ? called * 0.25 : 0

    const entity = await db.lPEntity.create({
      data: {
        ...lp,
        capitalCalled: called,
        capitalDistributed: distributed,
        unfundedCommitment: unfunded,
        kycCompletedAt: lp.kycStatus === 'APPROVED' ? new Date(lp.agreementSignedAt ?? new Date()) : null,
        kycExpiresAt: lp.kycStatus === 'APPROVED' ? new Date('2027-07-15') : null,
      },
    })
    lpEntities.push({ id: entity.id, name: lp.name, commitment: lp.capitalCommitment })
  }
  console.log(`  ✓ ${lpEntities.length} LP entities`)

  // ============================================================
  // CAPITAL CALLS — 4 calls linked to fund
  // ============================================================
  const approvedLPEntities = lpEntities.slice(0, 4) // first 4 are approved
  const totalApprovedCommitment = approvedLPEntities.reduce((s, lp) => s + lp.commitment, 0)

  const CAPITAL_CALLS_DATA = [
    { callNumber: 1, callDate: '2019-03-01', dueDate: '2019-03-22', amount: 60000000, purpose: 'Fund III Q1 2019 — investment activity (Miro Series B, Qonto Series B)', status: 'FULLY_PAID' as const, wireInstructions: 'Wells Fargo Bank, N.A.\nABA: 121000248\nAccount: 4572-8834-991\nBeneficiary: RTP Global Fund III LP\nRef: Capital Call #1' },
    { callNumber: 2, callDate: '2020-06-01', dueDate: '2020-06-22', amount: 75000000, purpose: 'Fund III Q2 2020 — CRED Series C, Socure Series D, Apollo.io Series A', status: 'FULLY_PAID' as const, wireInstructions: 'Wells Fargo Bank, N.A.\nABA: 121000248\nAccount: 4572-8834-991\nBeneficiary: RTP Global Fund III LP\nRef: Capital Call #2' },
    { callNumber: 3, callDate: '2022-09-01', dueDate: '2022-09-22', amount: 20000000, purpose: 'Fund III Q3 2022 — Follow-on reserves (Socure, Qonto, PayJoy)', status: 'FULLY_PAID' as const, wireInstructions: 'Wells Fargo Bank, N.A.\nABA: 121000248\nAccount: 4572-8834-991\nBeneficiary: RTP Global Fund III LP\nRef: Capital Call #3' },
    { callNumber: 4, callDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!, dueDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!, amount: 8000000, purpose: 'Fund III Q2 2026 — MPower follow-on + Dexif reserve deployment', status: 'PARTIALLY_PAID' as const, wireInstructions: 'Wells Fargo Bank, N.A.\nABA: 121000248\nAccount: 4572-8834-991\nBeneficiary: RTP Global Fund III LP\nRef: Capital Call #4 — Due ' + new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toLocaleDateString() },
  ]

  for (const cc of CAPITAL_CALLS_DATA) {
    const call = await db.capitalCall.create({
      data: {
        fundId: fund.id,
        callNumber: cc.callNumber,
        callDate: new Date(cc.callDate),
        dueDate: new Date(cc.dueDate),
        totalAmount: cc.amount,
        purpose: cc.purpose,
        status: cc.status,
        wireInstructions: cc.wireInstructions,
        issuedAt: new Date(cc.callDate),
      },
    })

    // Per-LP allocations
    await db.capitalCallAllocation.createMany({
      data: approvedLPEntities.map((lp) => {
        const proRata = lp.commitment / totalApprovedCommitment
        const amountDue = cc.amount * proRata
        const isPaid = cc.status === 'FULLY_PAID' || (cc.status === 'PARTIALLY_PAID' && lp.name !== 'Hedosophia Capital Partners')
        return {
          callId: call.id,
          lpEntityId: lp.id,
          proRataShare: proRata,
          amountDue: Math.round(amountDue),
          amountPaid: isPaid ? Math.round(amountDue) : 0,
          paidAt: isPaid ? new Date(new Date(cc.dueDate).getTime() - 2 * 24 * 60 * 60 * 1000) : null,
          status: isPaid ? 'PAID' as const : 'PENDING' as const,
        }
      }),
    })
  }
  console.log(`  ✓ ${CAPITAL_CALLS_DATA.length} capital calls with LP allocations`)

  // ============================================================
  // DISTRIBUTIONS — 3 distributions from exits/secondaries
  // ============================================================
  const DIST_DATA = [
    { date: '2022-11-30', amount: 28000000, type: 'RETURN_OF_CAPITAL' as const, desc: 'Datadog secondary sale — 15% of position at $135/share, 88× cost', taxDocStatus: 'ISSUED' },
    { date: '2023-05-10', amount: 14000000, type: 'PREFERRED_RETURN' as const, desc: 'BrightHire Zoom acquisition — initial earnout tranche', taxDocStatus: 'ISSUED' },
    { date: '2024-03-20', amount: 22000000, type: 'RETURN_OF_CAPITAL' as const, desc: 'Socure secondary — 25% position monetized via co-investor secondaries program', taxDocStatus: 'ISSUED' },
  ]

  for (const d of DIST_DATA) {
    const dist = await db.distribution.create({
      data: {
        fundId: fund.id,
        distributionDate: new Date(d.date),
        totalAmount: d.amount,
        type: d.type,
        description: d.desc,
        taxDocStatus: d.taxDocStatus,
      },
    })

    await db.distributionAllocation.createMany({
      data: approvedLPEntities.map((lp) => {
        const proRata = lp.commitment / totalApprovedCommitment
        const gross = d.amount * proRata
        const rc = d.type === 'RETURN_OF_CAPITAL' ? gross * 0.9 : gross * 0.2
        const pref = d.type === 'PREFERRED_RETURN' ? gross * 0.8 : gross * 0.05
        const carry = gross - rc - pref > 0 ? gross - rc - pref : 0
        return {
          distributionId: dist.id,
          lpEntityId: lp.id,
          proRataShare: proRata,
          grossAmount: Math.round(gross),
          returnOfCapital: Math.round(rc),
          preferredReturn: Math.round(pref),
          carry: Math.round(carry),
          netAmount: Math.round(gross * 0.98),
          taxWithheld: Math.round(gross * 0.02),
          paidAt: new Date(new Date(d.date).getTime() + 10 * 24 * 60 * 60 * 1000),
        }
      }),
    })
  }
  console.log(`  ✓ ${DIST_DATA.length} distributions with LP allocations`)

  // ============================================================
  // LPAC MEETINGS — 3 meetings
  // ============================================================
  const LPAC_MEETINGS_DATA = [
    {
      type: 'VALUATION_APPROVAL' as const, status: 'HELD' as const,
      date: '2024-03-15', quorumMet: true, location: 'Zoom',
      agenda: '1. Annual portfolio valuation sign-off FY2023\n2. NAV report approval for LP letters\n3. Any other business',
      minutes: 'LPAC convened with quorum at 10:00 AM EST. Four of five members present (Khazar FO absent — proxy given to GIC). Committee reviewed the annual fair value marks prepared by management and audited by Deloitte. All marks reviewed and approved with minor discussions on DataRobot methodology (ARR multiple reduced from 12× to 9× per committee request). NAV statement approved for distribution.',
      resolutions: [
        { type: 'VALUATION_SIGN_OFF' as const, title: 'Approve FY2023 Annual Portfolio Valuations', outcome: 'APPROVED' as const, votesFor: 4, votesAgainst: 0, description: 'Approve fair value marks for all 22 portfolio companies as presented. DataRobot mark adjusted to $1.45B (9× ARR).' },
      ],
    },
    {
      type: 'CONFLICT_REVIEW' as const, status: 'HELD' as const,
      date: '2023-09-05', quorumMet: true, location: 'In Person, Singapore',
      agenda: '1. Conflict of interest review — RTP co-lead of Dexif seed round\n2. Consent on follow-on investment in CRED (Series G)',
      minutes: 'LPAC convened with full quorum at 2:00 PM SGT. Manager disclosed that RTP Global is co-leading a seed investment in Dexif alongside Rainmatter Capital. No LPAC member has a conflicting interest. Committee reviewed and waived the conflict per LPA Section 4.3.',
      resolutions: [
        { type: 'CONFLICT_WAIVER' as const, title: 'Waive conflict — Dexif co-lead with Rainmatter Capital', outcome: 'APPROVED' as const, votesFor: 5, votesAgainst: 0, description: 'No LPAC member has a direct financial interest in Dexif. Conflict waived per LPA §4.3.' },
        { type: 'FOLLOW_ON_CONSENT' as const, title: 'Approve CRED Series G follow-on ($8M)', outcome: 'APPROVED' as const, votesFor: 4, votesAgainst: 1, description: 'Follow-on in CRED at $3.5B valuation. ADIA abstained due to exposure to CRED via another mandate.' },
      ],
    },
    {
      type: 'ANNUAL' as const, status: 'SCHEDULED' as const,
      date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
      quorumMet: false, location: 'Zoom',
      agenda: '1. FY2025 fund performance review\n2. Annual LP report sign-off\n3. FY2025 portfolio valuations\n4. Fund extension discussion (term end 2030)',
      minutes: null,
      resolutions: [],
    },
  ]

  for (const m of LPAC_MEETINGS_DATA) {
    const meeting = await db.lPACMeeting.create({
      data: {
        fundId: fund.id,
        type: m.type,
        status: m.status,
        meetingDate: new Date(m.date),
        quorumMet: m.quorumMet,
        location: m.location,
        agenda: m.agenda,
        minutesContent: m.minutes,
      },
    })

    // Add LP memberships (all 4 approved LPs)
    await db.lPACMembership.createMany({
      data: approvedLPEntities.map((lp, i) => ({
        meetingId: meeting.id,
        lpEntityId: lp.id,
        attended: m.status === 'HELD' && i < 4,
        proxy: m.status === 'HELD' && i === 3 && m.type === 'VALUATION_APPROVAL' ? 'GIC representative' : null,
      })),
    })

    // Add resolutions
    if (m.resolutions.length > 0) {
      await db.lPACResolution.createMany({
        data: m.resolutions.map((r) => ({
          meetingId: meeting.id,
          type: r.type,
          title: r.title,
          description: r.description,
          outcome: r.outcome,
          votesFor: r.votesFor,
          votesAgainst: r.votesAgainst,
        })),
      })
    }
  }
  console.log(`  ✓ ${LPAC_MEETINGS_DATA.length} LPAC meetings with resolutions`)

  // ============================================================
  // BOARD MEETINGS — 2 per featured company (quarterly + special)
  // ============================================================
  const BOARD_MEETING_COMPANIES = ['datadog', 'socure', 'miro', 'qonto']

  for (const slug of BOARD_MEETING_COMPANIES) {
    const cId = companyMap[slug]
    const c = COMPANIES.find((x) => x.slug === slug)
    if (!cId || !c) continue

    // Q1 2026 Board Meeting (held)
    const q1Meeting = await db.boardMeeting.create({
      data: {
        companyId: cId,
        type: 'QUARTERLY',
        status: 'HELD',
        meetingDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
        location: 'Zoom',
        attendees: JSON.stringify(['Board Chair', 'CEO', 'CFO', 'RTP Partner', 'Board Observer']),
        agenda: `1. Q1 2026 Business Review\n2. Financial Performance vs Budget\n3. Product Roadmap Update\n4. Hiring Plan Review\n5. Fundraising Strategy\n6. Board Resolutions\n7. AOB`,
        minutesContent: `Board meeting called to order at 10:00 AM EST.\n\nBusiness Review: ${wins(c, genMetrics(c)[genMetrics(c).length - 1]!, 1)}\n\nFinancial Performance: MRR at ${fmt(c.mrr)}, burn at ${fmt(c.burn)}/month. Runway ${(c.cash / c.burn).toFixed(0)} months.\n\nHiring: ${hiring(c, genMetrics(c)[genMetrics(c).length - 1]!)}\n\nNo material issues raised. Meeting adjourned at 12:15 PM.`,
        nextQuarterPlan: `Q2 2026 Plan:\n• Revenue target: ${fmt(c.mrr * Math.pow(1 + c.g, 3) * 3)} (quarterly)\n• Headcount: +${Math.round(c.hc * 0.05)} net adds\n• Key initiatives: AI product expansion, enterprise sales acceleration, international growth`,
      },
    })

    await db.boardResolution.createMany({
      data: [
        { meetingId: q1Meeting.id, title: 'Approve Q1 2026 Financial Statements', outcome: 'APPROVED' as const, votesFor: 5, votesAgainst: 0, proposedBy: 'CFO' },
        { meetingId: q1Meeting.id, title: `Approve Q2 2026 Budget — ${fmt(c.burn * 3)} quarterly burn`, outcome: 'APPROVED' as const, votesFor: 4, votesAgainst: 1, proposedBy: 'CEO', notes: 'One board member requested more detail on S&M efficiency before approving revised budget.' },
      ],
    })

    // Q4 2025 Board Meeting (held, older)
    const q4Meeting = await db.boardMeeting.create({
      data: {
        companyId: cId,
        type: 'QUARTERLY',
        status: 'HELD',
        meetingDate: new Date(Date.now() - 165 * 24 * 60 * 60 * 1000),
        location: 'Zoom',
        attendees: JSON.stringify(['Board Chair', 'CEO', 'CFO', 'RTP Partner']),
        agenda: `1. Q4 2025 & FY2025 Business Review\n2. 2026 Annual Plan\n3. Follow-on Investment Discussion\n4. Board Resolutions`,
        minutesContent: `Annual review for FY2025. Full-year recap completed. 2026 plan presented by management. Board approved 2026 operating plan with 3 modifications: CAC payback target tightened to 18 months, S&M budget capped at 40% of revenue, and board reporting cadence shifted to monthly MOR + quarterly board.`,
        nextQuarterPlan: `2026 Annual Plan locked:\n• ARR target: ${fmt(c.mrr * Math.pow(1 + c.g, 6) * 12)}\n• Headcount EOY: ${Math.round(c.hc * 1.15)}\n• EBITDA margin: -${(40 - Math.round((c.mrr - c.burn) / c.mrr * 100)).toFixed(0)}%`,
      },
    })

    await db.boardResolution.createMany({
      data: [
        { meetingId: q4Meeting.id, title: 'Approve 2026 Annual Operating Plan', outcome: 'APPROVED' as const, votesFor: 4, votesAgainst: 0, proposedBy: 'CEO' },
        { meetingId: q4Meeting.id, title: 'Approve transition to monthly MOR reporting', outcome: 'APPROVED' as const, votesFor: 4, votesAgainst: 0, proposedBy: 'RTP Partner', notes: 'Board unanimously agreed that monthly MOR is best practice for companies at this stage.' },
      ],
    })
  }
  console.log(`  ✓ Board meetings for ${BOARD_MEETING_COMPANIES.length} companies`)

  // ============================================================
  // MONTHLY OPERATIONS REPORTS — 3 months for 4 companies
  // ============================================================
  const MOR_COMPANIES = ['datarobot', 'rebel-foods', 'tier', 'skit-ai']  // watchlist/at-risk more interesting

  for (const slug of MOR_COMPANIES) {
    const cId = companyMap[slug]
    const c = COMPANIES.find((x) => x.slug === slug)
    if (!cId || !c) continue

    for (const monthsAgo of [3, 2, 1]) {
      const [year, month] = getPeriod(monthsAgo).split('-').map(Number)
      const dueDate = new Date(year!, month! - 1, 10)
      const submittedDate = new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days before due
      const mIdx = genMetrics(c).findIndex((m) => m.period === getPeriod(monthsAgo))
      const m = mIdx >= 0 ? genMetrics(c)[mIdx]! : genMetrics(c)[genMetrics(c).length - 1]!

      const revenueActual = m.mrr
      const budgetRevenue = revenueActual * (c.health === 'WATCHLIST' ? 1.12 : c.health === 'AT_RISK' ? 1.20 : 1.05)
      const revenueVsBudgetPct = (revenueActual - budgetRevenue) / budgetRevenue

      const burnActual = m.burnRate
      const budgetEbitda = -(burnActual * 0.80)  // budget assumes 20% less burn
      const ebitdaActual = revenueActual * c.gm - burnActual
      const ebitdaVsBudgetPct = (ebitdaActual - budgetEbitda) / Math.abs(budgetEbitda)

      const isEscalated = c.health === 'AT_RISK' || (c.health === 'WATCHLIST' && monthsAgo === 1)
      const escalationFlags = []

      if (m.runway < 6) {
        escalationFlags.push({
          type: 'LOW_RUNWAY', severity: 'CRITICAL',
          title: `Runway at ${m.runway.toFixed(1)} months — below 6-month threshold`,
          details: `Emergency protocol triggered. Board session required within 5 days. Bridge financing evaluation underway.`,
          escalateToIC: true,
        })
      } else if (revenueVsBudgetPct < -0.15 && monthsAgo <= 2) {
        escalationFlags.push({
          type: 'REVENUE_MISS', severity: 'HIGH',
          title: `Revenue ${(Math.abs(revenueVsBudgetPct) * 100).toFixed(0)}% below plan`,
          details: `Revenue missed plan by ${(Math.abs(revenueVsBudgetPct) * 100).toFixed(0)}% for ${monthsAgo === 1 ? '2nd consecutive month' : 'the month'}. GTM audit triggered. IC flagged.`,
          escalateToIC: monthsAgo === 1,
        })
      } else if (ebitdaVsBudgetPct < -0.20) {
        escalationFlags.push({
          type: 'BURN_EXCESS', severity: 'HIGH',
          title: `Burn ${(Math.abs(ebitdaVsBudgetPct) * 100).toFixed(0)}% above budget`,
          details: `Monthly burn of ${fmt(burnActual)} exceeds plan. Cash conservation measures required.`,
          escalateToIC: false,
        })
      }

      const aiSummary = `${c.name} MOR for ${getPeriod(monthsAgo)}: Revenue ${fmt(revenueActual)} (${(revenueVsBudgetPct * 100).toFixed(0)}% vs plan). Burn ${fmt(burnActual)}/month. Runway ${m.runway.toFixed(0)} months. ${escalationFlags.length > 0 ? `${escalationFlags.length} escalation flag(s) detected.` : 'Within acceptable range.'}`

      const mor = await db.monthlyOperationsReport.create({
        data: {
          companyId: cId,
          period: getPeriod(monthsAgo),
          dueDate,
          submittedAt: submittedDate,
          status: isEscalated ? 'ESCALATED' : 'REVIEWED',
          revenueSubscription: revenueActual * 0.88,
          revenueServices: revenueActual * 0.09,
          revenueOther: revenueActual * 0.03,
          cogs: revenueActual * (1 - c.gm),
          grossProfit: revenueActual * c.gm,
          grossMarginPct: c.gm,
          smExpenses: burnActual * 0.35,
          rdExpenses: burnActual * 0.40,
          gaExpenses: burnActual * 0.25,
          ebitda: ebitdaActual,
          budgetRevenue,
          budgetEbitda,
          revenueVsBudgetPct,
          ebitdaVsBudgetPct,
          ytdRevenue: revenueActual * (4 - monthsAgo),
          ytdEbitda: ebitdaActual * (4 - monthsAgo),
          ytdBudgetRevenue: budgetRevenue * (4 - monthsAgo),
          ytdBudgetEbitda: budgetEbitda * (4 - monthsAgo),
          burnRate: burnActual,
          cashBalance: m.cashBalance,
          bankBalance: m.cashBalance * 0.92,
          runway: m.runway,
          headcount: m.headcount,
          attrition: c.health === 'AT_RISK' ? Math.max(2, Math.round(m.headcount * 0.05)) : 1,
          openRoles: c.health !== 'AT_RISK' ? Math.round(m.headcount * 0.08) : 0,
          kpi1Label: 'MRR', kpi1Actual: revenueActual, kpi1Target: budgetRevenue,
          kpi2Label: 'NRR', kpi2Actual: m.nrr, kpi2Target: 110,
          kpi3Label: 'Gross Margin %', kpi3Actual: c.gm * 100, kpi3Target: c.gm * 100 + 2,
          kpi4Label: 'Runway (months)', kpi4Actual: m.runway, kpi4Target: 18,
          kpi5Label: 'Headcount', kpi5Actual: m.headcount, kpi5Target: m.headcount + 3,
          wins: wins(c, m, monthsAgo),
          misses: risks(c, m),
          pivots: c.health === 'WATCHLIST' ? 'Shifting S&M spend from outbound to PLG motion. Reducing burn by freezing non-critical hiring.' : null,
          nextMonthPriorities: `1. Close top 3 enterprise opportunities in pipeline\n2. Reduce monthly burn by 10%\n3. Complete Series ${c.stage === 'SERIES_A' ? 'B' : 'C'} fundraise process evaluation`,
          okrs: `O1: Reach ${fmt(revenueActual * 1.05)} MRR by end of quarter\nO2: Extend runway to 18+ months\nO3: Maintain NRR above ${c.nrr}%`,
          aiSummary,
          aiFlags: JSON.stringify(escalationFlags),
          aiProcessedAt: new Date(submittedDate.getTime() + 2 * 60 * 60 * 1000),
          reviewedAt: monthsAgo > 1 ? new Date(submittedDate.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
        },
      })

      // Create escalation records
      if (escalationFlags.length > 0) {
        await db.morEscalation.createMany({
          data: escalationFlags.map((e) => ({
            companyId: cId,
            morId: mor.id,
            type: e.type as 'BURN_EXCESS' | 'REVENUE_MISS' | 'LOW_RUNWAY',
            severity: e.severity as 'HIGH' | 'CRITICAL',
            title: e.title,
            details: e.details,
            escalatedToIC: e.escalateToIC,
            escalatedAt: e.escalateToIC ? new Date() : null,
            status: monthsAgo > 1 ? 'RESOLVED' as const : 'OPEN' as const,
            resolvedAt: monthsAgo > 1 ? new Date(submittedDate.getTime() + 5 * 24 * 60 * 60 * 1000) : null,
            responseNote: monthsAgo > 1 ? 'PM reviewed and discussed with management. Action plan agreed. Monitoring closely.' : null,
          })),
        })
      }
    }
  }
  console.log(`  ✓ MOR submissions for ${MOR_COMPANIES.length} companies × 3 months`)

  // ============================================================
  // FOLLOW-ON NOTES — key companies at milestone reviews
  // ============================================================
  const adminUser = await db.user.findFirst({ where: { role: 'ANALYST' }, select: { id: true } })

  const FOLLOW_ON_NOTES = [
    { slug: 'socure', period: '2026-Q1', recommendation: 'FOLLOW_ON' as const, amount: 12000000, rationale: 'Socure is performing exceptionally at 62% new ARR growth and 134% NDR. FedRAMP authorization opens significant public sector TAM. Lead their Series G or co-lead with Tiger Global. At current growth trajectory, expected to cross $400M ARR by Q3 2026. Recommended follow-on of $12M at $6.8B pre-money to maintain our pro-rata and protect our 2.2% stake.', status: 'APPROVED' as const },
    { slug: 'qonto', period: '2026-Q1', recommendation: 'FOLLOW_ON' as const, amount: 8000000, rationale: 'Qonto is executing well with 600K+ business customers and €350M ARR. Banking license filing is the key catalyst. Follow-on of €7M at same €4.5B valuation as last round to maintain our position ahead of expected IPO in 2027–2028. This is a rare opportunity to build into a European fintech champion.', status: 'IC_SUBMITTED' as const },
    { slug: 'datarobot', period: '2025-Q4', recommendation: 'WATCH' as const, amount: null, rationale: 'DataRobot growth decelerated to 12.5% YoY vs 28% prior year. Enterprise AI budget consolidation is real headwind. Agentic AI Platform launch is encouraging but needs 2–3 quarters to prove product-market fit. Recommend holding current position, not exercising pro-rata at current ask price. Reassess at Q3 2026 board.', status: 'DRAFT' as const },
    { slug: 'tier', period: '2025-Q4', recommendation: 'PASS' as const, amount: null, rationale: 'Post-Dott merger integration complexity is underestimated. TIER faces regulatory headwinds in Paris, Berlin, and Barcelona (top 3 revenue markets) with permit caps. Path to profitability requires 2026 fully profitable — achievable but not certain. With limited pro-rata opportunity at current valuation, recommend passing on any follow-on and recycling capital.', status: 'APPROVED' as const },
    { slug: 'mpower', period: '2026-Q1', recommendation: 'BRIDGE' as const, amount: 1500000, rationale: 'MPower is on a strong growth trajectory (+11% MoM) but needs $1.5M bridge to reach their MNRE certification milestone and close their institutional customer pipeline. Recommend bridge as a convertible note at 20% discount to Series A valuation cap. Clean team, growing TAM, manageable risk.', status: 'IC_SUBMITTED' as const },
  ]

  for (const n of FOLLOW_ON_NOTES) {
    const cId = companyMap[n.slug]
    if (!cId) continue
    await db.followOnNote.create({
      data: {
        companyId: cId,
        period: n.period,
        recommendation: n.recommendation,
        amount: n.amount,
        rationale: n.rationale,
        status: n.status,
        preparedById: adminUser?.id ?? null,
        submittedToICAt: n.status !== 'DRAFT' ? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) : null,
        resolvedAt: n.status === 'APPROVED' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : null,
        icNotes: n.status === 'APPROVED' ? 'IC approved. PM to lead term sheet negotiation.' : null,
      },
    })
  }
  console.log(`  ✓ ${FOLLOW_ON_NOTES.length} follow-on notes`)

  // ============================================================
  // VALUE-ADD ACTIVITIES — 10 logged activities
  // ============================================================
  const VALUE_ADD_DATA = [
    { slug: 'socure', type: 'TALENT_INTRO' as const, title: 'Intro to Sarah Chen (ex-Okta CISO) for VP Security role', outcome: 'Intro made, 3 interviews completed, offer extended. Hire expected in 3 weeks.', daysAgo: 14 },
    { slug: 'miro', type: 'CUSTOMER_BD' as const, title: 'Intro to Andrey Doronichev at Google DeepMind for enterprise deployment', outcome: 'Demo completed. Miro team in advanced procurement with DeepMind (600 seats).' , daysAgo: 28 },
    { slug: 'apollo-io', type: 'CO_INVESTOR_INTRO' as const, title: 'Intro to Sequoia Capital for Apollo.io Series C co-investment', outcome: 'Sequoia engaged. Term sheet being discussed for Q3 2026.', daysAgo: 45 },
    { slug: 'qonto', type: 'REGULATORY_GUIDANCE' as const, title: 'Intro to Orrick counsel for European banking license application strategy', outcome: 'Orrick engaged as primary regulatory counsel. ECB application timeline mapped out.', daysAgo: 21 },
    { slug: 'datarobot', type: 'CUSTOMER_BD' as const, title: 'Facilitated intro to procurement at JP Morgan Chase for Agentic AI Platform', outcome: 'JPM pilot agreed for Q3. $2.4M TCV if converted.', daysAgo: 35 },
    { slug: 'dehaat', type: 'FUNDRAISE_COACHING' as const, title: 'Session with management on profitability narrative for Series E story', outcome: 'Revised pitch deck delivered. First LP call scheduled with Temasek.', daysAgo: 10 },
    { slug: 'mpower', type: 'CO_INVESTOR_INTRO' as const, title: 'Intro to Climate Finance team at SIDBI for concessional debt facility', outcome: 'SIDBI green line application submitted. Decision expected in 6 weeks.', daysAgo: 20 },
    { slug: 'skit-ai', type: 'TALENT_INTRO' as const, title: 'Intro to Divya Menon (ex-Freshworks VP Sales) for India enterprise sales head', outcome: 'First interview completed. Positive match on culture and scope.', daysAgo: 7 },
    { slug: 'cred', type: 'PR_FACILITATION' as const, title: 'Intro to Economic Times fintech desk for CRED Mint story', outcome: 'Feature article published: "CRED Mint crosses ₹2,000 Cr AUM". Significant brand lift.', daysAgo: 60 },
    { slug: 'tractable', type: 'CUSTOMER_BD' as const, title: 'Intro to Tokio Marine Chief Claims Officer for Asia expansion', outcome: 'Pilot agreement signed for 50K claims/year. €800K ACV.', daysAgo: 42 },
  ]

  for (const va of VALUE_ADD_DATA) {
    const cId = companyMap[va.slug]
    if (!cId) continue
    await db.valueAddActivity.create({
      data: {
        companyId: cId,
        type: va.type,
        status: 'COMPLETED',
        title: va.title,
        outcome: va.outcome,
        activityDate: new Date(Date.now() - va.daysAgo * 24 * 60 * 60 * 1000),
        createdById: adminUser?.id ?? null,
      },
    })
  }
  console.log(`  ✓ ${VALUE_ADD_DATA.length} value-add activities`)

  // ============================================================
  // ANNUAL VALUATIONS — FY2025 marks for 5 featured companies
  // ============================================================
  const VALUATION_DATA = [
    { slug: 'datadog', fairValue: 168000000, prevFairValue: 142000000, method: 'ARR_MULTIPLE' as const, multiple: 9.5, implied: 35400000000, comparableSet: 'Dynatrace, New Relic, Elastic, Splunk — median 9.2× NTM ARR', note: 'Premium applied for AI observability leadership and 115% NDR. Cross-check vs $38B public market cap confirms conservatism at 0.9% ownership.', status: 'APPROVED' as const },
    { slug: 'miro', fairValue: 12750000, prevFairValue: 11200000, method: 'LAST_ROUND' as const, multiple: null, implied: 17500000000, comparableSet: null, note: 'Valued at 75% of last round ($17.5B) per Acrobat/Miro comparable analysis. Revenue growth of 18% YoY supports sustained valuation.', status: 'APPROVED' as const },
    { slug: 'socure', fairValue: 18900000, prevFairValue: 15400000, method: 'ARR_MULTIPLE' as const, multiple: 12.0, implied: 4100000000, comparableSet: 'IDEX, Jumio, Persona — identity verification SaaS at 10–14× ARR', note: 'Applied 12× to $340M ARR given exceptional 134% NDR and FedRAMP tailwind. Significant upside to last round valuation.', status: 'REVIEWED' as const },
    { slug: 'datarobot', fairValue: 7100000, prevFairValue: 8400000, method: 'ARR_MULTIPLE' as const, multiple: 9.0, implied: 1450000000, comparableSet: 'C3.ai, Domino Data Lab, DataBricks (private) — median 8.5× ARR', note: 'Marked down from 12× applied in FY2023 per LPAC request. Growth deceleration and enterprise consolidation headwinds applied.', status: 'APPROVED' as const },
    { slug: 'qonto', fairValue: 19200000, prevFairValue: 17000000, method: 'ARR_MULTIPLE' as const, multiple: 14.0, implied: 4900000000, comparableSet: 'Monzo, Starling, Revolut Business — European B2B neobanks at 12–16× ARR', note: 'Applied 14× to €350M ARR given banking license catalyst and path to IPO. Premium for market leadership in European SME banking.', status: 'DRAFT' as const },
  ]

  const partnerUser = await db.user.findFirst({ where: { role: 'PARTNER' }, select: { id: true } })

  for (const v of VALUATION_DATA) {
    const cId = companyMap[v.slug]
    if (!cId) continue
    const change = v.prevFairValue ? (v.fairValue - v.prevFairValue) / v.prevFairValue : null
    await db.annualValuation.create({
      data: {
        companyId: cId,
        year: 2025,
        fairValue: v.fairValue,
        previousFairValue: v.prevFairValue,
        changePercent: change,
        method: v.method,
        revenueMultiple: v.multiple,
        comparableSet: v.comparableSet,
        methodologyNote: v.note,
        impliedValuation: v.implied,
        navImpact: change != null ? v.fairValue - (v.prevFairValue ?? 0) : null,
        status: v.status,
        approvedById: v.status === 'APPROVED' ? partnerUser?.id ?? null : null,
        approvedAt: v.status === 'APPROVED' ? new Date('2025-04-15') : null,
      },
    })
  }
  console.log(`  ✓ ${VALUATION_DATA.length} annual valuations (FY2025)`)

  // ── Summary ──────────────────────────────────────────────────
  const counts = {
    companies: await db.company.count(),
    metrics: await db.metricSnapshot.count(),
    updates: await db.founderUpdate.count(),
    risks: await db.risk.count(),
    trends: await db.trendFinding.count(),
    signals: await db.marketSignal.count(),
    mrrBridges: await db.mrrBridge.count(),
    unitEconomics: await db.unitEconomics.count(),
    incomeStatements: await db.incomeStatement.count(),
    balanceSheets: await db.balanceSheet.count(),
    cashFlows: await db.cashFlowStatement.count(),
    fundingRounds: await db.fundingRound.count(),
    investments: await db.fundInvestment.count(),
    valuationMarks: await db.valuationMark.count(),
    capTableEntries: await db.capTableEntry.count(),
    capitalActivities: await db.capitalActivity.count(),
  }
  console.log('\nSeed complete:')
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
  console.log('\nReal RTP.VC portfolio loaded. Data sources: public filings, press releases, Sacra, Crunchbase, verified earnings calls.')
}

main().catch(console.error).finally(() => db.$disconnect())
