// app/api/chats/[chatId]/history/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

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

        const scopeId = process.env.AMOCRM_SCOPE_ID // Должно быть: "140dd02f-ca26-4d1d-a4a1-c7fb79f91c54_ef3cde97-d03c-4b92-b3c6-f15c79c81628"
        const channelSecret = process.env.AMOCRM_CHANNEL_SECRET

        if (!scopeId || !channelSecret) {
            console.error('Missing AMOCRM_SCOPE_ID or AMOCRM_CHANNEL_SECRET')
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            )
        }

        const { searchParams } = new URL(request.url)
        const limit = Number(searchParams.get('limit')) || 50
        const offset = Number(searchParams.get('offset')) || 0

        const method = 'GET'
        const contentType = 'application/json'
        const date = new Date().toUTCString()

        // Для GET запроса тело пустое
        const contentMd5 = crypto.createHash('md5').update('').digest('hex').toLowerCase()

        // ПРАВИЛЬНЫЙ путь с полным scopeId
        const path = `/v2/origin/custom/${scopeId}/chats/${chatId}/history`

        // Строка для подписи
        const stringToSign = [
            method,
            contentMd5,
            contentType,
            date,
            path
        ].join('\n')

        console.log('[amojo history] String to sign:', stringToSign)

        const signature = crypto
            .createHmac('sha1', channelSecret)
            .update(stringToSign)
            .digest('hex')
            .toLowerCase()

        const fullUrl = `https://amojo.amocrm.ru${path}?limit=${limit}&offset=${offset}`

        console.log('[amojo history] Full URL:', fullUrl)
        console.log('[amojo history] Date:', date)
        console.log('[amojo history] Content-MD5:', contentMd5)
        console.log('[amojo history] Signature:', signature)

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Date': date,
                'Content-Type': contentType,
                'Content-MD5': contentMd5,
                'X-Signature': signature
            }
        })

        const responseText = await response.text()
        console.log('[amojo history] Response status:', response.status)
        console.log('[amojo history] Response body:', responseText)

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch chat history', details: responseText },
                { status: response.status }
            )
        }

        const data = JSON.parse(responseText)

        const formattedMessages = (data.messages || []).map((msg: any) => ({
            id: msg.message?.id || `msg_${msg.timestamp}`,
            text: msg.message?.text || '',
            created_at: msg.timestamp,
            author_name: msg.sender?.name || (msg.sender?.client_id ? 'Клиент' : 'Система'),
            is_client: !!msg.sender?.client_id || msg.sender?.id?.includes('contact')
        }))

        return NextResponse.json({ messages: formattedMessages })

    } catch (error) {
        console.error('[api/chats/[chatId]/history] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
