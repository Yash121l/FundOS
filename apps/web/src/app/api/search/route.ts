import { db } from '@fundos/database'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''

  const companies = await db.company.findMany({
    where: q
      ? { name: { contains: q, mode: 'insensitive' } }
      : { status: 'ACTIVE' },
    select: { id: true, name: true, slug: true, sector: true, healthStatus: true },
    orderBy: { name: 'asc' },
    take: 20,
  })

  return NextResponse.json(companies)
}
