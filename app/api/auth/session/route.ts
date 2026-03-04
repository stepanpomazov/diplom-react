// app/api/auth/session/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')

    console.log('[SESSION] Cookie exists:', !!userCookie)
    if (userCookie) {
        console.log('[SESSION] Cookie value (first 50 chars):', userCookie.value.substring(0, 50))
        try {
            const user = JSON.parse(userCookie.value)
            console.log('[SESSION] Parsed user:', user.email)
            return NextResponse.json({ user })
        } catch (e) {
            console.error('[SESSION] Failed to parse user cookie:', e)
            return NextResponse.json({ user: null })
        }
    } else {
        console.log('[SESSION] No user cookie found')
        return NextResponse.json({ user: null })
    }
}