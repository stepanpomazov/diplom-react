import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST() {
    console.log('[Amojo Connect] Starting connection...')

    try {
        // НОВЫЕ параметры для аккаунта bociwoto
        const channelId = '9a065889-cec5-4354-9965-f768e0349ca2'
        const channelSecret = '6bb1e8981ea34b2181135fb4a56f8a0e158ff359'
        const amojoId = '02a3e344-9bc0-4b0c-95a0-aa2f7d747314'

        console.log('[Amojo Connect] Channel ID:', channelId)
        console.log('[Amojo Connect] Amojo ID:', amojoId)
        console.log('[Amojo Connect] Secret exists:', !!channelSecret)

        const method = 'POST'
        const contentType = 'application/json'
        const date = new Date().toUTCString()
        const path = `/v2/origin/custom/${channelId}/connect`

        const body = {
            account_id: amojoId,
            title: 'Telegram Chat Bot',
            hook_api_version: 'v2'
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

        console.log('[Amojo Connect] String to sign:', stringToSign)

        const signature = crypto
            .createHmac('sha1', channelSecret)
            .update(stringToSign)
            .digest('hex')

        console.log('[Amojo Connect] Signature:', signature)

        const url = `https://amojo.amocrm.ru${path}`
        console.log('[Amojo Connect] Request URL:', url)

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
        console.log('[Amojo Connect] Response status:', response.status)
        console.log('[Amojo Connect] Response body:', responseText)

        let data
        try {
            data = JSON.parse(responseText)
        } catch {
            data = { raw: responseText }
        }

        return NextResponse.json(data, { status: response.status })

    } catch (error: any) {
        console.error('[Amojo Connect] Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Amojo Connect endpoint is working. Use POST method to connect.',
        channelId: '9a065889-cec5-4354-9965-f768e0349ca2',
        amojoId: '02a3e344-9bc0-4b0c-95a0-aa2f7d747314',
        accountId: '32967126'
    })
}
