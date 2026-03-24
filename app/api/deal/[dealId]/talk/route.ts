// app/api/deal/[dealId]/talk/route.ts
import { NextResponse } from 'next/server'
import { AmoCrmService } from '@/lib/amocrm-service'

// Тип для ответа от API
interface TalkResponse {
    id?: number
    chat_id?: string
    [key: string]: unknown
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ dealId: string }> }  // ← dealId
) {
    try {
        const { dealId } = await params  // ← dealId
        const dealIdNum = parseInt(dealId)

        if (isNaN(dealIdNum)) {
            return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 })
        }

        const amoCrm = new AmoCrmService()

        // Пробуем получить беседу по deal_id
        const endpoints = [
            `/api/v4/leads/${dealIdNum}/talks`,
            `/api/v4/leads/${dealIdNum}/chats`,
            `/api/v4/talks?filter[entity_id]=${dealIdNum}&filter[entity_type]=lead`
        ]

        for (const endpoint of endpoints) {
            try {
                console.log(`[Deal Talk] Trying: ${endpoint}`)
                const data = await amoCrm.request<TalkResponse>(endpoint)
                return NextResponse.json({
                    success: true,
                    talk: data,
                    endpoint: endpoint
                })
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                console.log(`[Deal Talk] Failed: ${endpoint} - ${errorMessage}`)
            }
        }

        return NextResponse.json({
            success: false,
            dealId: dealIdNum,
            note: 'API не возвращает информацию о беседе по этой сделке'
        })

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Deal Talk] Error:', error)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
