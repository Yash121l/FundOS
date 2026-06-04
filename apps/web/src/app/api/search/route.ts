import { db } from '@fundos/database'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('q') ?? ''
    const q = raw.trim().slice(0, 100)

    const companies = await db.company.findMany({
      where: q
        ? { name: { contains: q, mode: 'insensitive' }, status: 'ACTIVE' }
        : { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, sector: true, healthStatus: true },
      orderBy: { name: 'asc' },
      take: 20,
    })

    return NextResponse.json(companies)
  } catch (error) {
    console.error('[API] Search failed:', error)
    return NextResponse.json({ error: 'Search unavailable' }, { status: 500 })
  }
}
