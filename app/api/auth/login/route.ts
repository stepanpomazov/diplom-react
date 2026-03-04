import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmService } from '@/lib/amocrm-service'

export async function POST() {
    try {
       // const { email, password } = await request.json()

        // В Next.js 15 cookies() возвращает Promise
        const cookieStore = await cookies()

        // ВРЕМЕННО: Для разработки пропускаем проверку пароля
        if (process.env.NODE_ENV === 'development') {
            // Создаем сервис для получения данных из amoCRM
            const amoCrmService = new AmoCrmService()
            const user = await amoCrmService.getCurrentUser()

            if (user) {
                // Устанавливаем куку с ID пользователя
                cookieStore.set('user_id', user.id.toString(), {
                    httpOnly: true,
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 7 // 7 дней
                })

                return NextResponse.json({
                    success: true,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.rights?.leads?.view === 'all' ? 'admin' : 'employee'
                    }
                })
            }
        }

        // Для production или если пользователь не найден
        return NextResponse.json(
            {
                success: false,
                error: process.env.NODE_ENV === 'production'
                    ? 'Аутентификация через amoCRM будет доступна позже'
                    : 'Пользователь не найден в amoCRM'
            },
            { status: 401 }
        )

    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { success: false, error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}