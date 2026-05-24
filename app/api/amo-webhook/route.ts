// app/api/amo-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { upsertChatParticipant } from '@/lib/chatDB'

export async function POST(req: NextRequest) {
	const contentType = req.headers.get('content-type') || ''

	// Если amoCRM шлёт JSON (chat-webhooks)
	if (contentType.includes('application/json')) {
		const body = await req.json()

		console.log('[amo-webhook] JSON body:', JSON.stringify(body, null, 2))

		const { event_type, payload } = body

		if (event_type === 'new_message' && payload) {
			const conversationId = payload.conversation_id as string
			const senderId = payload.sender?.id as string | undefined
			const receiverId = payload.receiver?.id as string | undefined

			const ts = payload.message?.created_at ?? payload.timestamp
			const lastMessageAt =
				typeof ts === 'number' ? new Date(ts * 1000) : new Date()

			// считаем: входящее сообщение → sender = клиент
			await upsertChatParticipant({
				conversationId,
				clientId: senderId,
				managerId: receiverId,
				lastMessageAt,
				rawPayload: payload
			})
		}

		return NextResponse.json({ ok: true })
	}

	// Если это старый глобальный WebHook amoCRM (urlencoded)
	const text = await req.text()
	console.log('[amo-webhook] urlencoded body:', text)

	// На первое время просто подтверждаем приём, чтобы amoCRM не ругался
	return NextResponse.json({ ok: true })
}
