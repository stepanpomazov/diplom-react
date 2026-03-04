// app/api/user/stats/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmService } from '@/lib/amocrm-service'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)
        console.log('[API] User from cookie:', user)

        const amoCrm = new AmoCrmService()

        // Для отладки: получим список всех пользователей
        const allUsers = await amoCrm.getUsers()

        // Получим все сделки аккаунта
        const allDeals = await amoCrm.getAllDeals()

        // Получим сделки конкретного пользователя
        const stats = await amoCrm.getUserStats(user.id)
        const recentDeals = await amoCrm.getUserDealsWithDetails(user.id)

        console.log('[API] Debug info:', {
            userId: user.id,
            allUsersCount: allUsers.length,
            allDealsCount: allDeals.length,
            userDealsCount: recentDeals.length
        })

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            stats,
            recentDeals,
            debug: {
                allUsers,
                allDealsCount: allDeals.length
            }
        })

    } catch (error) {
        console.error('Stats error:', error)
        return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
    }
}