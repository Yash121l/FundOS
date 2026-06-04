// ==================
// ENUMS
// ==================

export type UserRole = 'PARTNER' | 'PORTFOLIO_OPS' | 'FINANCE' | 'FOUNDER'

export type Sector =
  | 'SAAS'
  | 'FINTECH'
  | 'AI'
  | 'DEVTOOLS'
  | 'CLIMATETECH'
  | 'HEALTHTECH'
  | 'MARKETPLACE'
  | 'INFRASTRUCTURE'
  | 'OTHER'

export type Stage =
  | 'PRE_SEED'
  | 'SEED'
  | 'SERIES_A'
  | 'SERIES_B'
  | 'SERIES_C'
  | 'GROWTH'

export type CompanyStatus = 'ACTIVE' | 'EXITED' | 'WRITTEN_OFF' | 'WATCH'

export type HealthStatus = 'HEALTHY' | 'WATCHLIST' | 'AT_RISK'

export type MetricSource = 'FOUNDER_UPDATE' | 'MANUAL' | 'IMPORT'

export type FundraisingStatus =
  | 'NOT_RAISING'
  | 'EXPLORING'
  | 'ACTIVELY_RAISING'
  | 'TERM_SHEET'
  | 'CLOSED'

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type RiskCategory =
  | 'BURN'
  | 'REVENUE'
  | 'TEAM'
  | 'PRODUCT'
  | 'MARKET'
  | 'FUNDRAISING'
  | 'OPERATIONAL'
  | 'LEGAL'
  | 'OTHER'

export type RiskStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED'

export type OpportunityStatus = 'OPEN' | 'ACTED_ON' | 'DISMISSED'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'

export type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED'

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

export type ReportStatus = 'GENERATING' | 'READY' | 'EXPORTED' | 'ARCHIVED' | 'FAILED'

export type TrendCategory =
  | 'SHARED_RISK'
  | 'HIRING_PATTERN'
  | 'FUNDRAISING'
  | 'GROWTH_PATTERN'
  | 'MARKET_EVENT'
  | 'OPERATIONAL'

export type TrendStatus = 'ACTIVE' | 'DISMISSED' | 'ACTIONED'

export type SignalCategory =
  | 'FUNDING_NEWS'
  | 'COMPETITOR_ACTIVITY'
  | 'MARKET_TREND'
  | 'REGULATION'
  | 'ACQUISITION'
  | 'IPO'
  | 'OTHER'

// ==================
// DOMAIN MODELS
// ==================

