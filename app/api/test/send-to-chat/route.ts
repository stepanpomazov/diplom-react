// app/api/test/send-to-chat/route.ts
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

        console.log('[TEST SEND] Sending to chat:', chatId)
        console.log('[TEST SEND] Scope:', scopeId.substring(0, 20) + '...')

        const method = 'POST'
        const contentType = 'application/json'
        const date = new Date().toUTCString()
        const path = `/v2/origin/custom/${scopeId}`

        const body = {
            event_type: 'new_message',
            payload: {
                timestamp: Math.floor(Date.now() / 1000),
                msec_timestamp: Date.now(),
                msgid: `msg_${Date.now()}`,
                conversation_id: chatId,
                sender: {
                    id: 'manager_1',
                    name: 'Тестовый менеджер',
                    ref_id: '13574874'
                },
                receiver: {
                    id: 'client_' + chatId,
                    name: 'Клиент'
                },
                message: {
                    type: 'text',
                    text: text || 'Тестовое сообщение из интеграции ' + new Date().toLocaleTimeString()
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

        console.log('[TEST SEND] Request:', {
            url: `https://amojo.amocrm.ru${path}`,
            date,
            signature: signature.substring(0, 20) + '...'
        })

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
        console.log('[TEST SEND] Response status:', response.status)
        console.log('[TEST SEND] Response:', responseText)

        let data
        try {
            data = JSON.parse(responseText)
        } catch {
            data = { text: responseText }
        }

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
