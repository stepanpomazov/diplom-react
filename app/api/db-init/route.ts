// app/api/db-init/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL ?? '')

export async function GET(req: NextRequest) {
	await sql`
    create table if not exists chat_participants (
      id serial primary key,
      conversation_id text not null unique,
      client_id text,
      manager_id text,
      last_message_at timestamptz,
      raw_payload jsonb
    );
  `

	return NextResponse.json({ ok: true })
}
