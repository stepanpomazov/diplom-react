// app/api/debug/check-note/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        console.log('[DEBUG] Starting check-note...');

        const cookieStore = await cookies();
        const userCookie = cookieStore.get('user');

        if (!userCookie) {
            console.log('[DEBUG] No user cookie');
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const dealId = 817274;
        console.log('[DEBUG] Checking notes for deal:', dealId);
        console.log('[DEBUG] Using subdomain:', process.env.AMOCRM_SUBDOMAIN);
        console.log('[DEBUG] Token exists:', !!process.env.AMOCRM_ACCESS_TOKEN);

        // Делаем запрос к amoCRM с сервера
        const url = `https://${process.env.AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4/leads/${dealId}/notes`;
        console.log('[DEBUG] Fetching URL:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('[DEBUG] Response status:', response.status);
        console.log('[DEBUG] Response ok:', response.ok);

        // Получаем текст ответа (не JSON!)
        const responseText = await response.text();
        console.log('[DEBUG] Response text length:', responseText.length);
        console.log('[DEBUG] Response text preview:', responseText.substring(0, 200));

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: 'Failed to fetch notes',
                    status: response.status,
                    text: responseText.substring(0, 500)
                },
                { status: response.status }
            );
        }

        // Пробуем распарсить JSON
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('[DEBUG] Successfully parsed JSON');
        } catch (parseError) {
            console.error('[DEBUG] JSON parse error:', parseError);
            return NextResponse.json(
                {
                    error: 'Invalid JSON response',
                    text: responseText.substring(0, 500)
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            dealId: dealId,
            notesCount: data._embedded?.notes?.length || 0,
            notes: data._embedded?.notes || []
        });

    } catch (error) {
        console.error('[DEBUG] Error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}