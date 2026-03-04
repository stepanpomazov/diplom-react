// app/api/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')
        const state = searchParams.get('state')

        console.log('=== CALLBACK START ===')
        console.log('Code exists:', !!code)
        console.log('State exists:', !!state)
        console.log('Full URL:', request.url)
        console.log('Environment:', process.env.NODE_ENV)
        console.log('Redirect URI from env:', process.env.AMOCRM_REDIRECT_URI)

        if (!code) {
            console.error('No code received')
            return NextResponse.redirect(new URL('/login?error=no_code', request.url))
        }

        const cookieStore = await cookies()
        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'

        console.log('Exchanging code for tokens...')
        console.log('Token URL:', `https://${subdomain}.amocrm.ru/oauth2/access_token`)

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
        console.log('Token response status:', tokenResponse.status)
        console.log('Token response ok:', tokenResponse.ok)

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', tokens)
            return NextResponse.redirect(new URL('/login?error=token_failed', request.url))
        }

        console.log('Tokens received successfully, getting user data...')

        // Получаем данные пользователя
        const userResponse = await fetch(`https://${subdomain}.amocrm.ru/api/v4/account`, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json'
            }
        })

        const accountData = await userResponse.json()
        console.log('Account data received:', accountData ? 'YES' : 'NO')

        // Сохраняем пользователя
        const user = {
            id: accountData.id || 13574874,
            name: accountData.name || 'Пользователь amoCRM',
            email: accountData.email || '',
            role: 'employee'
        }

        console.log('[CALLBACK] Setting user cookie:', user)
        console.log('[CALLBACK] Cookie params:', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })

        // Устанавливаем куку
        cookieStore.set('user', JSON.stringify(user), {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })

        // Проверяем, что кука сохранилась
        const savedUser = cookieStore.get('user')
        console.log('[CALLBACK] Cookie saved check:', {
            exists: !!savedUser,
            value: savedUser ? savedUser.value.substring(0, 30) + '...' : 'null'
        })

        // Также проверим все куки
        const allCookies = cookieStore.getAll()
        console.log('[CALLBACK] All cookies after set:', allCookies.map(c => c.name))

        console.log('=== CALLBACK END, redirecting to /dashboard ===')

        // Определяем baseUrl для редиректа
        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://diplom-react-two.vercel.app'
            : 'http://localhost:3002'

        return NextResponse.redirect(new URL('/dashboard', baseUrl))

    } catch (error) {
        console.error('Auth callback error:', error)
        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://diplom-react-two.vercel.app'
            : 'http://localhost:3002'
        return NextResponse.redirect(new URL('/login?error=auth_failed', baseUrl))
    }
}