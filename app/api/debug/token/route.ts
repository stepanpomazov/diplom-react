// app/api/debug/token/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'

    if (!accessToken) {
        return NextResponse.json({ error: 'No token' })
    }

    // Проверим токен на простом запросе
    const response = await fetch(`https://${subdomain}.amocrm.ru/api/v4/account`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })

    const data = await response.json()

    return NextResponse.json({
        token_valid: response.ok,
        status: response.status,
        account: data,
        token_preview: accessToken.substring(0, 30) + '...'
    })
}
