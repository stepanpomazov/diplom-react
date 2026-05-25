// app/api/chats/[chatId]/send/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getClientIdByConversation } from '@/lib/chatDB'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { chatId } = await params
        const { text } = await request.json()

        if (!text?.trim()) {
            return NextResponse.json(
                { error: 'Message text is required' },
                { status: 400 }
            )
        }

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            )
        }

        const user = JSON.parse(userCookie.value)
        const allCookies = cookieStore.toString()

        const authToken = process.env.AMOCRM_X_AUTH_TOKEN

        if (!authToken) {
            return NextResponse.json(
                { error: 'Missing auth token' },
                { status: 500 }
            )
        }

        const subdomain = process.env.AMOCRM_SUBDOMAIN
        const amojoId =
            process.env.AMOCRM_AMOJO_ID || '02a3e344-9bc0-4b0c-95a0-aa2f7d747314'
        const accountId = 32967126

        // 1. Получаем информацию о чате из inbox
        const inboxUrl = `https://${subdomain}.amocrm.ru/ajax/v4/inbox/list?limit=100&order[sort_by]=last_message_at&order[sort_type]=desc`

        const inboxResponse = await fetch(inboxUrl, {
            headers: {
                Cookie: allCookies,
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json'
            }
        })

        if (!inboxResponse.ok) {
            return NextResponse.json(
                { error: 'Failed to get chat info' },
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
        const contactId = talk.contact_id
        const crmDialogId = talk.id

        // 2. Сначала пробуем старый способ: recipient_id из URL аватара
        let recipientId: string | null = null

        if (talk.contact?.profile_avatar) {
            const match = talk.contact.profile_avatar.match(
                /\/profiles\/([a-f0-9-]+)\//i
            )
            if (match) {
                recipientId = match[1]
            }
        }

        console.log('[SEND] recipientId from avatar:', recipientId)

        // 3. Fallback: если из аватарки не получилось, берём client_id из Neon
        if (!recipientId) {
            const dbClientId = await getClientIdByConversation(chatId)
            console.log('[SEND] recipientId from DB:', dbClientId)
            if (dbClientId) {
                recipientId = dbClientId
            }
        }

        if (!recipientId) {
            return NextResponse.json(
                {
                    error:
                        'Recipient ID not found (no Amojo UUID in avatar and no client_id from webhook)'
                },
                { status: 404 }
            )
        }

        const amojoUrl = `https://amojo.amocrm.ru/v1/chats/${amojoId}/${chatId}/messages?with_video=true&stand=v16`

        const body = {
            silent: false,
            priority: 'low',
            crm_entity: {
                id: dealId,
                type: 2
            },
            persona_name: user.name || 'Менеджер',
            persona_avatar:
                'https://images.amocrm.ru/frontend/images/interface/avatars/1.jpeg',
            text: text.trim(),
            recipient_id: recipientId,
            group_id: null,
            crm_dialog_id: crmDialogId,
            crm_contact_id: contactId,
            crm_account_id: accountId,
            skip_link_shortener: false,
            set_personalization: false
        }

        console.log('[SEND] Body:', JSON.stringify(body, null, 2))

        const response = await fetch(amojoUrl, {
            method: 'POST',
            headers: {
                accept: 'application/json, text/javascript, */*; q=0.01',
                'accept-language': 'ru,en;q=0.9',
                'cache-control': 'no-cache',
                'content-type': 'application/json',
                pragma: 'no-cache',
                'x-auth-token': authToken,
                'sec-ch-ua':
                    '"Not(A:Brand";v="8", "Chromium";v="144", "YaBrowser";v="26.3", "Yowser";v="2.5"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site'
            },
            referrer: `https://${subdomain}.amocrm.ru/`,
            body: JSON.stringify(body)
        })

        const responseText = await response.text()
        console.log('[SEND] Response status:', response.status)
        console.log('[SEND] Response:', responseText)

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: 'Failed to send message',
                    details: responseText,
                    status: response.status
                },
                { status: response.status }
            )
        }

        let data: any
        try {
            data = JSON.parse(responseText)
        } catch {
            data = { raw: responseText }
        }

        await fetch(
            `${
                process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            }/api/chats/messages`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId,
                    message: {
                        id: data.id || `msg_${Date.now()}`,
                        text: text.trim(),
                        created_at: Math.floor(Date.now() / 1000),
                        author_name: user.name || 'Вы',
                        is_client: false
                    }
                })
            }
        )

        return NextResponse.json({
            success: true,
            message: {
                id: data.id || `msg_${Date.now()}`,
                text: text.trim(),
                created_at: Math.floor(Date.now() / 1000),
                author_name: user.name || 'Вы',
                is_client: false,
                author_id: user.id
            }
        })
    } catch (error) {
        console.error('[SEND] Error:', error)
        const message =
            error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
