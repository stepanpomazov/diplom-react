// app/api/chats/send/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmChatService } from '@/lib/amocrm-chat-service'

export async function POST(request: Request) {
    try {
        const { dealId, text, userId } = await request.json()

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const chatService = new AmoCrmChatService()

        // Получаем или создаем чат
        const chats = await chatService.getDealChat(dealId)
        const chat = chats[0]

        if (!chat) {
            // Если чата нет, нужно создать (потребуется contactId)
            // Для простоты пока просто вернем ошибку
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
        }

        // Отправляем сообщение
        const result = await chatService.sendMessageAsUser(chat.id, text, userId)

        return NextResponse.json({ success: true, message: result })

    } catch (error) {
        console.error('Error sending message:', error)
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }
}