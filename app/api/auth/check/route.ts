// app/api/deal/[dealId]/messages/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ dealId: string }> }
) {
    try {
        const { dealId } = await params
        const dealIdNum = parseInt(dealId)

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')
        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const sessionId = cookieStore.get('session_id')?.value
        const session = cookieStore.get('session')?.value
        const csrfToken = cookieStore.get('csrftoken')?.value

        if (!sessionId || !session || !csrfToken) {
            return NextResponse.json({ error: 'Missing cookies' }, { status: 401 })
        }

        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'
        const cookieString = `session_id=${sessionId}; session=${session}; csrftoken=${csrfToken}`

        console.log('[MESSAGES API] Fetching chat for deal:', dealIdNum)

        // 1. Получаем chat_id
        const chatsResponse = await fetch(
            `https://${subdomain}.amocrm.ru/ajax/v4/leads/${dealIdNum}/chats?page=1&limit=5000`,
            {
                headers: {
                    'Cookie': cookieString,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }
        )

        if (!chatsResponse.ok) {
            console.log('[MESSAGES API] Chats API failed:', chatsResponse.status)
            return NextResponse.json({ messages: [] })
        }

        const chatsData = await chatsResponse.json()
        const chats = chatsData._embedded?.chats || []

        if (chats.length === 0) {
            return NextResponse.json({ messages: [] })
        }

        const chatId = chats[0].chat_id
        console.log('[MESSAGES API] Found chat:', chatId)

        // 2. Получаем информацию о чате
        const talksResponse = await fetch(
            `https://${subdomain}.amocrm.ru/ajax/v2/talks`,
            {
                method: 'POST',
                headers: {
                    'Cookie': cookieString,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'chats_ids[]': [chatId]
                })
            }
        )

        console.log('[MESSAGES API] Talks response status:', talksResponse.status)

        // 204 - успех, но нет сообщений
        if (talksResponse.status === 204) {
            return NextResponse.json({
                messages: [],
                chat: {
                    id: chatId,
                    has_messages: false
                }
            })
        }

        // Если есть тело ответа, пробуем его прочитать
        if (talksResponse.ok) {
            const text = await talksResponse.text()
            if (text) {
                try {
                    const data = JSON.parse(text)
                    return NextResponse.json({
                        messages: [],
                        chat: {
                            id: chatId,
                            data: data
                        }
                    })
                } catch {
                    // Не JSON, игнорируем
                }
            }
        }

        return NextResponse.json({
            messages: [],
            chat: {
                id: chatId
            }
        })

    } catch (error) {
        console.error('[MESSAGES API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch messages' },
            { status: 500 }
        )
    }
}
