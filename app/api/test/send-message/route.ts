// app/api/test/send-message/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
    try {
        const { chatId, text } = await request.json()

        const scopeId = process.env.AMOCRM_SCOPE_ID
        const secretKey = process.env.AMOCRM_CHANNEL_SECRET

        if (!scopeId || !secretKey) {
            return NextResponse.json(
                { error: 'Missing channel config' },
                { status: 500 }
            )
        }

        const method = 'POST'
        const contentType = 'application/json'
        const date = new Date().toUTCString()
        const path = `/v2/origin/custom/${scopeId}`

        const body = {
            event_type: 'new_message',
            payload: {
                timestamp: Math.floor(Date.now() / 1000),
                msec_timestamp: Date.now(),
                msgid: `test_${Date.now()}`,
                conversation_id: chatId,
                sender: {
                    id: 'test_sender',
                    name: 'Тестовый менеджер',
                    ref_id: '13574874'
                },
                receiver: {
                    id: 'client_' + chatId,
                    name: 'Клиент'
                },
                message: {
                    type: 'text',
                    text: text || 'Тестовое сообщение из интеграции'
                }
            }
        }

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

        const data = await response.json()

        return NextResponse.json({
            success: response.ok,
            status: response.status,
            data
        })

    } catch (error) {
        console.error('[TEST SEND] Error:', error)
        return NextResponse.json(
            { error: String(error) },
            { status: 500 }
        )
    }
}
