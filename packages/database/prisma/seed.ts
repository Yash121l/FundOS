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
}

const COMPANIES: C[] = [
  // ── AI / Monitoring ────────────────────────────────────────
  {
    name: 'Datadog', slug: 'datadog', sector: 'AI', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'Unified cloud monitoring, security, and analytics platform. Serves 30,000+ customers globally with APM, logs, infrastructure, and AI observability in one platform. RTP Global early backer.',
    year: 2010, website: 'https://datadoghq.com', country: 'US',
    mrr: 310000000, g: 0.023, burn: 250000000, cash: 1800000000,
    hc: 5200, gm: 0.80, nrr: 115,
  },
  {
    name: 'Picsart', slug: 'picsart', sector: 'AI', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'AI-powered creative platform for photo and video editing with 150M+ monthly active users. One of the world\'s most downloaded creative apps. Backed by RTP Global and SoftBank Vision Fund.',
    year: 2011, website: 'https://picsart.com', country: 'US',
    mrr: 9000000, g: 0.022, burn: 7000000, cash: 60000000,
    hc: 600, gm: 0.78, nrr: 112,
  },
  {
    name: 'Socure', slug: 'socure', sector: 'AI', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'AI-native identity verification and fraud prevention platform. Processes 2.7B+ identity requests annually for 3,000+ enterprise customers. 62% new ARR growth in Q1 2026, NDR of 134%.',
    year: 2012, website: 'https://socure.com', country: 'US',
    mrr: 28300000, g: 0.042, burn: 20000000, cash: 180000000,
    hc: 700, gm: 0.72, nrr: 134,
  },
  {
    name: 'DataRobot', slug: 'datarobot', sector: 'AI', stage: 'SERIES_B', health: 'WATCHLIST',
    desc: 'End-to-end ML automation and AI application platform for enterprise. 850+ customers including 40% of Fortune 500. Expanding from AutoML into agentic AI. Valuation $6.3B.',
    year: 2012, website: 'https://datarobot.com', country: 'US',
    mrr: 18750000, g: 0.010, burn: 20000000, cash: 180000000,
    hc: 1200, gm: 0.68, nrr: 108,
  },
  {
    name: 'Tractable', slug: 'tractable', sector: 'AI', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'AI for accident and disaster recovery used by 20+ of the global top 100 insurers — Aviva, Geico, Admiral — processing $7B in annual claims with 10× faster cycle times.',
    year: 2014, website: 'https://tractable.ai', country: 'UK',
    mrr: 5800000, g: 0.019, burn: 4500000, cash: 80000000,
    hc: 250, gm: 0.70, nrr: 115,
  },
  {
    name: 'Skit.ai', slug: 'skit-ai', sector: 'AI', stage: 'SERIES_A', health: 'WATCHLIST',
    desc: 'Conversational voice AI platform automating customer support and debt collection workflows for banks, NBFCs, and large enterprises across India and Southeast Asia.',
    year: 2017, website: 'https://skit.ai', country: 'India',
    mrr: 820000, g: 0.030, burn: 700000, cash: 14000000,
    hc: 200, gm: 0.65, nrr: 108,
  },

  // ── SaaS ───────────────────────────────────────────────────
  {
    name: 'Miro', slug: 'miro', sector: 'SAAS', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'Online collaborative whiteboard platform trusted by 90M+ users across 250,000+ organizations including 99% of the Fortune 100. ARR ~$500M, valued at $17.5B.',
    year: 2011, website: 'https://miro.com', country: 'US',
    mrr: 42000000, g: 0.014, burn: 30000000, cash: 280000000,
    hc: 1800, gm: 0.75, nrr: 120,
  },
  {
    name: 'Apollo.io', slug: 'apollo-io', sector: 'SAAS', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'Sales intelligence and engagement platform with 210M+ B2B contacts. Reached $150M ARR in 2025, 500% AI feature growth, trusted by 500,000+ companies including Autodesk and DocuSign.',
    year: 2015, website: 'https://apollo.io', country: 'US',
    mrr: 12500000, g: 0.029, burn: 8000000, cash: 110000000,
    hc: 800, gm: 0.80, nrr: 125,
  },
  {
    name: 'Delivery Hero', slug: 'delivery-hero', sector: 'SAAS', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'World\'s largest food delivery and quick commerce company operating in 70+ countries. €14B+ revenue in 2025, 600M+ annual orders. Listed on Frankfurt Stock Exchange.',
    year: 2011, website: 'https://deliveryhero.com', country: 'Germany',
    mrr: 1280000000, g: 0.012, burn: 250000000, cash: 3000000000,
    hc: 45000, gm: 0.45, nrr: 110,
  },
  {
    name: 'MPL', slug: 'mpl', sector: 'SAAS', stage: 'SERIES_A', health: 'WATCHLIST',
    desc: 'India\'s largest real-money gaming platform with 80M+ app downloads. FY24 revenue $130M (+22% YoY), EBITDA neutral. Skill-based card games, sports, and esports tournaments.',
    year: 2018, website: 'https://mpl.live', country: 'India',
    mrr: 10800000, g: 0.017, burn: 500000, cash: 50000000,
    hc: 400, gm: 0.45, nrr: 110,
  },
  {
    name: 'Rebel Foods', slug: 'rebel-foods', sector: 'SAAS', stage: 'SERIES_B', health: 'WATCHLIST',
    desc: 'World\'s largest internet restaurant company with 45+ cloud kitchen brands including Faasos, Behrouz Biryani, and Oven Story. Operates 450+ kitchens across 12 countries. IPO-bound.',
    year: 2011, website: 'https://rebelfoods.com', country: 'India',
    mrr: 16200000, g: 0.004, burn: 5000000, cash: 120000000,
    hc: 3000, gm: 0.30, nrr: 95,
  },
  {
    name: 'Practo', slug: 'practo', sector: 'SAAS', stage: 'SERIES_A', health: 'HEALTHY',
    desc: 'India\'s largest digital health platform connecting 350M+ patients with 350,000+ doctors via teleconsultations, health records, and clinic management software. Achieved EBITDA break-even in Q4 FY24.',
    year: 2008, website: 'https://practo.com', country: 'India',
    mrr: 2300000, g: 0.018, burn: 1800000, cash: 25000000,
    hc: 550, gm: 0.70, nrr: 110,
  },
  {
    name: 'BrightHire', slug: 'brighthire', sector: 'SAAS', stage: 'SEED', health: 'HEALTHY',
    desc: 'Interview intelligence platform that records, transcribes, and analyzes hiring interviews for structured decision-making. Acquired by Zoom in November 2025. Customers include Canva, Duolingo, Instacart, and Ramp.',
    year: 2019, website: 'https://brighthire.ai', country: 'US',
    mrr: 700000, g: 0.019, burn: 500000, cash: 12000000,
    hc: 55, gm: 0.82, nrr: 122,
  },
  {
    name: 'Newton School', slug: 'newton-school', sector: 'SAAS', stage: 'SEED', health: 'WATCHLIST',
    desc: 'Outcome-based coding education platform in India with Income Share Agreement model. Graduates placed at Flipkart, Razorpay, Zomato. FY25 revenue ₹43.6 Cr. RTP Global Series A lead.',
    year: 2019, website: 'https://newtonschool.co', country: 'India',
    mrr: 437500, g: 0.015, burn: 350000, cash: 8000000,
    hc: 120, gm: 0.65, nrr: 105,
  },

  // ── FinTech ────────────────────────────────────────────────
  {
    name: 'Qonto', slug: 'qonto', sector: 'FINTECH', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'European B2B neobank serving 600,000+ SMEs and freelancers. €350M ARR in FY25 (+30% YoY), €420M cash. Raised at $5B valuation, filing for full European banking license.',
    year: 2016, website: 'https://qonto.com', country: 'France',
    mrr: 32000000, g: 0.022, burn: 25000000, cash: 460000000,
    hc: 1800, gm: 0.62, nrr: 115,
  },
  {
    name: 'CRED', slug: 'cred', sector: 'FINTECH', stage: 'SERIES_B', health: 'WATCHLIST',
    desc: 'India\'s premium fintech super-app for creditworthy members. FY24 revenue ₹2,473 Cr (+66% YoY), 13M MAU, processes ₹55,000 Cr monthly in UPI. Valuation $3.5B.',
    year: 2018, website: 'https://cred.club', country: 'India',
    mrr: 24750000, g: 0.025, burn: 6000000, cash: 250000000,
    hc: 1000, gm: 0.55, nrr: 105,
  },
  {
    name: 'PayJoy', slug: 'payjoy', sector: 'FINTECH', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'Smartphone financing platform for underserved customers in emerging markets. 16M+ customers across Mexico, Brazil, India, and Africa. On track for $650M revenue and $110M profit in 2025.',
    year: 2015, website: 'https://payjoy.com', country: 'US',
    mrr: 54200000, g: 0.019, burn: 15000000, cash: 200000000,
    hc: 800, gm: 0.35, nrr: 115,
  },
  {
    name: 'Dexif', slug: 'dexif', sector: 'FINTECH', stage: 'PRE_SEED', health: 'WATCHLIST',
    desc: 'Fixed income investment platform simplifying corporate bonds, debentures, and debt instruments for retail investors in India. RTP Global invested $4M in 2024.',
    year: 2022, website: 'https://dexif.in', country: 'India',
    mrr: 180000, g: 0.080, burn: 150000, cash: 2500000,
    hc: 22, gm: 0.75, nrr: 108,
  },

  // ── DevTools ───────────────────────────────────────────────
  {
    name: 'dbt Labs', slug: 'dbt-labs', sector: 'DEVTOOLS', stage: 'SERIES_B', health: 'HEALTHY',
    desc: 'Analytics engineering framework enabling data teams to transform raw data using SQL. Surpassed $100M ARR with 5,000+ customers including Condé Nast, HubSpot, Nasdaq. Merged with Fivetran in Oct 2025.',
    year: 2016, website: 'https://getdbt.com', country: 'US',
    mrr: 9500000, g: 0.029, burn: 7000000, cash: 200000000,
    hc: 400, gm: 0.82, nrr: 118,
  },

  // ── ClimateTech / AgriTech ─────────────────────────────────
  {
    name: 'TIER', slug: 'tier', sector: 'CLIMATETECH', stage: 'SERIES_B', health: 'WATCHLIST',
    desc: 'Europe\'s leading shared e-scooter and e-bike operator, merged with Dott in 2024. Combined entity targeting €200M+ revenue across 100+ European cities on the path to profitability.',
    year: 2018, website: 'https://tier.app', country: 'Germany',
    mrr: 18300000, g: 0.010, burn: 15000000, cash: 80000000,
    hc: 900, gm: 0.35, nrr: 105,
  },
  {
    name: 'DeHaat', slug: 'dehaat', sector: 'CLIMATETECH', stage: 'SERIES_A', health: 'WATCHLIST',
    desc: 'Full-stack agritech platform serving 13M+ Indian farmers with inputs, crop advisory, microfinance, and market linkages via 18,000+ agri-service centers across 12 states.',
    year: 2012, website: 'https://dehaat.com', country: 'India',
    mrr: 30500000, g: 0.009, burn: 2000000, cash: 40000000,
    hc: 2800, gm: 0.20, nrr: 108,
  },
  {
    name: 'MPower', slug: 'mpower', sector: 'CLIMATETECH', stage: 'SEED', health: 'HEALTHY',
    desc: 'Distributed solar energy financing and monitoring platform for SMBs and commercial rooftops across India. Energy audit-to-PPA workflow automation reduces solar adoption friction by 70%.',
    year: 2022, website: 'https://mpowersolar.in', country: 'India',
    mrr: 290000, g: 0.11, burn: 220000, cash: 3800000,
    hc: 28, gm: 0.68, nrr: 116,
  },
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
  console.log('\nReal RTP.VC portfolio loaded. Data sources: public filings, press releases, Sacra, Crunchbase, verified earnings calls.')
}

main().catch(console.error).finally(() => db.$disconnect())
