// app/api/debug-chat/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAmocrmHeaders } from '@/lib/amocrm-auth'

export async function GET() {
    try {
        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'
        const headers = await getAmocrmHeaders()

        // Проверяем разные endpoint'ы
        const chatId = '61d8f7c7-19bb-47b4-8f53-921b9d593247'

        const endpoints = [
            `/ajax/v2/chats/${chatId}/messages`,
            `/ajax/v2/talks/${chatId}/messages`,
            `/ajax/v2/chats/${chatId}`,
            `/ajax/v2/talks/${chatId}`,
            `/ajax/v2/messages?chat_id=${chatId}`,
            `/ajax/v2/talks?filter[chat_id]=${chatId}`
        ]

        const results = []

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(
                    `https://${subdomain}.amocrm.ru${endpoint}`,
                    { headers }
                )

                let data = null
                try {
                    data = await response.json()
                } catch {
                    data = await response.text()
                }

                results.push({
                    endpoint,
                    status: response.status,
                    ok: response.ok,
                    data: typeof data === 'string' ? data.substring(0, 200) : data
                })
            } catch (error) {
                results.push({
                    endpoint,
                    error: String(error)
                })
            }
        }

        return NextResponse.json({ results })

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
