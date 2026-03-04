// app/api/user/stats/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        console.log('[STATS API] Starting request...')

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        console.log('[STATS API] User cookie exists:', !!userCookie)

        if (!userCookie) {
            console.log('[STATS API] No user cookie found')
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            )
        }

        // Парсим пользователя из куки
        let user
        try {
            user = JSON.parse(userCookie.value)
            console.log('[STATS API] User from cookie:', user)
        } catch (e) {
            console.error('[STATS API] Failed to parse user cookie:', e)
            return NextResponse.json(
                { error: 'Invalid user data' },
                { status: 401 }
            )
        }

        // ВРЕМЕННО: возвращаем тестовые данные
        const testStats = {
            totalDeals: 15,
            openDeals: 8,
            closedDeals: 7,
            successTotal: 12,
            failTotal: 3,
            successMonth: 5,
            failMonth: 1,
            totalAmount: 450000,
            averageDealAmount: 30000
        }

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            },
            stats: testStats
        })

    } catch (error) {
        console.error('[STATS API] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}