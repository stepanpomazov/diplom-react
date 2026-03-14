// app/api/chats/[chatId]/history/route.ts
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { chatId } = await params

        console.log('[CHAT HISTORY] ===== START =====')
        console.log('[CHAT HISTORY] Chat ID:', chatId)

        // Сначала пробуем получить из нашего хранилища
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const storeResponse = await fetch(`${baseUrl}/api/chats/messages?chatId=${chatId}`)

        if (storeResponse.ok) {
            const data = await storeResponse.json()
            if (data.messages && data.messages.length > 0) {
                console.log(`[CHAT HISTORY] Found ${data.messages.length} messages in store`)
                return NextResponse.json({ messages: data.messages })
            }
        }

        console.log('[CHAT HISTORY] No messages in store, returning empty array')
        return NextResponse.json({ messages: [] })

    } catch (error) {
        console.error('[CHAT HISTORY] Error:', error)
        return NextResponse.json({ messages: [] })
    }
}
