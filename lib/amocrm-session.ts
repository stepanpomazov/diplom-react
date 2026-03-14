// lib/amocrm-session.ts
import { cookies } from 'next/headers'

export async function refreshAmocrmSession() {
    try {
        const cookieStore = await cookies()
        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'

        // Получаем текущие куки
        const currentCookies = cookieStore.getAll()
            .map(c => `${c.name}=${c.value}`)
            .join('; ')

        console.log('[SESSION] Refreshing amoCRM session...')

        // Делаем запрос к главной странице для обновления сессии
        const response = await fetch(`https://${subdomain}.amocrm.ru`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cookie': currentCookies
            }
        })

        // Сохраняем новые куки если есть
        const setCookieHeaders = response.headers.getSetCookie?.() ||
            [response.headers.get('set-cookie')].filter(Boolean);

        setCookieHeaders.forEach((cookieStr: string) => {
            const [cookieNameValue] = cookieStr.split(';')
            const [name, value] = cookieNameValue.split('=')

            if (name && value) {
                cookieStore.set({
                    name: name.trim(),
                    value: value.trim(),
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 30,
                    path: '/'
                })
                console.log(`[SESSION] Updated cookie: ${name}`)
            }
        })

        return true
    } catch (error) {
        console.error('[SESSION] Error refreshing session:', error)
        return false
    }
}
