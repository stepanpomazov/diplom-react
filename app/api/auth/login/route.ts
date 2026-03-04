// app/api/auth/login/route.ts
import {AmoCrmService} from "@/lib/amocrm-service";
import {NextResponse} from "next/server";

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

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
                role: 'admin'             // у вас есть права админа
            }

            cookieStore.set('user', JSON.stringify(userData))
            return NextResponse.json({ success: true, user: userData })
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