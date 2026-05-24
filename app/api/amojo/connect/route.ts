// app/api/chats/connect-channel/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

interface ConnectResponse {
    scope_id?: string
    account_id?: string
    [key: string]: unknown
}

async function getAccountAmojoId() {
    const subdomain = process.env.AMOCRM_SUBDOMAIN
    const accessToken = process.env.AMOCRM_ACCESS_TOKEN

    if (!subdomain || !accessToken) {
        throw new Error('AMOCRM_SUBDOMAIN or AMOCRM_ACCESS_TOKEN is not set')
    }

    const url = `https://${subdomain}.amocrm.ru/api/v4/account?with=amojo_id`
    console.log('[Amojo Connect] Fetching amojo_id from:', url)

    const resp = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json'
        }
    })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        console.error('[Amojo Connect] Failed to get amojo_id:', resp.status, text)
        throw new Error(`Failed to get amojo_id: ${resp.status}`)
    }

    const data = await resp.json() as { amojo_id?: string }
    console.log('[Amojo Connect] Account data amojo_id:', data.amojo_id)

    if (!data.amojo_id) {
        throw new Error('amojo_id not found in account response')
    }

    return data.amojo_id
}

export async function POST() {
    console.log('[Amojo Connect] Starting connection...')

    try {
        const channelId = process.env.AMOCRM_CHANNEL_ID
        const channelSecret = process.env.AMOCRM_CHANNEL_SECRET

        if (!channelId || !channelSecret) {
            console.error('[Amojo Connect] Channel credentials not set in env')
            return NextResponse.json(
                { error: 'AMOCRM_CHANNEL_ID or AMOCRM_CHANNEL_SECRET is not set' },
                { status: 500 }
            )
        }

        // 1. Получаем amojo_id аккаунта через REST API
        const amojoId = await getAccountAmojoId()

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

        let data: ConnectResponse
        try {
            data = JSON.parse(responseText)
        } catch {
            data = { raw: responseText }
        }

        if (data.scope_id) {
            console.log('[Amojo Connect] ✅ Scope ID:', data.scope_id)
        }

        return NextResponse.json(data, { status: response.status })
    } catch (error: unknown) {
        console.error('[Amojo Connect] Error:', error)

        const message =
            error instanceof Error ? error.message : 'Internal server error'

        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Amojo Connect endpoint is working. Use POST method to connect.',
        channelId: process.env.AMOCRM_CHANNEL_ID || null,
        subdomain: process.env.AMOCRM_SUBDOMAIN || null
    })
}
