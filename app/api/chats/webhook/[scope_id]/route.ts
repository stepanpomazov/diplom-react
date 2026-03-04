// app/api/chats/webhook/[scope_id]/route.ts
import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ scope_id: string }> }
) {
    try {
        const { scope_id } = await params;
        const body = await request.json();

        console.log(`[WEBHOOK ${scope_id}] Received message:`, body);

        // Здесь можно обрабатывать входящие сообщения
        // Сохранять их в БД или отправлять уведомления

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}