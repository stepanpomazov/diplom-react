// app/api/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')

        console.log('=== CALLBACK START ===')
        console.log('Code exists:', !!code)

        if (!code) {
            return NextResponse.redirect(new URL('/login?error=no_code', request.url))
        }

        const cookieStore = await cookies()
        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'

        // 1. Обмениваем код на токены
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

        console.log('[CALLBACK] Tokens received successfully')

        // 2. Сохраняем токены для API v4
        cookieStore.set({
            name: 'access_token',
            value: tokens.access_token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: tokens.expires_in || 3600,
            path: '/'
        })

        if (tokens.refresh_token) {
            cookieStore.set({
                name: 'refresh_token',
                value: tokens.refresh_token,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30,
                path: '/'
            })
        }

        // 3. Получаем данные пользователя
        const accountResponse = await fetch(`https://${subdomain}.amocrm.ru/api/v4/account`, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json'
            }
        })

        const accountData = await accountResponse.json()
        const currentUserId = accountData.current_user_id

        const userResponse = await fetch(`https://${subdomain}.amocrm.ru/api/v4/users/${currentUserId}`, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json'
            }
        })

        const userData = await userResponse.json()

        const user = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.rights?.is_admin ? 'admin' : 'employee'
        }

        console.log('[CALLBACK] Saving user to cookie:', user)
        console.log('[CALLBACK] User data from API:', {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            is_admin: userData.rights?.is_admin
        })

        cookieStore.set({
            name: 'user',
            value: JSON.stringify(user),
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })

// Проверяем, что кука сохранилась
        const savedUser = cookieStore.get('user')
        console.log('[CALLBACK] Saved user cookie:', savedUser?.value)

        // 4. КРИТИЧЕСКИ ВАЖНО: Получаем правильные сессионные куки
        console.log('[CALLBACK] Fetching main page to get session cookies...')

        // Сначала делаем запрос к главной странице с правильными заголовками
        const mainPageResponse = await fetch(`https://${subdomain}.amocrm.ru`, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        })

        // Получаем все куки из ответа
        const setCookieHeaders = mainPageResponse.headers.getSetCookie?.() ||
            (mainPageResponse.headers as any).raw()?.['set-cookie'] ||
            mainPageResponse.headers.get('set-cookie')?.split(', ') || [];

        console.log('[CALLBACK] Received cookies from main page:', setCookieHeaders.length);

        // Парсим и сохраняем каждую куку
        for (const cookieStr of setCookieHeaders) {
            const parts = cookieStr.split(';')
            const [name, value] = parts[0].split('=')

            if (name && value) {
                let maxAge = 60 * 60 * 24 * 30
                let path = '/'
                let httpOnly = true
                let secure = true

                // Парсим параметры куки
                parts.slice(1).forEach(part => {
                    const trimmed = part.trim().toLowerCase()
                    if (trimmed.startsWith('max-age=')) {
                        maxAge = parseInt(trimmed.split('=')[1])
                    } else if (trimmed.startsWith('path=')) {
                        path = trimmed.split('=')[1]
                    } else if (trimmed === 'httponly') {
                        httpOnly = true
                    } else if (trimmed === 'secure') {
                        secure = true
                    }
                })

                // ВАЖНО: Сохраняем куку с правильным domain
                // Для session_id нужно сохранять для .amocrm.ru, а не для localhost
                if (name === 'session_id') {
                    console.log(`[CALLBACK] Saving SESSION_ID: ${value.substring(0, 10)}...`)
                }

                cookieStore.set({
                    name: name.trim(),
                    value: value.trim(),
                    httpOnly,
                    secure: process.env.NODE_ENV === 'production' ? secure : false,
                    sameSite: 'lax',
                    maxAge,
                    path
                })
            }
        }

        // 5. Делаем запрос к странице с чатами для получения дополнительных кук
        console.log('[CALLBACK] Fetching imbox page...')

        const imboxResponse = await fetch(`https://${subdomain}.amocrm.ru/imbox/`, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Referer': `https://${subdomain}.amocrm.ru/`
            }
        })

        const imboxCookies = imboxResponse.headers.getSetCookie?.() ||
            imboxResponse.headers.get('set-cookie')?.split(', ') || [];

        imboxCookies.forEach((cookieStr: string) => {
            const [name, value] = cookieStr.split(';')[0].split('=')
            if (name && value && !cookieStore.get(name)) {
                cookieStore.set({
                    name: name.trim(),
                    value: value.trim(),
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 30,
                    path: '/'
                })
            }
        })

        // 6. Проверяем, что session_id сохранилась правильно
        const savedSessionId = cookieStore.get('session_id')?.value
        console.log('[CALLBACK] Final session_id:', savedSessionId?.substring(0, 15) + '...')

        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://diplom-react-two.vercel.app'
            : 'http://localhost:3000'

        return NextResponse.redirect(new URL('/', baseUrl))

    } catch (error) {
        console.error('Auth callback error:', error)
        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://diplom-react-two.vercel.app'
            : 'http://localhost:3000'
        return NextResponse.redirect(new URL('/login?error=auth_failed', baseUrl))
    }
}
