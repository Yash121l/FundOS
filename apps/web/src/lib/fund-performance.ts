import { db } from '@fundos/database'

// ── XIRR (Newton-Raphson) ─────────────────────────────────────

export function xirr(cashflows: { amount: number; date: Date }[], guess = 0.1): number | null {
  if (cashflows.length < 2) return null

  const t0 = cashflows[0]!.date.getTime()
  const daysFromStart = cashflows.map((cf) => (cf.date.getTime() - t0) / 86_400_000)
  const amounts = cashflows.map((cf) => cf.amount)

  let rate = guess
  for (let iter = 0; iter < 200; iter++) {
    let f = 0
    let df = 0
    for (let i = 0; i < amounts.length; i++) {
      const t = daysFromStart[i]!
      const v = Math.pow(1 + rate, t / 365)
      f += amounts[i]! / v
      df -= (t / 365) * amounts[i]! / (v * (1 + rate))
    }
    if (Math.abs(df) < 1e-12) break
    const newRate = rate - f / df
    if (Math.abs(newRate - rate) < 1e-8) return newRate
    rate = newRate
    if (rate <= -1) rate = -0.999
  }
  return rate
}

// ── Module F: Fund Performance ────────────────────────────────

export async function getFundPerformance() {
  const [profile, activities, investments] = await Promise.all([
    db.fundProfile.findFirst(),
    db.capitalActivity.findMany({ orderBy: { date: 'asc' } }),
    db.fundInvestment.findMany({
      include: {
        company: { select: { id: true, name: true, sector: true, stage: true, slug: true } },
        round: { select: { roundName: true, closeDate: true } },
        valuationMarks: {
          where: { status: { in: ['REVIEWED', 'APPROVED'] } },
          orderBy: { markDate: 'desc' },
          take: 1,
        },
      },
    }),
  ])

  if (!profile) return null

  // Capital account
  const calledCapital = activities
    .filter((a) => a.type === 'CAPITAL_CALL')
    .reduce((s, a) => s + a.amount, 0)
  const distributions = activities
    .filter((a) => a.type === 'DISTRIBUTION')
    .reduce((s, a) => s + a.amount, 0)

  // NAV from latest approved marks
  const nav = investments.reduce((sum, inv) => {
    const mark = inv.valuationMarks[0]
    return sum + (mark?.fairValue ?? inv.amountInvested)
  }, 0)

  // Performance multiples
  const tvpi = calledCapital > 0 ? (distributions + nav) / calledCapital : null
  const dpi = calledCapital > 0 ? distributions / calledCapital : null
  const rvpi = calledCapital > 0 ? nav / calledCapital : null

  // Net IRR via XIRR on LP cashflows
  const irrCashflows = activities
    .filter((a) => a.type === 'CAPITAL_CALL' || a.type === 'DISTRIBUTION')
    .map((a) => ({
      amount: a.type === 'CAPITAL_CALL' ? -a.amount : a.amount,
      date: a.date,
    }))
  // Add NAV as terminal inflow at today
  if (irrCashflows.length > 0 && nav > 0) {
    irrCashflows.push({ amount: nav, date: new Date() })
  }
  const netIrr = irrCashflows.length >= 2 ? xirr(irrCashflows) : null

  // Schedule of investments
  const scheduleOfInvestments = investments.map((inv) => {
    const mark = inv.valuationMarks[0]
    const fairValue = mark?.fairValue ?? inv.amountInvested
    const moic = inv.amountInvested > 0 ? fairValue / inv.amountInvested : null
    const unrealizedGainLoss = fairValue - inv.amountInvested

    // Gross IRR per investment
    const invCashflows: { amount: number; date: Date }[] = [
      { amount: -inv.amountInvested, date: inv.investmentDate },
      { amount: fairValue, date: new Date() },
    ]
    const grossIrr = xirr(invCashflows)

    return {
      id: inv.id,
      companyId: inv.company.id,
      companyName: inv.company.name,
      companySector: inv.company.sector,
      companyStage: inv.company.stage,
      companySlug: inv.company.slug,
      roundName: inv.round?.roundName ?? inv.securityType,
      investmentDate: inv.investmentDate,
      securityType: inv.securityType,
      amountInvested: inv.amountInvested,
      sharesAcquired: inv.sharesAcquired,
      ownershipPctFullyDiluted: inv.ownershipPctFullyDiluted,
      followOnReserve: inv.followOnReserve,
      fairValue,
      moic,
      grossIrr,
      unrealizedGainLoss,
      lastMarkDate: mark?.markDate ?? null,
      valuationMethod: mark?.valuationMethod ?? 'LAST_ROUND',
      markStatus: mark?.status ?? null,
    }
  })

  const totalCostBasis = scheduleOfInvestments.reduce((s, i) => s + i.amountInvested, 0)
  const totalFairValue = scheduleOfInvestments.reduce((s, i) => s + i.fairValue, 0)
  const grossMoic = totalCostBasis > 0 ? totalFairValue / totalCostBasis : null

  // Deployment
  const deploymentPct = profile.committedCapital > 0 ? calledCapital / profile.committedCapital : 0
  const unfundedCommitment = profile.committedCapital - calledCapital
  const totalFollowOnReserves = investments.reduce((s, i) => s + (i.followOnReserve ?? 0), 0)

  return {
    profile,
    calledCapital,
    distributions,
    nav,
    unfundedCommitment,
    tvpi,
    dpi,
    rvpi,
    netIrr,
    grossMoic,
    deploymentPct,
    totalFollowOnReserves,
    totalCostBasis,
    totalFairValue,
    scheduleOfInvestments,
    activities,
  }
}

export type FundPerformance = NonNullable<Awaited<ReturnType<typeof getFundPerformance>>>
export type ScheduleEntry = FundPerformance['scheduleOfInvestments'][number]
