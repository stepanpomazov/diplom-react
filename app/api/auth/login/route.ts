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

        // Получаем ВСЕХ пользователей из amoCRM
        const allUsers = await amoCrmService.getUsers()
        console.log('[LOGIN] All users:', allUsers.map(u => ({ id: u.id, name: u.name, email: u.email })))

        // Ищем пользователя по email (stpomazov@mail.ru)
        const foundUser = allUsers.find(u => u.email === email)

        if (foundUser) {
            console.log('[LOGIN] Found user by email:', foundUser)

            const userData = {
                id: foundUser.id,  // ВАЖНО: используем 13574874, а не 32937090!
                name: foundUser.name,
                email: foundUser.email,
                role: foundUser.rights?.leads?.view === 'all' ? 'admin' : 'employee'
            }

            console.log('[LOGIN] Setting user cookie with ID:', userData.id)

            cookieStore.set('user', JSON.stringify(userData), {
                httpOnly: false,
                secure: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/'
            })

            return NextResponse.json({ success: true, user: userData })
        }

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