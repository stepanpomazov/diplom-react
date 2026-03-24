// app/api/deal/[dealId]/chats/route.ts
import { NextResponse } from 'next/server'

// Тип для ответа от API
interface ChatsResponse {
    _embedded?: {
        chats?: Array<{
            chat_id?: string
            token?: string
            entity_id?: number
        }>
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ dealId: string }> }
) {
    try {
        const { dealId } = await params
        const dealIdNum = parseInt(dealId)

        if (isNaN(dealIdNum)) {
            return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 })
        }

        // Используем внутренний API AmoCRM
        const cookie = request.headers.get('cookie') || ''

        const response = await fetch(
            `https://bociwoto.amocrm.ru/ajax/v4/leads/${dealIdNum}/chats?page=1&limit=10`,
            {
                headers: {
                    'Cookie': cookie,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }
        )

        if (!response.ok) {
            console.error('[Deal Chats] API error:', response.status)
            return NextResponse.json({ error: 'Failed to fetch chats' }, { status: response.status })
        }

        const data = await response.json() as ChatsResponse

        // Извлекаем chat_id из ответа
        const chats = data._embedded?.chats || []
        const chat = chats[0]

        return NextResponse.json({
            success: true,
            chat_id: chat?.chat_id,
            token: chat?.token,
            entity_id: chat?.entity_id,
            deal_id: dealIdNum
        })

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Deal Chats] Error:', error)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
