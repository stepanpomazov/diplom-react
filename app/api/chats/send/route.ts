// app/api/chats/send/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AmoCrmChatService } from "@/lib/amocrm-chat-service";
import { AmoCrmService } from "@/lib/amocrm-service";

// Тип для сделки с контактами
interface DealWithContacts {
    id: number
    name: string
    price: number
    _embedded?: {
        contacts?: Array<{
            id: number
            name: string
        }>
        companies?: Array<{
            id: number
            name: string
        }>
    }
}

export async function POST(request: Request) {
    try {
        const { dealId, text, userId } = await request.json();
        console.log('[CHAT SEND] Starting for deal:', dealId);

        const cookieStore = await cookies();
        const userCookie = cookieStore.get('user');

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const user = JSON.parse(userCookie.value);
        const chatService = new AmoCrmChatService();
        const amoCrmService = new AmoCrmService();

        // Получаем информацию о сделке и контакте
        const deals = await amoCrmService.getUserDealsWithContacts(user.id) as DealWithContacts[];
        const currentDeal = deals.find((d: DealWithContacts) => d.id === dealId);

        if (!currentDeal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        const contact = currentDeal._embedded?.contacts?.[0];
        if (!contact) {
            return NextResponse.json({ error: 'No contact found for this deal' }, { status: 400 });
        }

        // Создаем или получаем conversation_id
        const conversationId = `deal_${dealId}`;

        // Отправляем сообщение
        const result = await chatService.sendMessage(
            conversationId,
            text,
            userId,
            user.name,
            contact.id,
            contact.name
        );

        return NextResponse.json({
            success: true,
            message: {
                id: result?.msgid,
                text: text,
                created_at: Math.floor(Date.now() / 1000),
                author_id: userId
            }
        });

    } catch (error) {
        console.error('[CHAT SEND] Error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}