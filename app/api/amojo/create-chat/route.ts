// app/api/amojo/create-chat/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST() {
    try {
        const scopeId = process.env.AMOCRM_SCOPE_ID
        const channelSecret = process.env.AMOCRM_CHANNEL_SECRET

        if (!scopeId || !channelSecret) {
            return NextResponse.json(
                { error: 'Missing credentials' },
                { status: 500 }
            )
        }

        const method = 'POST'
        const contentType = 'application/json'
        const date = new Date().toUTCString()
        const path = `/v2/origin/custom/${scopeId}/chats`

        // Генерируем уникальный ID чата
        const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const body = {
            chat_id: chatId,
            title: 'Тестовый чат',
            client_id: 'client_123',
            client_name: 'Тестовый клиент'
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

        console.log('[Create Chat] URL:', url)
        console.log('[Create Chat] Body:', requestBody)

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

        const responseText = await response.text()
        console.log('[Create Chat] Response status:', response.status)
        console.log('[Create Chat] Response:', responseText)

        let data
        try {
            data = responseText ? JSON.parse(responseText) : {}
        } catch {
            data = { raw: responseText }
        }

        return NextResponse.json(data, { status: response.status })

    } catch (error: any) {
        console.error('[Create Chat] Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
