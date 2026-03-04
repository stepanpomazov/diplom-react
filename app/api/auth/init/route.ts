// app/api/auth/init/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies()

        const clientId = process.env.AMOCRM_CLIENT_ID
        if (!clientId) {
            return NextResponse.redirect(new URL('/login?error=missing_client_id', request.url))
        }

        // Генерируем state
        const state = crypto.randomBytes(16).toString('hex')

        // Сохраняем state в куке
        cookieStore.set('oauth_state', state, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 10 // 10 минут
        })

        // Проверим, что кука установилась
        const savedState = cookieStore.get('oauth_state')?.value
        console.log('State saved:', savedState) // Должно совпадать с state в URL

        // Формируем URL авторизации
        const authUrl = `https://www.amocrm.ru/oauth?` + new URLSearchParams({
            client_id: clientId,
            state: state,
            mode: 'post_message'
        })

        return NextResponse.redirect(authUrl)

    } catch (error) {
        console.error('Error in auth init:', error)
        return NextResponse.redirect(new URL('/login?error=init_failed', request.url))
    }
}