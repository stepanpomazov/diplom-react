// app/api/chats/messages/route.ts
import { NextResponse } from 'next/server'

// Глобальная переменная (сбрасывается при перезапуске сервера)
declare global {
    var messageStore: Map<string, any[]>
}

if (!global.messageStore) {
    global.messageStore = new Map()
}

const messageStore = global.messageStore

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const chatId = searchParams.get('chatId')

        console.log('[MESSAGES STORE] Getting messages for chat:', chatId)

        if (!chatId) {
            return NextResponse.json({ messages: [] })
        }

        const messages = messageStore.get(chatId) || []
        console.log(`[MESSAGES STORE] Found ${messages.length} messages`)

        return NextResponse.json({ messages })

    } catch (error) {
        console.error('[MESSAGES STORE] Error:', error)
        return NextResponse.json({ messages: [] })
    }
}

export async function POST(request: Request) {
    try {
        const { chatId, message } = await request.json()

        console.log('[MESSAGES STORE] ===== SAVING =====')
        console.log('[MESSAGES STORE] Chat ID:', chatId)
        console.log('[MESSAGES STORE] Message:', message)

        if (!messageStore.has(chatId)) {
            messageStore.set(chatId, [])
        }

        const newMessage = {
            id: message.id || `msg_${Date.now()}`,
            text: message.text,
            created_at: message.created_at || Math.floor(Date.now() / 1000),
            author_name: message.author_name || 'Пользователь',
            is_client: message.is_client || false,
            ...message
        }

        messageStore.get(chatId)!.push(newMessage)
        console.log(`[MESSAGES STORE] Saved. Total messages: ${messageStore.get(chatId)!.length}`)

        return NextResponse.json({ success: true, message: newMessage })

    } catch (error) {
        console.error('[MESSAGES STORE] Error:', error)
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }
}
