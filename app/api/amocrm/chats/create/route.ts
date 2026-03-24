// app/api/amojo/chats/create/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Типы для данных запроса
interface CreateChatRequest {
    contactName?: string
    contactPhone?: string
    contactEmail?: string
    dealId?: number
}

// Тип для ответа от amoJO API
interface AmojoResponse {
    id?: string
    user?: {
        id?: string
        client_id?: string
        name?: string
        avatar?: string
        phone?: string
        email?: string
    }
    [key: string]: unknown
}

export async function POST(request: Request) {
    try {
        // Получаем данные из запроса
        let bodyData: CreateChatRequest = {}
        try {
            bodyData = await request.json()
        } catch {
            console.log('[Create Chat] No JSON body or invalid JSON')
        }

        const { contactName, contactPhone, contactEmail, dealId } = bodyData

        const scopeId = process.env.AMOCRM_SCOPE_ID
        const channelSecret = process.env.AMOCRM_CHANNEL_SECRET
        const amojoId = process.env.AMOCRM_AMOJO_ID

        console.log('[Create Chat] Configuration:', {
            scopeId,
            channelSecretExists: !!channelSecret,
            amojoId,
            contactName,
            contactPhone
        })

        if (!scopeId || !channelSecret) {
            return NextResponse.json(
                { error: 'Missing channel configuration', scopeId: !!scopeId, channelSecret: !!channelSecret },
                { status: 500 }
            )
        }

        const method = 'POST'
        const contentType = 'application/json'
        const date = new Date().toUTCString()
        const path = `/v2/origin/custom/${scopeId}/chats`

        // Генерируем уникальный ID чата
        const conversationId = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`

        // Формируем тело запроса
        const body: {
            conversation_id: string
            user: {
                id: string
                name: string
                profile: {
                    phone?: string
                    email?: string
                }
            }
            source?: {
                external_id: string
            }
            account_id?: string
        } = {
            conversation_id: conversationId,
            user: {
                id: `user_${Date.now()}`,
                name: contactName || 'Клиент',
                profile: {}
            }
        }

        if (contactPhone) {
            body.user.profile.phone = contactPhone
        }

        if (contactEmail) {
            body.user.profile.email = contactEmail
        }

        if (dealId) {
            body.source = {
                external_id: String(dealId)
            }
        }

        if (amojoId) {
            body.account_id = amojoId
        }

        const requestBody = JSON.stringify(body)
        const contentMd5 = crypto.createHash('md5').update(requestBody).digest('hex')

        const stringToSign = [
            method,
            contentMd5,
            contentType,
            date,
            path
        ].join('\n')

        const signature = crypto
            .createHmac('sha1', channelSecret)
            .update(stringToSign)
            .digest('hex')

        const url = `https://amojo.amocrm.ru${path}`

        console.log('[Create Chat] ===== REQUEST =====')
        console.log('[Create Chat] URL:', url)
        console.log('[Create Chat] Date:', date)
        console.log('[Create Chat] Content-MD5:', contentMd5)
        console.log('[Create Chat] Signature:', signature)
        console.log('[Create Chat] Body:', JSON.stringify(body, null, 2))

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Date': date,
                'Content-Type': contentType,
                'Content-MD5': contentMd5,
                'X-Signature': signature
            },
            body: requestBody
        })

        console.log('[Create Chat] ===== RESPONSE =====')
        console.log('[Create Chat] Status:', response.status)
        console.log('[Create Chat] Status Text:', response.statusText)
        console.log('[Create Chat] Headers:', Object.fromEntries(response.headers))

        // Получаем ответ как текст для отладки
        const responseText = await response.text()
        console.log('[Create Chat] Response body:', responseText)
        console.log('[Create Chat] Response body length:', responseText.length)

        if (!responseText || responseText.length === 0) {
            return NextResponse.json(
                {
                    error: 'Empty response from amoJO API',
                    status: response.status,
                    statusText: response.statusText
                },
                { status: response.status }
            )
        }

        let data: AmojoResponse
        try {
            data = JSON.parse(responseText) as AmojoResponse
        } catch (parseError: unknown) {
            const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error'
            console.error('[Create Chat] JSON Parse Error:', parseError)
            return NextResponse.json(
                {
                    error: 'Invalid JSON response',
                    rawResponse: responseText.substring(0, 500),
                    parseError: errorMessage
                },
                { status: 500 }
            )
        }

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: 'Failed to create chat',
                    details: data,
                    status: response.status
                },
                { status: response.status }
            )
        }

        return NextResponse.json({
            success: true,
            chat: {
                id: data.id,
                conversation_id: conversationId,
                user: data.user
            }
        })

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Create Chat] Unexpected Error:', error)
        return NextResponse.json(
            {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        )
    }
}
