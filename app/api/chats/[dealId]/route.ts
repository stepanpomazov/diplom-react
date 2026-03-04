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

// Тип для примечания из CRM
interface CrmNote {
    id: number
    text: string
    created_at: number
    created_by: string
    entity_id: number
    entity_type: string
}

// Тип для ответа API с примечаниями
interface NotesResponse {
    _embedded?: {
        notes?: CrmNote[]
    }
}

// Тип для нового сообщения из ответа API
interface NewMessage {
    msgid: string
    conversation_id: string
}

// Тип для ответа при отправке сообщения
interface SendMessageResponse {
    new_message?: NewMessage
}

// Простое in-memory хранилище для conversation_id
const conversationStore = new Map<number, string>();

export async function GET(
    request: Request,
    { params }: { params: Promise<{ dealId: string }> }
) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'chat'
        const { dealId } = await params
        const dealIdNum = parseInt(dealId)

        console.log(`[CHAT API] GET - Fetching ${type} for deal:`, dealId)

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')
        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)

        // Если запрашиваем примечания
        if (type === 'notes') {
            try {
                console.log('[CHAT API] Fetching notes for deal:', dealIdNum)

                // Используем публичный метод getUserDeals или создаем отдельный метод для заметок
                const response = await fetch(
                    `https://${process.env.AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4/leads/${dealIdNum}/notes`,
                    {
                        headers: {
                            'Authorization': `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
                            'Content-Type': 'application/json'
                        }
                    }
                )

                if (!response.ok) {

                }

                const notesData = await response.json() as NotesResponse
                const notes = notesData?._embedded?.notes || []

                console.log(`[CHAT API] Found ${notes.length} notes`)

                // Форматируем примечания
                const formattedNotes = notes.map((note: any) => {
                    // Текст может быть в разных полях
                    const noteText = note.params?.text || note.text || '';

                    return {
                        id: note.id.toString(),
                        text: noteText,
                        created_at: note.created_at,
                        author_name: note.created_by === user.id ? 'Вы' : 'Система'
                    };
                });

                return NextResponse.json({ notes: formattedNotes })

            } catch (error) {
                console.error('[CHAT API] Error fetching notes:', error)
                return NextResponse.json(
                    { error: 'Failed to fetch notes' },
                    { status: 500 }
                )
            }
        }
        // Если запрашиваем чат
        else {
            try {
                // Получаем сохраненный conversation_id
                const savedConversationId = conversationStore.get(dealIdNum)
                const conversationId = savedConversationId || `deal_${dealIdNum}`

                console.log('[CHAT API] Getting messages for conversation:', conversationId)

                const chatService = new AmoCrmChatService()
                const messages = await chatService.getChatMessages(conversationId) as ChatMessage[]

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
                console.error('[CHAT API] Error fetching messages:', error)
                return NextResponse.json(
                    { error: 'Failed to fetch messages' },
                    { status: 500 }
                )
            }
        }

    } catch (error) {
        console.error('[CHAT API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch data' },
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
        const { text, type } = body
        const dealIdNum = parseInt(dealId)

        console.log(`[CHAT API] POST - Sending ${type} to deal:`, dealId, 'Text:', text)

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)
        const amoCrmService = new AmoCrmService()

        // Если создаем примечание
        // Если создаем примечание
        if (type === 'notes') {
            try {
                console.log('[CHAT API] Creating note for deal:', dealIdNum);

                const response = await fetch(
                    `https://${process.env.AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4/leads/${dealIdNum}/notes`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify([{
                            entity_id: dealIdNum,
                            entity_type: 'leads',
                            note_type: "common",
                            text: text,
                            params: {}
                        }])
                    }
                );

                // Получаем ответ от CRM
                const responseText = await response.text();
                console.log('[CHAT API] Create note response status:', response.status);
                console.log('[CHAT API] Create note response body:', responseText);

                // Проверяем статус ответа
                if (!response.ok) {
                    console.error('[CHAT API] Failed to create note:', response.status, responseText);
                    return NextResponse.json(
                        {
                            error: 'Failed to create note',
                            status: response.status,
                            details: responseText
                        },
                        { status: response.status }
                    );
                }

                // Парсим ответ CRM
                let responseData;
                try {
                    responseData = JSON.parse(responseText);
                } catch (_) {
                    console.error('[CHAT API] Failed to parse response:', responseText);
                    return NextResponse.json(
                        { error: 'Invalid JSON response from CRM', text: responseText },
                        { status: 500 }
                    );
                }

                // Получаем ID созданного примечания из ответа
                const createdNote = responseData._embedded?.notes?.[0];

                console.log('[CHAT API] Note created successfully, ID:', createdNote?.id);

                return NextResponse.json({
                    success: true,
                    note: {
                        id: createdNote?.id?.toString() || Date.now().toString(),
                        text: text,
                        created_at: Math.floor(Date.now() / 1000)
                    }
                });

            } catch (error) {
                console.error('[CHAT API] Error creating note:', error);
                return NextResponse.json(
                    {
                        error: 'Failed to create note',
                        details: error instanceof Error ? error.message : String(error)
                    },
                    { status: 500 }
                );
            }
        }
        // Если отправляем сообщение в чат
        else {
            try {
                // Получаем amojo_id пользователя
                const userAmojoId = await amoCrmService.getUserAmojoId(user.id)

                if (!userAmojoId) {
                    console.error('[CHAT API] Could not get user amojo_id for user:', user.id)
                    return NextResponse.json(
                        { error: 'Could not get user amojo_id' },
                        { status: 500 }
                    )
                }

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
                const existingConversationId = conversationStore.get(dealIdNum)
                const conversationId = existingConversationId || `deal_${dealIdNum}`

                console.log('[CHAT API] Using conversation_id:', conversationId)

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
                ) as SendMessageResponse

                console.log('[CHAT API] Send message result:', JSON.stringify(result, null, 2))

                // Сохраняем реальный conversation_id из ответа
                if (result?.new_message?.conversation_id &&
                    result.new_message.conversation_id !== conversationId) {

                    const realConversationId = result.new_message.conversation_id
                    conversationStore.set(dealIdNum, realConversationId)
                    console.log(`[CHAT API] Saved real conversation_id for deal ${dealIdNum}: ${realConversationId}`)
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

    } catch (error) {
        console.error('[CHAT API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        )
    }
}