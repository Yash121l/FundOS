import { db } from '@fundos/database'

// ── Module D: Investment Tracking ────────────────────────────

export async function getCompanyInvestments(companyId: string) {
  const [fundingRounds, investments] = await Promise.all([
    db.fundingRound.findMany({
      where: { companyId },
      orderBy: { closeDate: 'desc' },
      include: {
        investments: {
          include: {
            valuationMarks: {
              orderBy: { markDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    }),
    db.fundInvestment.findMany({
      where: { companyId },
      orderBy: { investmentDate: 'desc' },
      include: {
        round: { select: { roundName: true } },
        valuationMarks: {
          orderBy: { markDate: 'desc' },
          take: 1,
        },
      },
    }),
  ])

  return { fundingRounds, investments }
}

export type CompanyInvestments = Awaited<ReturnType<typeof getCompanyInvestments>>
export type FundingRoundRow = CompanyInvestments['fundingRounds'][number]
export type InvestmentRow = CompanyInvestments['investments'][number]

// ── Module E: Cap Table ───────────────────────────────────────

export async function getCapTable(companyId: string) {
  const [entries, safeNotes, convertibleNotes, optionPools] = await Promise.all([
    db.capTableEntry.findMany({
      where: { companyId },
      orderBy: [{ holderType: 'asc' }, { sharesIssued: 'desc' }],
    }),
    db.safeNote.findMany({
      where: { companyId },
      orderBy: { issueDate: 'desc' },
    }),
    db.convertibleNote.findMany({
      where: { companyId },
      orderBy: { issueDate: 'desc' },
    }),
    db.optionPool.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
  ])

  return { entries, safeNotes, convertibleNotes, optionPools }
}

export type CapTable = Awaited<ReturnType<typeof getCapTable>>
export type CapTableEntryRow = CapTable['entries'][number]
export type SafeNoteRow = CapTable['safeNotes'][number]
export type ConvertibleNoteRow = CapTable['convertibleNotes'][number]
export type OptionPoolRow = CapTable['optionPools'][number]

// ── Helpers ───────────────────────────────────────────────────

export function computeInvestmentMoic(amountInvested: number, fairValue: number | null): number | null {
  if (fairValue == null || amountInvested === 0) return null
  return fairValue / amountInvested
}

export function computeFullyDilutedShares(entries: CapTableEntryRow[], optionPool: OptionPoolRow | null): number {
  const issued = entries.reduce((sum, e) => sum + e.sharesIssued, 0)
  const pool = optionPool ? optionPool.authorizedShares - optionPool.exercisedShares : 0
  return issued + pool
}

export interface WaterfallInput {
  exitValue: number
  entries: CapTableEntryRow[]
  optionPool: OptionPoolRow | null
  totalDebt: number
}

export interface WaterfallResult {
  holderName: string
  holderType: string
  shareClass: string
  totalProceeds: number
  moic: number | null
}

export function computeLiquidationWaterfall(input: WaterfallInput): WaterfallResult[] {
  let remaining = input.exitValue

  // 1. Repay debt first
  remaining = Math.max(0, remaining - input.totalDebt)

  // Separate preferred (reverse seniority) and common
  const preferred = input.entries.filter((e) => e.shareClass.toLowerCase().includes('preferred'))
  const common = input.entries.filter((e) => !e.shareClass.toLowerCase().includes('preferred'))

  const results: WaterfallResult[] = []

  // 2. Non-participating preferred — pay liquidation preferences
  const prefClaims: Array<{ entry: CapTableEntryRow; preference: number }> = []
  for (const entry of preferred) {
    const pref = entry.liquidationPreference ?? 1
    const totalPref = pref * entry.sharesIssued
    prefClaims.push({ entry, preference: totalPref })
  }

  // Pay preferences in reverse order (latest series first)
  const sortedPrefs = [...prefClaims].reverse()
  for (const { entry, preference } of sortedPrefs) {
    const paid = Math.min(remaining, preference)
    remaining -= paid

    if (!entry.participating) {
      // non-participating: will choose between pref and as-converted later
      results.push({ holderName: entry.holderName, holderType: entry.holderType, shareClass: entry.shareClass, totalProceeds: paid, moic: null })
    } else {
      // participating: gets preference NOW plus pro-rata later
      results.push({ holderName: entry.holderName, holderType: entry.holderType, shareClass: entry.shareClass, totalProceeds: paid, moic: null })
    }
  }

  // 3. Distribute remaining to common + participating preferred pro-rata
  if (remaining > 0) {
    const totalConvertedShares = input.entries.reduce((s, e) => s + e.sharesIssued, 0) +
      (input.optionPool?.vestedShares ?? 0)
    const pricePerShare = totalConvertedShares > 0 ? remaining / totalConvertedShares : 0
    const distributablePool = remaining

    for (const entry of common) {
      const proceeds = pricePerShare * entry.sharesIssued
      results.push({ holderName: entry.holderName, holderType: entry.holderType, shareClass: entry.shareClass, totalProceeds: proceeds, moic: null })
    }

    // non-participating preferred: elect greater of preference or as-converted pro-rata
    for (const r of results) {
      const entry = preferred.find((e) => e.holderName === r.holderName && e.shareClass === r.shareClass && !e.participating)
      if (entry) {
        const proRataShare = totalConvertedShares > 0
          ? distributablePool * (entry.sharesIssued / totalConvertedShares)
          : 0
        r.totalProceeds = Math.max(r.totalProceeds, proRataShare)
      }
    }

    // participating preferred also gets pro-rata on top of preference
    for (const r of results) {
      const entry = preferred.find((e) => e.holderName === r.holderName && e.shareClass === r.shareClass && e.participating)
      if (entry) {
        r.totalProceeds += pricePerShare * entry.sharesIssued
      }
    }

    if (input.optionPool?.vestedShares) {
      results.push({
        holderName: 'Option Pool (vested)',
        holderType: 'OPTION_POOL',
        shareClass: 'Common',
        totalProceeds: pricePerShare * input.optionPool.vestedShares,
        moic: null,
      })
    }
  }

  return results
}
