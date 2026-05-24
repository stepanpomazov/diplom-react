// app/api/amo-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { upsertChatParticipant } from '@/lib/chatDB'

export async function POST(req: NextRequest) {
	const contentType = req.headers.get('content-type') || ''

	// Ветка на будущее: если amo когда-нибудь начнёт слать JSON по чатам
	if (contentType.includes('application/json')) {
		const body = await req.json()
		console.log('[amo-webhook] JSON body:', JSON.stringify(body, null, 2))
		return NextResponse.json({ ok: true })
	}

	// Текущий формат: application/x-www-form-urlencoded
	const text = await req.text()
	console.log('[amo-webhook] urlencoded body:', text)

	const params = new URLSearchParams(text)

	// Вытаскиваем первое сообщение из message[add][0]
	const conversationId = params.get('message[add][0][chat_id]')
	const authorId = params.get('message[add][0][author][id]')
	const msgType = params.get('message[add][0][type]')
	const createdAtStr = params.get('message[add][0][created_at]')

	if (conversationId && authorId) {
		const createdAt = createdAtStr ? Number(createdAtStr) : undefined
		const lastMessageAt =
			createdAt && !Number.isNaN(createdAt)
				? new Date(createdAt * 1000)
				: new Date()

		// Для входящих сообщений type=incoming считаем автора клиентом
		const isIncoming = msgType === 'incoming'
		const clientId = isIncoming ? authorId : null
		const managerId = isIncoming ? null : authorId

		await upsertChatParticipant({
			conversationId,
			clientId,
			managerId,
			lastMessageAt,
			rawPayload: Object.fromEntries(params.entries())
		})
	}

	return NextResponse.json({ ok: true })
}
