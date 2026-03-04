// app/api/chats/send/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AmoCrmChatService } from "@/lib/amocrm-chat-service";
import { AmoCrmService } from "@/lib/amocrm-service";

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
    }
}

export async function POST(request: Request) {
    try {
        const { dealId, text, userId } = await request.json()
        console.log('[CHAT SEND] Starting...', { dealId, text, userId })

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)
        const chatService = new AmoCrmChatService()
        const amoCrmService = new AmoCrmService()

        // 1. Получаем чат
        const chats = await chatService.getDealChat(dealId)
        console.log('[CHAT SEND] Found chats:', chats.length)

        let chat = chats[0]

        // 2. Если чата нет - создаем с реальным contactId
        if (!chat) {
            console.log('[CHAT SEND] No chat found, getting contact info...')

            // Получаем информацию о сделке, чтобы найти contactId
            console.log('[CHAT SEND] Getting deal info for user:', user.id)
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

            // Получаем contactId из сделки
            const contactId = currentDeal?._embedded?.contacts?.[0]?.id

            if (!contactId) {
                console.log('[CHAT SEND] No contact found for deal')
                return NextResponse.json(
                    { error: 'Cannot create chat: no contact found for this deal' },
                    { status: 400 }
                )
            }

            console.log('[CHAT SEND] Found contact ID:', contactId)

            // Создаем новый чат с реальным contactId
            console.log('[CHAT SEND] Creating chat with contact:', contactId)
            const newChat = await chatService.createChat(dealId, contactId)
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
        console.log('[CHAT SEND] Message sent:', result)

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
        if (error instanceof Error) {
            console.error('[CHAT SEND] Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            })
        }
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        )
    }
}