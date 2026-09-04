import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { FALLBACK_QUOTES } from '@/lib/quotes';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const difficulty = parseInt(searchParams.get('difficulty') || '2', 10);
  const id = searchParams.get('id');

  if (id) {
    try {
      const result = await sql`SELECT * FROM quotes WHERE id = ${id}`;
      if (result[0]) return NextResponse.json(result[0]);
    } catch {
      // Fall through to fallback
    }
    const fallback = FALLBACK_QUOTES.find((q: { id: string }) => q.id === id);
    if (fallback) return NextResponse.json(fallback);
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  try {
    const result = await sql`
      SELECT * FROM quotes 
      WHERE difficulty = ${difficulty}
      ORDER BY RANDOM() 
      LIMIT 1
    `;
    if (result[0]) return NextResponse.json(result[0]);
  } catch {
    // Fall through to fallback
  }

  const fallback = FALLBACK_QUOTES.filter((q: { difficulty: number }) => q.difficulty === difficulty);
  if (fallback.length > 0) {
    return NextResponse.json(fallback[Math.floor(Math.random() * fallback.length)]);
  }

  return NextResponse.json(FALLBACK_QUOTES[0]);
}