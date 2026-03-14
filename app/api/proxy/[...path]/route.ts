// app/api/proxy/[...path]/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        // Важно: await для params
        const resolvedParams = await params
        const path = resolvedParams.path

        console.log('[PROXY] Full params:', resolvedParams)
        console.log('[PROXY] Path array:', path)

        if (!path || !Array.isArray(path) || path.length === 0) {
            console.log('[PROXY] Invalid path:', path)
            return NextResponse.json(
                { error: 'Invalid path' },
                { status: 400 }
            )
        }

        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'
        const cookieStore = await cookies()

        // Получаем все нужные куки
        const sessionId = cookieStore.get('session_id')?.value
        const session = cookieStore.get('session')?.value
        const csrfToken = cookieStore.get('csrftoken')?.value
        const accessToken = cookieStore.get('access_token')?.value

        console.log('[PROXY] Session cookies:', {
            session_id: sessionId ? sessionId.substring(0, 10) + '...' : 'missing',
            session: session ? session.substring(0, 10) + '...' : 'missing',
            csrfToken: csrfToken ? csrfToken.substring(0, 10) + '...' : 'missing',
            access_token: accessToken ? 'present' : 'missing'
        })

        const pathString = path.join('/')
        const url = `https://${subdomain}.amocrm.ru/${pathString}`

        console.log('[PROXY] Target URL:', url)

        // Формируем заголовки
        const headers: HeadersInit = {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/plain, */*',
            'Referer': `https://${subdomain}.amocrm.ru/`,
            'Origin': `https://${subdomain}.amocrm.ru`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        // Добавляем куки если есть
        if (sessionId && session && csrfToken) {
            headers['Cookie'] = `session_id=${sessionId}; session=${session}; csrftoken=${csrfToken}`
            console.log('[PROXY] Cookie header set')
        } else {
            console.log('[PROXY] Missing required cookies for Cookie header')
        }

        // Добавляем Authorization если есть access_token
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`
            console.log('[PROXY] Authorization header set')
        }

        console.log('[PROXY] Making request to amoCRM...')

        const response = await fetch(url, {
            headers,
            // Важно: нужны credentials для кук
            credentials: 'include'
        })

        console.log('[PROXY] Response status:', response.status)
        console.log('[PROXY] Response headers:', Object.fromEntries(response.headers))

        // Проверяем content-type
        const contentType = response.headers.get('content-type')
        console.log('[PROXY] Content-Type:', contentType)

        let data
        if (contentType?.includes('application/json')) {
            data = await response.json()
            console.log('[PROXY] JSON response received')
            return NextResponse.json(data)
        } else {
            const text = await response.text()
            console.log('[PROXY] Response is not JSON, length:', text.length)

            // Проверяем, не страница ли это с авторизацией
            if (text.includes('Авторизация') || text.includes('login')) {
                console.log('[PROXY] Got login page')
                return NextResponse.json(
                    {
                        error: 'Session expired',
                        details: 'Got login page instead of JSON'
                    },
                    { status: 401 }
                )
            }

            return NextResponse.json({
                text: text.substring(0, 500),
                is_html: true,
                length: text.length
            })
        }

    } catch (error) {
        console.error('[PROXY] Error details:', error)
        return NextResponse.json(
            {
                error: 'Proxy error',
                details: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        )
    }
}
