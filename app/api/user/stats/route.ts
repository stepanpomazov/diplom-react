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
        const amoCrm = new AmoCrmService()

        const [stats, recentDeals] = await Promise.all([
            amoCrm.getUserStats(user.id),
            amoCrm.getUserDealsWithDetails(user.id)
        ])

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            stats,
            recentDeals
        })

    } catch (error) {
        console.error('Stats error:', error)
        return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
    }
}