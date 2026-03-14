// app/api/auth/set-session/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
    try {
        const { sessionId } = await request.json()
        const cookieStore = await cookies()

        console.log('[SET-SESSION] Attempting to set session:', sessionId.substring(0, 15) + '...')

        // Устанавливаем правильную session_id
        cookieStore.set({
            name: 'session_id',
            value: sessionId,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 дней
            path: '/'
        })

        // Также установим другие важные куки если нужно
        cookieStore.set({
            name: 'session',
            value: 'cd051afb-e85a-4984-a0cd-7f516c42414f',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
            path: '/'
        })

        cookieStore.set({
            name: 'csrftoken',
            value: 'MEJUZHSBYuM8TCOEo9NsO3NjNeEpt6lw',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
            path: '/'
        })

        console.log('[SET-SESSION] Session set successfully')

        // Проверяем что установилось
        const newSessionId = cookieStore.get('session_id')?.value
        console.log('[SET-SESSION] Verified session_id:', newSessionId?.substring(0, 15) + '...')

        return NextResponse.json({
            success: true,
            session_id: newSessionId?.substring(0, 15) + '...'
        })
    } catch (error) {
        console.error('[SET-SESSION] Error:', error)
        return NextResponse.json({ error: 'Failed to set session' }, { status: 500 })
    }
}

// Добавим GET метод для проверки
export async function GET() {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    return NextResponse.json({
        current_session: sessionId?.substring(0, 15) + '...',
        all_cookies: cookieStore.getAll().map(c => c.name)
    })
}
