// app/api/user/stats/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmService } from '@/lib/amocrm-service'

// Тип для сделки из amoCRM
interface AmoCrmDeal {
    id: number
    name: string
    price: number
    status_id: number
    created_at: number
    responsible_user_id: number
    _embedded?: {
        contacts?: Array<{ id: number; name: string }>
        companies?: Array<{ id: number; name: string }>
    }
}

export async function GET() {
    try {
        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)
        console.log('[STATS API] User from cookie:', user)

        const amoCrm = new AmoCrmService()

        // 1. Сначала получим ВСЕ сделки аккаунта
        const allDeals = await amoCrm.getAllDeals()
        console.log('[STATS API] All deals count:', allDeals.length)

        // 2. Теперь сделки конкретного пользователя
        const userDeals = await amoCrm.getUserDeals(user.id)
        console.log('[STATS API] User deals count:', userDeals.length)

        // 3. Получим сделки с контактами для отображения
        const recentDeals = await amoCrm.getUserDealsWithContacts(user.id)

        // 4. Рассчитаем статистику
        const stats = await amoCrm.getUserStats(user.id)

        // Правильно типизированный массив для отладки
        const userDealsDebug = userDeals.map((deal: AmoCrmDeal) => ({
            id: deal.id,
            name: deal.name,
            price: deal.price,
            responsible: deal.responsible_user_id
        }))

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            stats,
            recentDeals,
            debug: {
                allDealsCount: allDeals.length,
                userDealsCount: userDeals.length,
                userDeals: userDealsDebug
            }
        })

    } catch (error) {
        console.error('Stats error:', error)
        return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
    }
}