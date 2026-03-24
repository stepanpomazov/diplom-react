// app/api/chats/[chatId]/messages/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { chatId } = await params

        if (!chatId) {
            return NextResponse.json(
                { error: 'chatId is required' },
                { status: 400 }
            )
        }

        const cookieStore = await cookies()
        const cookieString = cookieStore.toString()

        // 1. Получаем deal_id по chat_id
        const inboxUrl = `https://bociwoto.amocrm.ru/ajax/v4/inbox/list?limit=100&order[sort_by]=last_message_at&order[sort_type]=desc`

        const inboxResponse = await fetch(inboxUrl, {
            headers: {
                'Cookie': cookieString,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })

        if (!inboxResponse.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch inbox' },
                { status: inboxResponse.status }
            )
        }

        const inboxData = await inboxResponse.json()
        const talks = inboxData._embedded?.talks || []
        const talk = talks.find((t: any) => t.chat_id === chatId)

        if (!talk) {
            return NextResponse.json(
                { error: 'Chat not found', chat_id: chatId },
                { status: 404 }
            )
        }

        const dealId = talk.entity.id

        // 2. Получаем сообщения через events_timeline
        const eventsUrl = `https://bociwoto.amocrm.ru/ajax/v3/leads/${dealId}/events_timeline/?limit=200&filter[type]=89,90`

        const eventsResponse = await fetch(eventsUrl, {
            headers: {
                'Cookie': cookieString,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })

        if (!eventsResponse.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch messages' },
                { status: eventsResponse.status }
            )
        }

        const eventsData = await eventsResponse.json()
        const items = eventsData._embedded?.items || []

        // 3. Форматируем сообщения
        const messages = items
            .filter((item: any) => item.type === 89 || item.type === 90)
            .filter((item: any) => item.data?.chat_id === chatId)
            .map((item: any) => {
                const isIncoming = item.type === 89
                const messageData = item.data

                return {
                    id: messageData.id || item.id,
                    text: messageData.message?.text || messageData.text || '',
                    created_at: item.date_create,
                    author_name: isIncoming
                        ? messageData.author?.name || messageData.recipient?.name || 'Клиент'
                        : messageData.author?.name || 'Менеджер',
                    is_client: isIncoming,
                    author_id: isIncoming ? 0 : (messageData.author?.id || item.created_by),
                    chat_id: messageData.chat_id
                }
            })
            .sort((a: any, b: any) => a.created_at - b.created_at)

        return NextResponse.json({
            messages,
            total: messages.length,
            chat_id: chatId,
            deal_id: dealId
        })

    } catch (error: any) {
        console.error('[Messages] Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
