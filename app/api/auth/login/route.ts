// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmService } from '@/lib/amocrm-service'

export async function POST(request: Request) {
    try {
        const { email } = await request.json()
        console.log('[LOGIN] Attempt for email:', email)

        const cookieStore = await cookies()
        const amoCrmService = new AmoCrmService()

        // 1. Получаем ВСЕХ пользователей из amoCRM
        const allUsers = await amoCrmService.getUsers()
        console.log('[LOGIN] All users:', allUsers.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email
        })))

        // 2. Ищем пользователя с таким email
        // Ваш правильный email: stpomazov@mail.ru
        const currentUser = allUsers.find(u => u.email === email)

        if (currentUser) {
            console.log('[LOGIN] Found user by email:', currentUser)

            // 3. ВАЖНО: сохраняем ID пользователя (13574874), а не ID аккаунта!
            const userData = {
                id: currentUser.id,      // 13574874
                name: currentUser.name,   // "test dev"
                email: currentUser.email, // "stpomazov@mail.ru"
                role: currentUser.rights?.leads?.view === 'all' ? 'admin' : 'employee'
            }

            console.log('[LOGIN] Setting user cookie with data:', userData)

            // 4. Сохраняем в куку
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
        }

        console.log('[LOGIN] User not found with email:', email)
        return NextResponse.json(
            { success: false, error: 'Пользователь не найден' },
            { status: 401 }
        )

    } catch (error) {
        console.error('[LOGIN] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}