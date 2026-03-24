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
        console.log('[STATS API] User from cookie:', user)
        console.log('[STATS API] User ID type:', typeof user.id)
        console.log('[STATS API] User ID value:', user.id)

        const amoCrm = new AmoCrmService()

        // Сначала проверим, существует ли такой пользователь в amoCRM
        const allUsers = await amoCrm.getUsers()
        const userExists = allUsers.find(u => u.id === user.id)

        if (!userExists) {
            console.warn(`[STATS API] User ${user.id} not found in amoCRM!`)
            return NextResponse.json({
                error: 'User not found in CRM',
                userFromCookie: user,
                availableUsers: allUsers.map(u => ({ id: u.id, name: u.name }))
            }, { status: 404 })
        }

        console.log(`[STATS API] User found: ${userExists.name} (${userExists.id})`)

        // Теперь получаем сделки
        const allDeals = await amoCrm.getAllDeals()
        const userDeals = await amoCrm.getUserDeals(user.id)
        const recentDeals = await amoCrm.getUserDealsWithContacts(user.id)
        const stats = await amoCrm.getUserStats(user.id)

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || 'employee'
            },
            stats,
            recentDeals,
            debug: {
                allDealsCount: allDeals.length,
                userDealsCount: userDeals.length,
                userExists: !!userExists,
                userFromAmoCRM: userExists ? { id: userExists.id, name: userExists.name } : null
            }
        })

    } catch (error) {
        console.error('Stats error:', error)
        return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
    }
}