export interface User {
  id: string
  clerkId: string
  email: string
  name: string
  role: UserRole
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Company {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  website: string | null
  sector: Sector
  stage: Stage
  country: string
  foundedYear: number | null
  description: string | null
  status: CompanyStatus
  healthStatus: HealthStatus
  healthScore: number
  latestMetricsId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface MetricSnapshot {
  id: string
  companyId: string
  period: string // YYYY-MM
  mrr: number | null
  arr: number | null
  revenueGrowthMom: number | null
  revenueGrowthYoy: number | null
  grossMargin: number | null
  nrr: number | null
  burnRate: number | null
  cashBalance: number | null
  runway: number | null
  headcount: number | null
  headcountChange: number | null
  healthScore: number | null
  source: MetricSource
  createdAt: Date
}

export interface FounderUpdate {
  id: string
  companyId: string
  period: string
  submittedById: string | null
  mrr: number | null
  burnRate: number | null
  cashBalance: number | null
  runway: number | null
  headcount: number | null
  fundraisingStatus: FundraisingStatus
  fundraisingNote: string | null
  wins: string
  risks: string
  hiringNeeds: string | null
  additionalNotes: string | null
  aiSummary: string | null
  founderTone: string | null
  aiProcessedAt: Date | null
  reviewedAt: Date | null
  reviewedById: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Risk {
  id: string
  companyId: string
  updateId: string | null
  title: string
  description: string
  severity: Severity
  category: RiskCategory
  source: string | null
  status: RiskStatus
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Opportunity {
  id: string
  companyId: string
  updateId: string | null
  title: string
  description: string
  category: string
  status: OpportunityStatus
  createdAt: Date
  updatedAt: Date
}

export interface Action {
  id: string
  companyId: string
  updateId: string | null
  title: string
  description: string | null
  priority: Priority
  status: ActionStatus
  assigneeId: string | null
  dueDate: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Task {
  id: string
  companyId: string | null
  title: string
  description: string | null
  priority: Priority
  status: TaskStatus
  assigneeId: string | null
  createdById: string
  dueDate: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface LPReport {
  id: string
  title: string
  quarter: string
  status: ReportStatus
  generatedById: string
  version: number
  markdownContent: string | null
  pdfUrl: string | null
  fundMetricsSnapshot: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface LPReportSection {
  id: string
  reportId: string
  title: string
  content: string
  order: number
  aiGenerated: boolean
  editedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface TrendFinding {
  id: string
  title: string
  summary: string
  category: TrendCategory
  severity: Severity
  affectedCount: number
  detectedAt: Date
  periodStart: Date
  periodEnd: Date
  status: TrendStatus
  dismissedAt: Date | null
  actionId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TrendEvidence {
  id: string
  trendId: string
  companyId: string
  quote: string
  updateId: string | null
  createdAt: Date
}

export interface MarketSignal {
  id: string
  title: string
  summary: string
  url: string | null
  source: string
  category: SignalCategory
  publishedAt: Date
  relevance: number | null
  createdAt: Date
}

export interface AuditLog {
  id: string
  userId: string | null
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: Date
}

// ==================
// COMPOSITE TYPES
// ==================

export interface CompanyWithMetrics extends Company {
  latestMetrics: MetricSnapshot | null
  metricsHistory: MetricSnapshot[]
}

export interface CompanyDetail extends Company {
  latestMetrics: MetricSnapshot | null
  metricsHistory: MetricSnapshot[]
  updates: FounderUpdate[]
  risks: Risk[]
  opportunities: Opportunity[]
  actions: Action[]
  tasks: Task[]
}

export interface UpdateWithCompany extends FounderUpdate {
  company: Pick<Company, 'id' | 'name' | 'slug' | 'sector' | 'healthStatus'>
  detectedRisks: Risk[]
  opportunities: Opportunity[]
  actions: Action[]
}

export interface TrendWithEvidence extends TrendFinding {
  evidence: Array<TrendEvidence & { company: Pick<Company, 'id' | 'name' | 'slug'> }>
}

export interface SignalWithCompanies extends MarketSignal {
  companies: Array<{
    company: Pick<Company, 'id' | 'name' | 'slug'>
    relevanceExplanation: string | null
  }>
}

// ==================
// ANALYTICS TYPES
// ==================

export interface FundAggregates {
  totalMrr: number
  totalArr: number
  totalBurn: number
  avgGrowthMom: number
  avgRunway: number
  totalHeadcount: number
  healthDistribution: {
    healthy: number
    watchlist: number
    atRisk: number
  }
}

export interface HealthScore {
  score: number
  status: HealthStatus
  components: {
    growth: number
    revenueTrend: number
    runway: number
    burnEfficiency: number
  }
}

export type GrowthTrend = 'ACCELERATING' | 'STABLE' | 'DECELERATING'

// ==================
// API TYPES
// ==================

export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    hasMore: boolean
    cursor: string | null
  }
}

// API request types
export interface CreateFounderUpdateRequest {
  companyId: string
  period: string
  mrr?: number
  burnRate?: number
  cashBalance?: number
  headcount?: number
  fundraisingStatus?: FundraisingStatus
  fundraisingNote?: string
  wins: string
  risks: string
  hiringNeeds?: string
  additionalNotes?: string
}

export interface GenerateReportRequest {
  quarter: string
  companyIds: string[]
  tone?: 'STANDARD' | 'CONSERVATIVE' | 'GROWTH_FOCUSED'
}

export interface CompanyFilters {
  sector?: Sector
  stage?: Stage
  healthStatus?: HealthStatus
  status?: CompanyStatus
  search?: string
  sortBy?: 'name' | 'mrr' | 'growth' | 'burn' | 'runway' | 'healthScore'
  sortOrder?: 'asc' | 'desc'
  cursor?: string
  limit?: number
}

export interface UpdateFilters {
  companyId?: string
  period?: string
  reviewed?: boolean
  cursor?: string
  limit?: number
}

// ==================
// AI SERVICE TYPES
// ==================

export interface PortfolioAnalystInput {
  company: Company
  latestUpdate: FounderUpdate
  metricsHistory: MetricSnapshot[]
  previousUpdates: FounderUpdate[]
}

export type FounderTone = 'confident' | 'cautious' | 'distressed' | 'uncertain'

export interface PortfolioAnalystOutput {
  healthSummary: string
  founderTone?: FounderTone  // present when OpenAI key is configured
  risks: Array<Omit<Risk, 'id' | 'companyId' | 'updateId' | 'resolvedAt' | 'createdAt' | 'updatedAt'>>
  opportunities: Array<Omit<Opportunity, 'id' | 'companyId' | 'updateId' | 'createdAt' | 'updatedAt'>>
  suggestedActions: Array<Omit<Action, 'id' | 'companyId' | 'updateId' | 'assigneeId' | 'dueDate' | 'completedAt' | 'createdAt' | 'updatedAt'>>
}

export interface LPReportInput {
  quarter: string
  companies: CompanyWithMetrics[]
  recentUpdates: FounderUpdate[]
  fundMetrics: FundAggregates
  tone?: 'STANDARD' | 'CONSERVATIVE' | 'GROWTH_FOCUSED'
}

export interface LPReportSectionOutput {
  title: string
  content: string
  order: number
}

export interface LPReportOutput {
  sections: LPReportSectionOutput[]
}

export interface TrendDetectionInput {
  updates: Array<FounderUpdate & { company: Pick<Company, 'id' | 'name' | 'sector'> }>
  metricsHistory: MetricSnapshot[]
}

export interface TrendDetectionOutput {
  findings: Array<{
    title: string
    summary: string
    category: TrendCategory
    severity: Severity
    confidenceScore?: number       // 0–1, present when OpenAI key is configured
    recommendedAction?: string     // present when OpenAI key is configured
    evidence: Array<{
      companyId: string
      quote: string
      updateId?: string
    }>
  }>
}

export interface AIAuditEntry {
  service: string
  model: string
  promptTokens: number
  completionTokens: number
  durationMs: number
  entityType: string
  entityId: string
  input: unknown
  output: unknown
  createdAt: Date
}
