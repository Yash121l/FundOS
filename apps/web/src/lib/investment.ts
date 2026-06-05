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
  const afterDebt = Math.max(0, input.exitValue - input.totalDebt)

  const preferred = input.entries.filter((e) => e.shareClass.toLowerCase().includes('preferred'))
  const common = input.entries.filter((e) => !e.shareClass.toLowerCase().includes('preferred'))
  const allShares = input.entries.reduce((s, e) => s + e.sharesIssued, 0) + (input.optionPool?.vestedShares ?? 0)

  // 1. Determine which non-participating preferred convert vs take preference.
  //    As-converted value = full afterDebt pro-rata share (not just remaining-after-prefs).
  const npConverters = new Set<string>()
  for (const entry of preferred.filter((e) => !e.participating)) {
    const preference = (entry.liquidationPreference ?? 1) * entry.sharesIssued
    const asConverted = allShares > 0 ? afterDebt * (entry.sharesIssued / allShares) : 0
    if (asConverted > preference) npConverters.add(entry.holderName + '|' + entry.shareClass)
  }

  const results: WaterfallResult[] = []
  let remaining = afterDebt

  // 2. Pay preferences: NP-taking-preference first (latest series first), then participating.
  const sortedPreferred = [...preferred].reverse()
  for (const entry of sortedPreferred) {
    const key = entry.holderName + '|' + entry.shareClass
    if (!entry.participating && npConverters.has(key)) continue  // converting NP skips preference step
    const preference = (entry.liquidationPreference ?? 1) * entry.sharesIssued
    const paid = Math.min(remaining, preference)
    remaining -= paid
    results.push({ holderName: entry.holderName, holderType: entry.holderType, shareClass: entry.shareClass, totalProceeds: paid, moic: null })
  }

  // 3. Distribute remaining pro-rata to: common + NP converters + participating preferred + option pool
  if (remaining > 0) {
    const proRataEntries = [
      ...common,
      ...preferred.filter((e) => !e.participating && npConverters.has(e.holderName + '|' + e.shareClass)),
      ...preferred.filter((e) => e.participating),
    ]
    const proRataShares = proRataEntries.reduce((s, e) => s + e.sharesIssued, 0) + (input.optionPool?.vestedShares ?? 0)
    const pricePerShare = proRataShares > 0 ? remaining / proRataShares : 0

    for (const entry of proRataEntries) {
      const proRata = pricePerShare * entry.sharesIssued
      const existing = results.find((r) => r.holderName === entry.holderName && r.shareClass === entry.shareClass)
      if (existing) {
        existing.totalProceeds += proRata
      } else {
        results.push({ holderName: entry.holderName, holderType: entry.holderType, shareClass: entry.shareClass, totalProceeds: proRata, moic: null })
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
