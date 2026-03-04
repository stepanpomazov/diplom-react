// app/api/chats/[dealId]/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmChatService } from '@/lib/amocrm-chat-service'
import { AmoCrmService } from '@/lib/amocrm-service'

// Типы для ответов от API чатов
interface ChatMessageSender {
    id: string
    name: string
    client_id?: string
    avatar?: string
}

interface ChatMessage {
    timestamp: number
    sender: ChatMessageSender
    message: {
        id: string
        type: string
        text: string
    }
}

interface ChatMessageResponse {
    messages: ChatMessage[]
}

// Тип для сделки с контактами
interface DealWithContact {
    id: number
    name: string
    price: number
    _embedded?: {
        contacts?: Array<{
            id: number
            name: string
        }>
    }
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

        // Генерируем conversation_id на основе сделки
        const conversationId = `deal_${dealIdNum}`

        const chatService = new AmoCrmChatService()

        // Получаем сообщения чата
        console.log('[CHAT API] Getting messages for conversation:', conversationId)
        const response = await chatService.getChatMessages(conversationId) as ChatMessageResponse
        const messages = response?.messages || []
        console.log(`[CHAT API] Found ${messages.length} messages`)

        // Обогащаем сообщения информацией об авторах
        const enrichedMessages = messages.map((msg: ChatMessage) => ({
            id: msg.message.id,
            text: msg.message.text,
            created_at: msg.timestamp,
            author_id: msg.sender.id === user.id.toString() ? user.id : 0,
            author_name: msg.sender.id === user.id.toString() ? 'Вы' : (msg.sender.name || 'Клиент'),
            is_client: msg.sender.id !== user.id.toString()
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

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)
        const dealIdNum = parseInt(dealId)

        // Получаем информацию о контакте из сделки
        const amoCrmService = new AmoCrmService()

        // 1. Получаем amojo_id пользователя АВТОМАТИЧЕСКИ!
        const userAmojoId = await amoCrmService.getUserAmojoId(user.id)

        if (!userAmojoId) {
            console.error('[CHAT API] Could not get user amojo_id for user:', user.id)
            return NextResponse.json(
                { error: 'Could not get user amojo_id' },
                { status: 500 }
            )
        }

        // 2. Получаем сделку и контакт
        const deals = await amoCrmService.getUserDealsWithContacts(user.id) as DealWithContact[]
        const currentDeal = deals.find((d: DealWithContact) => d.id === dealIdNum)

        if (!currentDeal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
        }

        const contact = currentDeal._embedded?.contacts?.[0]
        if (!contact) {
            return NextResponse.json({ error: 'No contact found' }, { status: 400 })
        }

        const conversationId = `deal_${dealIdNum}`
        const chatService = new AmoCrmChatService()

        // 3. Отправляем сообщение с автоматически полученным amojo_id
        const result = await chatService.sendMessage(
            conversationId,
            text,
            user.id,
            user.name,
            userAmojoId,  // Передаем полученный amojo_id!
            contact.id,
            contact.name
        )

        return NextResponse.json({
            success: true,
            message: {
                id: result?.msgid,
                text: text,
                created_at: Math.floor(Date.now() / 1000),
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