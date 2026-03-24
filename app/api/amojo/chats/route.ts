import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
    try {
        const scopeId = process.env.AMOCRM_SCOPE_ID
        const channelSecret = process.env.AMOCRM_CHANNEL_SECRET

        if (!scopeId || !channelSecret) {
            return NextResponse.json(
                { error: 'Missing credentials' },
                { status: 500 }
            )
        }

        const method = 'GET'
        const contentType = 'application/json'
        const date = new Date().toUTCString()
        const contentMd5 = crypto.createHash('md5').update('').digest('hex')
        const path = `/v2/origin/custom/${scopeId}/chats`

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

        const url = `https://amojo.amocrm.ru${path}?limit=50&offset=0`

        console.log('[Amojo Chats] URL:', url)
        console.log('[Amojo Chats] Signature:', signature)

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Date': date,
                'Content-Type': contentType,
                'Content-MD5': contentMd5,
                'X-Signature': signature
            }
        })

        // Получаем текст ответа
        const responseText = await response.text()

        console.log('[Amojo Chats] Response status:', response.status)
        console.log('[Amojo Chats] Response text:', responseText)

        // Пробуем распарсить JSON
        let data
        try {
            data = responseText ? JSON.parse(responseText) : {}
        } catch (e) {
            data = { raw: responseText, error: 'Invalid JSON' }
        }

        // Проверяем статус
        if (!response.ok) {
            return NextResponse.json({
                error: 'API Error',
                status: response.status,
                data: data
            }, { status: response.status })
        }

        return NextResponse.json(data)

    } catch (error: any) {
        console.error('[Amojo Chats] Error:', error)
        return NextResponse.json(
            { error: error.message, stack: error.stack },
            { status: 500 }
        )
    }
}
