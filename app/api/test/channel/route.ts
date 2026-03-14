// app/api/test/channel/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
    try {
        const scopeId = process.env.AMOCRM_SCOPE_ID
        const secretKey = process.env.AMOCRM_CHANNEL_SECRET
        const channelId = process.env.AMOCRM_CHANNEL_ID

        // Проверяем конфигурацию
        const config = {
            scopeId: scopeId ? scopeId.substring(0, 20) + '...' : null,
            channelId: channelId || null,
            hasSecret: !!secretKey
        }

        // Пробуем сделать тестовый запрос к amoJO
        const method = 'GET'
        const contentType = 'application/json'
        const date = new Date().toUTCString()
        const path = `/v2/origin/custom/${scopeId}`

        const contentMd5 = crypto.createHash('md5').update('').digest('hex').toLowerCase()

        const stringToSign = [
            method,
            contentMd5,
            contentType,
            date,
            path
        ].join('\n')

        const signature = crypto
            .createHmac('sha1', secretKey || '')
            .update(stringToSign)
            .digest('hex')
            .toLowerCase()

        const response = await fetch(`https://amojo.amocrm.ru${path}`, {
            method: 'GET',
            headers: {
                'Date': date,
                'Content-Type': contentType,
                'Content-MD5': contentMd5,
                'X-Signature': signature
            }
        })

        return NextResponse.json({
            config,
            test_request: {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            }
        })

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
