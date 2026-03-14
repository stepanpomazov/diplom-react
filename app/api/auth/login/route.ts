// app/api/auth/login/route.ts
import { AmoCrmService } from "@/lib/amocrm-service";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers'; // ← ВАЖНО: добавить импорт!

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        const cookieStore = await cookies() // ← ВАЖНО: получить cookieStore!
        const amoCrmService = new AmoCrmService()

        // ПОЛУЧАЕМ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
        const allUsers = await amoCrmService.getUsers()
        console.log('All users:', allUsers)

        // ИЩЕМ ПОЛЬЗОВАТЕЛЯ С ВАШИМ EMAIL
        const currentUser = allUsers.find(u => u.email === email)

        if (currentUser) {
            // ВАЖНО: сохраняем ID пользователя (13574874), а не ID аккаунта!
            const userData = {
                id: currentUser.id,      // 13574874
                name: currentUser.name,   // "test dev"
                email: currentUser.email, // "stpomazov@mail.ru"
                role: 'admin' as const    // у вас есть права админа
            }

            // Сохраняем пользователя
            cookieStore.set('user', JSON.stringify(userData), {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 дней
                path: '/'
            })

            // ВАЖНО: Здесь нужно сохранить куки от amoCRM!
            // Эти куки приходят при OAuth авторизации
            // Сейчас у вас нет OAuth, поэтому для теста можно сохранить сессию из браузера

            // Для работы с AJAX endpoint'ами amoCRM нужны эти куки
            // Пока что для теста можно временно сохранить их из браузера
            // В реальном проекте они должны приходить из OAuth ответа

            console.log('[LOGIN] User logged in:', userData)

            return NextResponse.json({
                success: true,
                user: userData
            })
        }

        return NextResponse.json(
            { success: false, error: 'Пользователь не найден' },
            { status: 401 }
        )

    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { success: false, error: 'Ошибка входа' },
            { status: 500 }
        )
    }
}
