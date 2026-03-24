// app/api/talks/[id]/route.ts
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const amoCrm = new AmoCrmService()

        // Пробуем получить беседу по talk_id
        const endpoints = [
            `/api/v4/talks/${id}`,
            `/api/v4/im/talks/${id}`,
            `/api/v4/chat/talks/${id}`
        ]

        for (const endpoint of endpoints) {
            try {
                console.log(`[Talk] Trying: ${endpoint}`)
                const data = await amoCrm.request<TalkResponse>(endpoint)
                return NextResponse.json({
                    success: true,
                    talk: data,
                    endpoint: endpoint
                })
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                console.log(`[Talk] Failed: ${endpoint} - ${errorMessage}`)
            }
        }

        return NextResponse.json({
            success: false,
            talkId: id,
            note: 'API не возвращает информацию о беседе, но чат существует в интерфейсе'
        })

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Talk] Error:', error)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
