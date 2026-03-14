// app/api/chats/[chatId]/send/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { chatId } = await params
        const { text } = await request.json()

        const cookieStore = await cookies()
        const user = JSON.parse(cookieStore.get('user')?.value || '{}')

        const scopeId = process.env.AMOCRM_SCOPE_ID
        const secretKey = process.env.AMOCRM_CHANNEL_SECRET

        if (!scopeId || !secretKey) {
            return NextResponse.json(
                { error: 'Missing channel config' },
                { status: 500 }
            )
        }

        console.log('[SEND MESSAGE] ===== START =====')
        console.log('[SEND MESSAGE] Chat ID:', chatId)
        console.log('[SEND MESSAGE] User:', user.name)

        // Формируем запрос к API чатов - без receiver
        const method = 'POST'
        const contentType = 'application/json'
        const date = new Date().toUTCString()
        const path = `/v2/origin/custom/${scopeId}`

        // Убираем receiver полностью, так как это входящее сообщение от менеджера
        const body = {
            event_type: 'new_message',
            payload: {
                timestamp: Math.floor(Date.now() / 1000),
                msec_timestamp: Date.now(),
                msgid: `msg_${Date.now()}`,
                conversation_id: chatId,
                sender: {
                    id: `manager_${user.id}`,
                    name: user.name || 'Менеджер'
                    // Без ref_id - это внешний отправитель
                },
                // Убираем receiver
                message: {
                    type: 'text',
                    text: text
                }
            }
        }

        console.log('[SEND MESSAGE] Request body:', JSON.stringify(body, null, 2))

        const requestBody = JSON.stringify(body)
        const contentMd5 = crypto.createHash('md5').update(requestBody).digest('hex').toLowerCase()

        const stringToSign = [
            method,
            contentMd5,
            contentType,
            date,
            path
        ].join('\n')

        const signature = crypto
            .createHmac('sha1', secretKey)
            .update(stringToSign)
            .digest('hex')
            .toLowerCase()

        // Отправляем в amoJO
        const response = await fetch(`https://amojo.amocrm.ru${path}`, {
            method: 'POST',
            headers: {
                'Date': date,
                'Content-Type': contentType,
                'Content-MD5': contentMd5,
                'X-Signature': signature
            },
            body: requestBody
        })

        const responseText = await response.text()
        console.log('[SEND MESSAGE] Response status:', response.status)
        console.log('[SEND MESSAGE] Response:', responseText)

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: 'Failed to send message',
                    details: responseText,
                    status: response.status
                },
                { status: 500 }
            )
        }

        // Сохраняем сообщение локально для истории
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await fetch(`${baseUrl}/api/chats/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId,
                message: {
                    id: `msg_${Date.now()}`,
                    text: text,
                    created_at: Math.floor(Date.now() / 1000),
                    author_name: user.name || 'Вы',
                    is_client: false
                }
            })
        })

        return NextResponse.json({
            success: true,
            message: {
                id: `msg_${Date.now()}`,
                text: text,
                created_at: Math.floor(Date.now() / 1000),
                author_name: user.name || 'Вы',
                is_client: false
            }
        })

    } catch (error) {
        console.error('[SEND MESSAGE] Error:', error)
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        )
    }
}
