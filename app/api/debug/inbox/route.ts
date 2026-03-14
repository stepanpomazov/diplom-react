// app/api/deal/[dealId]/messages/route.ts - исправленная версия
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

        // Пробуем получить токены разными способами
        const accessToken = cookieStore.get('access_token')?.value
        const sessionId = cookieStore.get('session_id')?.value
        const session = cookieStore.get('session')?.value
        const csrfToken = cookieStore.get('csrftoken')?.value

        console.log('[MESSAGES API] Auth check:', {
            hasAccessToken: !!accessToken,
            hasSessionId: !!sessionId,
            hasSession: !!session,
            hasCsrfToken: !!csrfToken
        })

        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'

        // 1. Сначала пробуем через v4 API с access_token
        if (accessToken) {
            console.log('[MESSAGES API] Trying v4 API with access token')

            const talksResponse = await fetch(
                `https://${subdomain}.amocrm.ru/api/v4/talks?filter[entity_id]=${dealIdNum}&filter[entity_type]=lead`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                }
            )

            console.log('[MESSAGES API] v4 Response status:', talksResponse.status)

            if (talksResponse.ok) {
                const talksData = await talksResponse.json()
                console.log('[MESSAGES API] v4 Success:', talksData)

                const talks = talksData._embedded?.talks || []
                if (talks.length > 0) {
                    const talk = talks[0]
                    return NextResponse.json({
                        messages: [],
                        talk: {
                            id: talk.talk_id,
                            chat_id: talk.chat_id,
                            origin: talk.origin,
                            entity_id: talk.entity_id,
                            entity_type: talk.entity_type
                        }
                    })
                }
            }
        }

        // 2. Если v4 не работает, пробуем через AJAX endpoint с куками
        if (sessionId && session && csrfToken) {
            console.log('[MESSAGES API] Trying AJAX endpoint with cookies')

            const cookieString = `session_id=${sessionId}; session=${session}; csrftoken=${csrfToken}`

            // Сначала получаем chat_id через v4 AJAX
            const chatsResponse = await fetch(
                `https://${subdomain}.amocrm.ru/ajax/v4/leads/${dealIdNum}/chats?page=1&limit=5000`,
                {
                    headers: {
                        'Cookie': cookieString,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                }
            )

            if (chatsResponse.ok) {
                const chatsData = await chatsResponse.json()
                const chats = chatsData._embedded?.chats || []

                if (chats.length > 0) {
                    const chatId = chats[0].chat_id
                    console.log('[MESSAGES API] Found chat via AJAX:', chatId)

                    return NextResponse.json({
                        messages: [],
                        chat: {
                            id: chatId,
                            entity_id: chats[0].entity_id,
                            entity_type: chats[0].entity_type
                        }
                    })
                }
            }
        }

        // 3. Если ничего не работает, возвращаем пустой результат
        return NextResponse.json({
            messages: [],
            debug: {
                hasAccessToken: !!accessToken,
                hasSessionId: !!sessionId,
                hasSession: !!session,
                hasCsrfToken: !!csrfToken
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
