// app/api/auth/check/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')
        const accessToken = cookieStore.get('access_token')?.value

        if (!userCookie) {
            return NextResponse.json({
                authenticated: false,
                user: null
            })
        }

        const user = JSON.parse(userCookie.value)

        return NextResponse.json({
            authenticated: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            hasToken: !!accessToken
        })
    } catch (error) {
        console.error('[Auth Check] Error:', error)
        return NextResponse.json({
            authenticated: false,
            error: 'Failed to check auth'
        }, { status: 500 })
    }
}
