// app/api/chats/webhook/[scope_id]/route.ts
import { NextResponse } from 'next/server'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ scope_id: string }> }  // ← исправлено: scope_id
) {
    try {
        const { scope_id } = await params  // ← исправлено: scope_id
        const body = await request.json()

        console.log('[WEBHOOK] ===== RECEIVED =====')
        console.log('[WEBHOOK] Scope:', scope_id)
        console.log('[WEBHOOK] Event:', body.event_type)
        console.log('[WEBHOOK] Payload:', JSON.stringify(body.payload, null, 2))

        if (body.event_type === 'new_message' && body.payload) {
            const chatId = body.payload.conversation_id
            const message = {
                id: body.payload.msgid || `msg_${Date.now()}`,
                text: body.payload.message?.text || '',
                created_at: body.payload.timestamp || Math.floor(Date.now() / 1000),
                author_name: body.payload.sender?.name || 'Клиент',
                is_client: true,
                sender_id: body.payload.sender?.id
            }

            // Сохраняем через наш новый endpoint
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            await fetch(`${baseUrl}/api/chats/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, message })
            })

            console.log(`[WEBHOOK] ✅ Saved message for chat ${chatId}: "${message.text}"`)
        }

        return NextResponse.json({ status: 'ok' })

    } catch (error) {
        console.error('[WEBHOOK] Error:', error)
        return NextResponse.json(
            { error: 'Internal error' },
            { status: 500 }
        )
    }
}
