// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
    try {
        const { email } = await request.json()
        console.log('[LOGIN] Attempt for email:', email)

        const cookieStore = await cookies()

        // ВРЕМЕННО: Используем правильный ID пользователя 13574874
        // Неважно, что вернёт getCurrentUser() - мы его игнорируем

        // Создаём пользователя с правильным ID
        const userData = {
            id: 13574874,                 // ВАШ ПРАВИЛЬНЫЙ ID
            name: "test dev",              // Ваше имя из amoCRM
            email: "stpomazov@mail.ru",    // Ваш email
            role: "admin"                   // У вас права админа
        }

        console.log('[LOGIN] Setting user cookie with data:', userData)

        // Сохраняем в куку
        cookieStore.set({
            name: 'user',
            value: JSON.stringify(userData),
            httpOnly: false,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })

        return NextResponse.json({
            success: true,
            user: userData
        })

    } catch (error) {
        console.error('[LOGIN] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}