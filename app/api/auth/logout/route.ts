// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {  // <-- Должно быть именно POST
    try {
        const cookieStore = await cookies()

        cookieStore.delete('user')
        cookieStore.delete('user_id')
        cookieStore.delete('access_token')
        cookieStore.delete('refresh_token')
        cookieStore.delete('oauth_state')

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json(
            { success: false, error: 'Ошибка при выходе' },
            { status: 500 }
        )
    }
}