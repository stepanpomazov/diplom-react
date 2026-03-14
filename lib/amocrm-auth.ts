// lib/amocrm-auth.ts - обновленная версия
import { cookies } from 'next/headers'

export async function getAmocrmCookies(): Promise<string> {
    const cookieStore = await cookies()

    const cookiesList = []

    const sessionId = cookieStore.get('session_id')?.value
    const session = cookieStore.get('session')?.value
    const csrfToken = cookieStore.get('csrftoken')?.value

    console.log('[AMOCRM AUTH] session_id exists:', !!sessionId)
    console.log('[AMOCRM AUTH] session exists:', !!session)
    console.log('[AMOCRM AUTH] csrftoken exists:', !!csrfToken)

    if (sessionId) cookiesList.push(`session_id=${sessionId}`)
    if (session) cookiesList.push(`session=${session}`)
    if (csrfToken) cookiesList.push(`csrftoken=${csrfToken}`)

    const cookieString = cookiesList.join('; ')
    return cookieString
}

export async function getAmocrmHeaders(): Promise<HeadersInit> {
    const cookieString = await getAmocrmCookies()
    const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'

    return {
        'Cookie': cookieString,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // ОЧЕНЬ ВАЖНО!
        'Accept': 'application/json, text/plain, */*',
        'Referer': `https://${subdomain}.amocrm.ru/`,
        'Origin': `https://${subdomain}.amocrm.ru`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
}
