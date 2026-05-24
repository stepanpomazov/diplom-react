// lib/chatDb.ts
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL ?? '')

export interface ChatParticipantRecord {
	id: number
	conversation_id: string
	client_id: string | null
	manager_id: string | null
	last_message_at: string | null
	raw_payload: unknown
}

export async function upsertChatParticipant(params: {
	conversationId: string
	clientId?: string | null
	managerId?: string | null
	lastMessageAt?: Date | null
	rawPayload?: unknown
}) {
	const { conversationId, clientId, managerId, lastMessageAt, rawPayload } = params

	await sql`
        insert into chat_participants (conversation_id, client_id, manager_id, last_message_at, raw_payload)
        values (
                   ${conversationId},
                   ${clientId ?? null},
                   ${managerId ?? null},
                   ${lastMessageAt ?? null},
                   ${rawPayload ?? null}
               )
            on conflict (conversation_id) do update set
            client_id = excluded.client_id,
                                                 manager_id = excluded.manager_id,
                                                 last_message_at = excluded.last_message_at,
                                                 raw_payload = excluded.raw_payload
	`
}

export async function getClientIdByConversation(conversationId: string) {
	const rows = await sql`
        select client_id from chat_participants
        where conversation_id = ${conversationId}
            limit 1
	`

	// Необязательное приведение типа, если хочешь подсказки в IDE
	const typedRows = rows as unknown as Array<Pick<ChatParticipantRecord, 'client_id'>>

	return typedRows[0]?.client_id ?? null
}
