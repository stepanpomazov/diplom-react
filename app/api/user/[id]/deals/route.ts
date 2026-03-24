// app/api/user/[id]/deals/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmService } from '@/lib/amocrm-service'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const userId = parseInt(id)

        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)

        // Только админ может смотреть чужие сделки
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const amoCrm = new AmoCrmService()
        const deals = await amoCrm.getUserDealsWithContacts(userId)

        // Логируем для отладки
        console.log(`[User Deals] Found ${deals.length} deals for user ${userId}`)
        if (deals.length > 0) {
            console.log('[User Deals] First deal contacts:', deals[0]._embedded?.contacts)
        }

        return NextResponse.json({ deals })
    } catch (error) {
        console.error('[User Deals] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }
}
