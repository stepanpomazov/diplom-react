// app/api/auth/check-session/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const sessionId = cookieStore.get('session_id')?.value

        console.log('[SESSION CHECK] Current session_id:', sessionId?.substring(0, 15) + '...')

        // Правильная session_id должна быть: 82ao0snjac7oreoglq9s2o7i7f
        const isValidSession = sessionId === '82ao0snjac7oreoglq9s2o7i7f'

        return NextResponse.json({
            session_id: sessionId?.substring(0, 15) + '...',
            is_valid: isValidSession,
            all_cookies: cookieStore.getAll().map(c => c.name)
        })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to check session' }, { status: 500 })
    }
}
