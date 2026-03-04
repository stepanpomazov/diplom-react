// app/api/auth/callback/route.ts - упрощенная версия для отладки
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')

        console.log('Callback received, code exists:', !!code)

        if (!code) {
            return NextResponse.redirect(new URL('/login?error=no_code', request.url))
        }

        const cookieStore = await cookies()
        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'

        // Обмениваем код на токены
        const tokenResponse = await fetch(`https://${subdomain}.amocrm.ru/oauth2/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.AMOCRM_CLIENT_ID,
                client_secret: process.env.AMOCRM_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.AMOCRM_REDIRECT_URI
            })
        })

        const tokens = await tokenResponse.json()

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', tokens)
            return NextResponse.redirect(new URL('/login?error=token_failed', request.url))
        }

        // Получаем данные пользователя
        const userResponse = await fetch(`https://${subdomain}.amocrm.ru/api/v4/account`, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json'
            }
        })

        const accountData = await userResponse.json()

        // Сохраняем пользователя
        const user = {
            id: accountData.id || 13574874,
            name: accountData.name || 'Пользователь amoCRM',
            email: accountData.email || '',
            role: 'employee'
        }

        console.log('[CALLBACK] Setting user cookie:', user)

        cookieStore.set('user', JSON.stringify(user), {
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 дней
        })

// Проверим, что сохранилось
        const savedUser = cookieStore.get('user')?.value
        console.log('[CALLBACK] Cookie saved:', !!savedUser)

        return NextResponse.redirect(new URL('/dashboard', request.url))

    } catch (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
    }
}