// app/api/test-chat/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'

        const sessionId = cookieStore.get('session_id')?.value
        const session = cookieStore.get('session')?.value
        const csrfToken = cookieStore.get('csrftoken')?.value

        console.log('[TEST-CHAT] Current cookies:', {
            session_id: sessionId?.substring(0, 15) + '...',
            session: session?.substring(0, 15) + '...',
            csrfToken: csrfToken?.substring(0, 15) + '...'
        })

        // Пробуем прямой запрос к talks API
        const headers = {
            'Cookie': `session_id=${sessionId}; session=${session}; csrftoken=${csrfToken}`,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
            'Referer': `https://${subdomain}.amocrm.ru/`,
            'Origin': `https://${subdomain}.amocrm.ru`
        }

        const response = await fetch(
            `https://${subdomain}.amocrm.ru/ajax/v2/talks`,
            { headers }
        )

        const status = response.status
        let data = null
        try {
            data = await response.json()
        } catch {
            data = await response.text()
        }

        return NextResponse.json({
            status,
            headers_sent: Object.keys(headers),
            session_info: {
                session_id_exists: !!sessionId,
                session_exists: !!session,
                csrf_exists: !!csrfToken
            },
            response: data
        })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
