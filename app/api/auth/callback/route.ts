// app/api/auth/callback/route.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')

        console.log('=== CALLBACK START ===')
        console.log('Code exists:', !!code)

        if (!code) {
            console.error('No code received')
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

        // ПОЛУЧАЕМ ИНФОРМАЦИЮ О ПОЛЬЗОВАТЕЛЕ (НЕ АККАУНТЕ!)
        // 1. Сначала получаем данные аккаунта, чтобы узнать current_user_id
        const accountResponse = await fetch(`https://${subdomain}.amocrm.ru/api/v4/account`, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json'
            }
        })

        const accountData = await accountResponse.json()
        console.log('Account data:', accountData)

        // 2. Получаем ID текущего пользователя из аккаунта
        const currentUserId = accountData.current_user_id
        console.log('Current user ID from account:', currentUserId)

        // 3. Получаем ДЕТАЛЬНУЮ информацию о пользователе
        const userResponse = await fetch(`https://${subdomain}.amocrm.ru/api/v4/users/${currentUserId}`, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json'
            }
        })

        const userData = await userResponse.json()
        console.log('User data:', userData)

        // Сохраняем ПРАВИЛЬНОГО пользователя
        const user = {
            id: userData.id,              // 13574874
            name: userData.name,           // "test dev"
            email: userData.email,         // "stpomazov@mail.ru"
            role: userData.rights?.leads?.view === 'all' ? 'admin' : 'employee'
        }

        console.log('[CALLBACK] Setting user cookie:', user)

        // Устанавливаем куку
        cookieStore.set({
            name: 'user',
            value: JSON.stringify(user),
            httpOnly: false,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })

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