// app/api/deal/[dealId]/messages/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ dealId: string }> }
) {
    try {
        const { dealId } = await params
        const dealIdNum = parseInt(dealId)

        console.log('[MESSAGES API] ===== START =====')
        console.log('[MESSAGES API] Deal ID:', dealIdNum)

        const accessToken = process.env.AMOCRM_ACCESS_TOKEN
        const subdomain = process.env.AMOCRM_SUBDOMAIN

        // 1. Получаем беседу по сделке
        const talksResponse = await fetch(
            `https://${subdomain}.amocrm.ru/api/v4/talks?filter[entity_id]=${dealIdNum}&filter[entity_type]=lead`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        )

        console.log('[MESSAGES API] Talks response status:', talksResponse.status)

        if (!talksResponse.ok) {
            return NextResponse.json({
                messages: [],
                error: 'Failed to fetch talks'
            })
        }

        const talksData = await talksResponse.json()
        const talks = talksData._embedded?.talks || []

        if (talks.length === 0) {
            return NextResponse.json({
                messages: [],
                info: 'No talks found for this deal'
            })
        }

        const talk = talks[0]
        console.log('[MESSAGES API] Found talk:', talk)

        // 2. Формируем URL для истории
        const baseUrl = process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : 'https://diplom-react-two.vercel.app'

        const historyUrl = `${baseUrl}/api/chats/${talk.chat_id}/history`
        console.log('[MESSAGES API] Fetching history from:', historyUrl)

        const historyResponse = await fetch(historyUrl)

        console.log('[MESSAGES API] History response status:', historyResponse.status)

        if (!historyResponse.ok) {
            const errorText = await historyResponse.text()
            console.log('[MESSAGES API] History error:', errorText.substring(0, 200))

            return NextResponse.json({
                messages: [],
                talk: {
                    id: talk.talk_id,
                    chat_id: talk.chat_id,
                    origin: talk.origin,
                    created_at: talk.created_at,
                    updated_at: talk.updated_at,
                    is_in_work: talk.is_in_work,
                    is_read: talk.is_read
                },
                error: 'History endpoint not available'
            })
        }

        const historyData = await historyResponse.json()
        console.log('[MESSAGES API] History data:', historyData)

        return NextResponse.json({
            messages: historyData.messages || [],
            talk: {
                id: talk.talk_id,
                chat_id: talk.chat_id,
                origin: talk.origin,
                created_at: talk.created_at,
                updated_at: talk.updated_at,
                is_in_work: talk.is_in_work,
                is_read: talk.is_read
            }
        })

    } catch (error) {
        console.error('[MESSAGES API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch messages', details: String(error) },
            { status: 500 }
        )
    }
}
