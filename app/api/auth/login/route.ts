import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmService } from '@/lib/amocrm-service'

export async function POST(request: Request) {
    try {
        const { email } = await request.json()
        console.log('[LOGIN] Attempt for email:', email)

        const cookieStore = await cookies()

        // Единая логика для всех окружений
        const amoCrmService = new AmoCrmService()
        const user = await amoCrmService.getCurrentUser()

        console.log('[LOGIN] User from amoCRM:', user)

        if (user) {
            // Сохраняем полную информацию о пользователе
            const userData = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.rights?.leads?.view === 'all' ? 'admin' : 'employee'
            }

            console.log('[LOGIN] Setting user cookie with data:', userData)

            // Сохраняем объект пользователя целиком
            cookieStore.set('user', JSON.stringify(userData), {
                httpOnly: false,
                secure: true, // всегда true для HTTPS
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 дней
                path: '/'
            })

            // Также сохраняем ID отдельно для обратной совместимости
            cookieStore.set('user_id', user.id.toString(), {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7
            })

            return NextResponse.json({
                success: true,
                user: userData
            })
        }

        // Если пользователь не найден
        return NextResponse.json(
            {
                success: false,
                error: 'Пользователь не найден в amoCRM'
            },
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