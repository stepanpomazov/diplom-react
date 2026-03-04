// app/api/chats/send/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmChatService } from '@/lib/amocrm-chat-service'
import { AmoCrmService } from '@/lib/amocrm-service'

interface DealWithContacts {
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

export async function POST(request: Request) {
    try {
        const body = await request.json()
        console.log('[CHAT SEND] ===== START =====')
        console.log('[CHAT SEND] Request body:', body)

        const { dealId, text, userId } = body
        console.log('[CHAT SEND] Params:', { dealId, text, userId })

        // Проверяем обязательные поля
        if (!dealId || !text || !userId) {
            console.log('[CHAT SEND] Missing required fields:', { dealId, text, userId })
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')
        console.log('[CHAT SEND] User cookie exists:', !!userCookie)

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)
        console.log('[CHAT SEND] Authenticated user:', user)

        const chatService = new AmoCrmChatService()

        // 1. Пытаемся получить существующий чат
        console.log('[CHAT SEND] Getting chat for deal:', dealId)
        const chats = await chatService.getDealChat(dealId)
        console.log('[CHAT SEND] Found chats:', chats.length)

        let chat = chats[0] as { id: string } | undefined

        // 2. Если чата нет - создаем новый
        if (!chat) {
            console.log('[CHAT SEND] No chat found, will create new one')

            // Получаем информацию о сделке
            console.log('[CHAT SEND] Getting deal info for user:', user.id)
            const amoCrmService = new AmoCrmService()
            const deals = await amoCrmService.getUserDealsWithContacts(user.id) as DealWithContacts[]
            console.log('[CHAT SEND] Found deals:', deals.length)

            const currentDeal = deals.find((d: DealWithContacts) => d.id === dealId)
            console.log('[CHAT SEND] Current deal found:', !!currentDeal)

            if (currentDeal) {
                console.log('[CHAT SEND] Deal details:', {
                    id: currentDeal.id,
                    name: currentDeal.name,
                    contacts: currentDeal._embedded?.contacts
                })
            }

            const contactId = currentDeal?._embedded?.contacts?.[0]?.id
            console.log('[CHAT SEND] Contact ID:', contactId)

            if (!contactId) {
                console.log('[CHAT SEND] No contact found for deal')
                return NextResponse.json(
                    { error: 'Cannot create chat: no contact found for this deal' },
                    { status: 400 }
                )
            }

            // Создаем новый чат
            console.log('[CHAT SEND] Creating chat with contact:', contactId)
            const newChat = await chatService.createChat(dealId, contactId, 'chat')
            console.log('[CHAT SEND] Create chat response:', newChat)

            if (!newChat || !newChat.id) {
                console.log('[CHAT SEND] Failed to create chat - no ID returned')
                return NextResponse.json(
                    { error: 'Failed to create chat' },
                    { status: 500 }
                )
            }

            chat = { id: newChat.id }
            console.log('[CHAT SEND] Chat created successfully:', chat.id)
        }

        // 3. Отправляем сообщение
        console.log('[CHAT SEND] Sending message to chat:', chat.id)
        const result = await chatService.sendMessageAsUser(chat.id, text, userId)
        console.log('[CHAT SEND] Send message result:', result)

        console.log('[CHAT SEND] ===== SUCCESS =====')
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
        console.error('[CHAT SEND] ===== ERROR =====')
        console.error('[CHAT SEND] Error details:', error)
        if (error instanceof Error) {
            console.error('[CHAT SEND] Error name:', error.name)
            console.error('[CHAT SEND] Error message:', error.message)
            console.error('[CHAT SEND] Error stack:', error.stack)
        }
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        )
    }
}