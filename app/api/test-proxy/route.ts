// app/api/proxy/[...path]/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params
        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'

        console.log('[PROXY] Path:', path)

        const cookieStore = await cookies()

        // Получаем все нужные куки
        const sessionId = cookieStore.get('session_id')?.value
        const session = cookieStore.get('session')?.value
        const csrfToken = cookieStore.get('csrftoken')?.value
        const accessToken = cookieStore.get('access_token')?.value

        console.log('[PROXY] Cookies:', {
            session_id: sessionId?.substring(0, 10) + '...',
            session: session?.substring(0, 10) + '...',
            csrfToken: csrfToken?.substring(0, 10) + '...',
            access_token: !!accessToken
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
        }

        // Добавляем Authorization если есть access_token
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`
        }

        console.log('[PROXY] Making request...')

        const response = await fetch(url, {
            headers,
            // Важно: нужны credentials для кук
            credentials: 'include'
        })

        console.log('[PROXY] Response status:', response.status)

        // Проверяем content-type
        const contentType = response.headers.get('content-type')
        console.log('[PROXY] Content-Type:', contentType)

        let data
        if (contentType?.includes('application/json')) {
            data = await response.json()
            return NextResponse.json(data)
        } else {
            const text = await response.text()
            console.log('[PROXY] Response is HTML, length:', text.length)

            // Проверяем, не страница ли это с авторизацией
            if (text.includes('Авторизация') || text.includes('login')) {
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
                is_html: true
            })
        }

    } catch (error) {
        console.error('[PROXY] Error:', error)
        return NextResponse.json(
            {
                error: 'Proxy error',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        )
    }
}
