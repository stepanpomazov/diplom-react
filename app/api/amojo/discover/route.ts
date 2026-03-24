// app/api/amojo/discover/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
    const results: any = {
        timestamp: new Date().toISOString(),
        connected: false,
        endpoints: []
    }

    const scopeId = process.env.AMOCRM_SCOPE_ID
    const channelSecret = process.env.AMOCRM_CHANNEL_SECRET
    const [channelId, amojoId] = scopeId?.split('_') || []

    if (!scopeId || !channelSecret) {
        return NextResponse.json({ error: 'Missing credentials' })
    }

    // Разные возможные форматы путей для чатов
    const possiblePaths = [
        `/v2/origin/custom/${scopeId}/chats`,
        `/v2/origin/${scopeId}/chats`,
        `/v2/origin/custom/${channelId}/chats`,
        `/v2/origin/chats`,
        `/v2/chats`,
        `/v2/origin/custom/${channelId}/chats?account_id=${amojoId}`,
        `/v2/origin/${channelId}/chats/${amojoId}`,
    ]

    const method = 'GET'
    const contentType = 'application/json'
    const date = new Date().toUTCString()
    const contentMd5 = crypto.createHash('md5').update('').digest('hex')

    for (const path of possiblePaths) {
        try {
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

            const url = `https://amojo.amocrm.ru${path}?limit=1`

            console.log(`[Discover] Testing: ${url}`)

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Date': date,
                    'Content-Type': contentType,
                    'Content-MD5': contentMd5,
                    'X-Signature': signature
                }
            })

            const responseText = await response.text()

            let data
            try {
                data = responseText ? JSON.parse(responseText) : null
            } catch {
                data = { raw: responseText.substring(0, 100) }
            }

            results.endpoints.push({
                path,
                url,
                status: response.status,
                ok: response.ok,
                data: data,
                headers: Object.fromEntries(response.headers)
            })

            // Если нашли работающий эндпоинт с чатами
            if (response.ok && data && (data._embedded?.chats || data.chats || Array.isArray(data))) {
                results.working_endpoint = path
                results.has_chats = true
            }

        } catch (error: any) {
            results.endpoints.push({
                path,
                error: error.message
            })
        }
    }

    return NextResponse.json(results)
}
