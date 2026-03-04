// app/api/chats/[dealId]/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmChatService } from '@/lib/amocrm-chat-service'
import { AmoCrmService } from '@/lib/amocrm-service'

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

// Тип для сообщения из API чатов
interface ChatMessage {
    timestamp: number
    sender: {
        id: string
        name: string
        client_id?: string
    }
    message: {
        id: string
        type: string
        text: string
    }
}

// Тип для нового сообщения из ответа API
interface NewMessage {
    msgid: string
    conversation_id: string
    // Другие поля могут быть, но они не важны для нас
}

// Тип для ответа при отправке сообщения
interface SendMessageResponse {
    new_message?: NewMessage
}

// Простое in-memory хранилище для conversation_id
// В продакшене лучше использовать Redis или БД
const conversationStore = new Map<number, string>();

export async function POST(
    request: Request,
    { params }: { params: Promise<{ dealId: string }> }
) {
    try {
        const { dealId } = await params
        const body = await request.json()
        const { text } = body

        console.log('[CHAT API] POST - Sending message to deal:', dealId, 'Text:', text)

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)
        const dealIdNum = parseInt(dealId)

        // Получаем amojo_id пользователя
        const amoCrmService = new AmoCrmService()
        const userAmojoId = await amoCrmService.getUserAmojoId(user.id)

        if (!userAmojoId) {
            console.error('[CHAT API] Could not get user amojo_id for user:', user.id)
            return NextResponse.json(
                { error: 'Could not get user amojo_id' },
                { status: 500 }
            )
        }
        console.log('[CHAT API] Got user amojo_id:', userAmojoId)

        // Получаем информацию о сделке и контакте
        const deals = await amoCrmService.getUserDealsWithContacts(user.id) as DealWithContact[]
        const currentDeal = deals.find((d: DealWithContact) => d.id === dealIdNum)

        if (!currentDeal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
        }

        const contact = currentDeal._embedded?.contacts?.[0]
        if (!contact) {
            return NextResponse.json({ error: 'No contact found for this deal' }, { status: 400 })
        }

        // Используем сохраненный conversation_id или создаем временный
        const existingConversationId = conversationStore.get(dealIdNum);
        const conversationId = existingConversationId || `deal_${dealIdNum}`;
        console.log('[CHAT API] Using conversation_id:', conversationId);

        const chatService = new AmoCrmChatService()

        // Отправляем сообщение
        const result = await chatService.sendMessage(
            conversationId,
            text,
            user.id,
            user.name,
            userAmojoId,
            contact.id,
            contact.name
        ) as SendMessageResponse;

        console.log('[CHAT API] Send message result:', JSON.stringify(result, null, 2))

        // ВАЖНО: Сохраняем реальный conversation_id из ответа
        if (result?.new_message?.conversation_id &&
            result.new_message.conversation_id !== conversationId) {

            const realConversationId = result.new_message.conversation_id;
            conversationStore.set(dealIdNum, realConversationId);
            console.log(`[CHAT API] Saved real conversation_id for deal ${dealIdNum}: ${realConversationId}`);
        }

        return NextResponse.json({
            success: true,
            message: {
                id: result?.new_message?.msgid,
                text: text,
                created_at: Math.floor(Date.now() / 1000),
                author_id: user.id
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

export async function GET(
    request: Request,
    { params }: { params: Promise<{ dealId: string }> }
) {
    try {
        const { dealId } = await params
        const dealIdNum = parseInt(dealId)

        console.log('[CHAT API] GET - Fetching chat for deal:', dealId)

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)

        // Получаем сохраненный conversation_id
        const savedConversationId = conversationStore.get(dealIdNum);

        console.log('[CHAT API] Retrieved conversation_id from store:', savedConversationId);

        // Если нет сохраненного conversation_id, пробуем временный
        const conversationId = savedConversationId || `deal_${dealIdNum}`;
        console.log('[CHAT API] Using conversation_id:', conversationId);

        const chatService = new AmoCrmChatService()

        // Получаем сообщения чата
        console.log('[CHAT API] Getting messages for conversation:', conversationId)
        const messages = await chatService.getChatMessages(conversationId)
        console.log(`[CHAT API] Found ${messages.length} messages`)

        // Обогащаем сообщения информацией об авторах
        const enrichedMessages = messages.map((msg: ChatMessage) => ({
            id: msg.message.id,
            text: msg.message.text,
            created_at: msg.timestamp,
            author_id: msg.sender.id === `user_${user.id}` ? user.id : 0,
            author_name: msg.sender.id === `user_${user.id}` ? 'Вы' : (msg.sender.name || 'Клиент'),
            is_client: msg.sender.id !== `user_${user.id}`
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