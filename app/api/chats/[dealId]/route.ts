// app/api/chats/[dealId]/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmChatService } from '@/lib/amocrm-chat-service'

// Типы для сообщений из amoCRM
interface AmoCrmMessage {
    id: string
    text: string
    created_at: number
    author_id: number
    author_name?: string
    is_client?: boolean
}

// Тип для чата
interface AmoCrmChat {
    id: string
    chat_id?: string
    entity_id: number
    entity_type: string
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ dealId: string }> }
) {
    try {
        const { dealId } = await params
        console.log('[CHAT API] Fetching chat for deal:', dealId)

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)
        const dealIdNum = parseInt(dealId)

        const chatService = new AmoCrmChatService()

        // Получаем чат для сделки
        console.log('[CHAT API] Getting chat for deal:', dealIdNum)
        const chats = await chatService.getDealChat(dealIdNum)
        const chat = chats[0] as AmoCrmChat | undefined

        if (!chat) {
            console.log('[CHAT API] No chat found for deal:', dealIdNum)
            return NextResponse.json({ messages: [] })
        }

        console.log('[CHAT API] Found chat:', chat.id)

        // Получаем сообщения чата
        const messages = await chatService.getChatMessages(chat.id) as AmoCrmMessage[]
        console.log(`[CHAT API] Found ${messages.length} messages`)

        // Обогащаем сообщения информацией об авторах
        const enrichedMessages = messages.map((msg: AmoCrmMessage) => ({
            id: msg.id,
            text: msg.text,
            created_at: msg.created_at,
            author_id: msg.author_id,
            author_name: msg.author_id === user.id ? 'Вы' : 'Клиент',
            is_client: msg.author_id !== user.id
        }))

        return NextResponse.json({ messages: enrichedMessages })

    } catch (error) {
        console.error('[CHAT API] Error fetching chat:', error)
        return NextResponse.json(
            { error: 'Failed to fetch chat' },
            { status: 500 }
        )
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ dealId: string }> }
) {
    try {
        const { dealId } = await params
        const body = await request.json()
        const { text } = body

        console.log('[CHAT API] Sending message to deal:', dealId, 'Text:', text)

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)
        const dealIdNum = parseInt(dealId)

        if (!text || !text.trim()) {
            return NextResponse.json(
                { error: 'Message text is required' },
                { status: 400 }
            )
        }

        const chatService = new AmoCrmChatService()

        // Получаем чат для сделки
        console.log('[CHAT API] Getting chat for deal:', dealIdNum)
        const chats = await chatService.getDealChat(dealIdNum)
        const existingChat = chats[0] as AmoCrmChat | undefined

        if (!existingChat) {
            return NextResponse.json(
                { error: 'Chat not found. Please create chat first.' },
                { status: 404 }
            )
        }

        console.log('[CHAT API] Found chat:', existingChat.id)

        // Отправляем сообщение
        const result = await chatService.sendMessageAsUser(existingChat.id, text, user.id) as AmoCrmMessage
        console.log('[CHAT API] Message sent successfully')

        return NextResponse.json({
            success: true,
            message: {
                id: result.id,
                text: result.text,
                created_at: result.created_at,
                author_id: user.id,
                author_name: 'Вы',
                is_client: false
            }
        })

    } catch (error) {
        console.error('[CHAT API] Error sending message:', error)
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        )
    }
}