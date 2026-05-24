// app/api/chats/[chatId]/send/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { getClientIdByConversation } from '@/lib/chatDB'

export async function POST(
    request: NextRequest,
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

        const channelId = process.env.AMOCRM_CHANNEL_ID
        const channelSecret = process.env.AMOCRM_CHANNEL_SECRET

        if (!channelId || !channelSecret) {
            return NextResponse.json(
                { error: 'Channel credentials are not configured' },
                { status: 500 }
            )
        }

        // 1) recipient_id из Neon
        const clientId = await getClientIdByConversation(chatId)

        if (!clientId) {
            return NextResponse.json(
                {
                    error:
                        'No client id for this chat (webhook not received yet or not saved)'
                },
                { status: 400 }
            )
        }

        // 2) Формируем origin payload
        const method = 'POST'
        const contentType = 'application/json'
        const date = new Date().toUTCString()
        const path = `/v2/origin/custom/${channelId}`

        const payload = {
            event_type: 'new_message',
            payload: {
                conversation_id: chatId,
                sender: {
                    // ID менеджера на стороне интеграции, можно связать с user.id
                    id: `my_int-manager-${user.id}`,
                    name: user.name || 'Manager'
                },
                receiver: {
                    id: clientId
                },
                message: {
                    type: 'text',
                    text: text.trim()
                }
            }
        }

        const requestBody = JSON.stringify(payload)
        const contentMd5 = crypto
            .createHash('md5')
            .update(requestBody)
            .digest('hex')

        const stringToSign = [method, contentMd5, contentType, date, path].join(
            '\n'
        )

        const signature = crypto
            .createHmac('sha1', channelSecret)
            .update(stringToSign)
            .digest('hex')

        const url = `https://amojo.amocrm.ru${path}`

        console.log('[SEND-origin] URL:', url)
        console.log('[SEND-origin] StringToSign:', stringToSign)
        console.log('[SEND-origin] Signature:', signature)
        console.log('[SEND-origin] Body:', JSON.stringify(payload, null, 2))

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Date: date,
                'Content-Type': contentType,
                'Content-MD5': contentMd5,
                'X-Signature': signature
            },
            body: requestBody
        })

        const responseText = await response.text()
        console.log('[SEND-origin] Response status:', response.status)
        console.log('[SEND-origin] Response body:', responseText)

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: 'Failed to send message via origin API',
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

        // Обновляем локальный стор сообщений (как и раньше)
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
                        id: data.message?.id || `msg_${Date.now()}`,
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
                id: data.message?.id || `msg_${Date.now()}`,
                text: text.trim(),
                created_at: Math.floor(Date.now() / 1000),
                author_name: user.name || 'Вы',
                is_client: false,
                author_id: user.id
            }
        })
    } catch (error) {
        console.error('[SEND-origin] Error:', error)
        const message =
            error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
