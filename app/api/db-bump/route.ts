// app/api/db-dump/route.ts
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL ?? '')

export async function GET() {
	const rows = await sql`
    select *
    from chat_participants
    order by id desc
    limit 20
  `
	return NextResponse.json(rows)
}
