// app/api/debug/user-amojo-id/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AmoCrmService } from '@/lib/amocrm-service';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const userCookie = cookieStore.get('user');

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const user = JSON.parse(userCookie.value);
        const amoCrmService = new AmoCrmService();

        // ИСПОЛЬЗУЕМ ПУБЛИЧНЫЙ МЕТОД вместо приватного request
        const data = await amoCrmService.getUserAmojoId(user.id);

        return NextResponse.json({
            user_id: user.id,
            user_name: user.name,
            amojo_id: data,
            message: data
                ? 'Этот amojo_id нужно использовать в ref_id при отправке сообщений'
                : 'amojo_id не найден для этого пользователя'
        });

    } catch (error) {
        console.error('Error getting user amojo_id:', error);
        return NextResponse.json(
            { error: 'Failed to get user amojo_id' },
            { status: 500 }
        );
    }
}