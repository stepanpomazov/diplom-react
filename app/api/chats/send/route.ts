// app/api/chats/send/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmChatService } from '@/lib/amocrm-chat-service'
import { AmoCrmService } from '@/lib/amocrm-service'

// Тип для сделки с контактами
interface DealWithContacts {
    id: number
    name: string
    price: number
    _embedded?: {
        contacts?: Array<{
            id: number
            name: string
        }>
        companies?: Array<{
            id: number
            name: string
        }>
    }
}

// Тип для ответа при создании чата
interface ChatResponse {
    id: string
    chat_id?: string
}

export async function POST(request: Request) {
    try {
        const { dealId, text, userId } = await request.json()
        console.log('[CHAT SEND] Sending message:', { dealId, text, userId })

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)
        const chatService = new AmoCrmChatService()

        // 1. Сначала пытаемся получить существующий чат
        const chats = await chatService.getDealChat(dealId)
        let chat = chats[0] as { id: string } | undefined

        // 2. Если чата нет - создаем новый
        if (!chat) {
            console.log('[CHAT SEND] No chat found, creating new one for deal:', dealId)

            // Получаем информацию о сделке, чтобы найти contactId
            const amoCrmService = new AmoCrmService()
            const deals = await amoCrmService.getUserDealsWithContacts(user.id) as DealWithContacts[]
            const currentDeal = deals.find((d: DealWithContacts) => d.id === dealId)

            // Пробуем найти contactId из сделки
            const contactId = currentDeal?._embedded?.contacts?.[0]?.id

            if (!contactId) {
                console.log('[CHAT SEND] No contact found for deal:', dealId)
                return NextResponse.json(
                    { error: 'Cannot create chat: no contact found for this deal' },
                    { status: 400 }
                )
            }

            // Создаем новый чат
            const newChat = await chatService.createChat(dealId, contactId, 'chat') as ChatResponse
            if (!newChat || !newChat.id) {
                return NextResponse.json(
                    { error: 'Failed to create chat' },
                    { status: 500 }
                )
            }

            chat = { id: newChat.id }
            console.log('[CHAT SEND] Chat created:', chat.id)
        }

        // 3. Отправляем сообщение
        console.log('[CHAT SEND] Sending message to chat:', chat.id)
        const result = await chatService.sendMessageAsUser(chat.id, text, userId)

        return NextResponse.json({
            success: true,
            message: {
                id: result.id,
                text: result.text,
                created_at: result.created_at,
                author_id: userId
            }
        })

    } catch (error) {
        console.error('[CHAT SEND] Error:', error)
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        )
    }
}