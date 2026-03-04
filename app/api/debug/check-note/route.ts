// app/api/debug/check-note/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const userCookie = cookieStore.get('user');

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const dealId = 817274; // ID вашей сделки

        // Делаем запрос к amoCRM с сервера (CORS не блокирует серверные запросы)
        const response = await fetch(
            `https://${process.env.AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4/leads/${dealId}/notes`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                {
                    error: 'Failed to fetch notes',
                    status: response.status,
                    details: errorText
                },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            dealId: dealId,
            notesCount: data._embedded?.notes?.length || 0,
            notes: data._embedded?.notes || []
        });

    } catch (error) {
        console.error('Error checking note:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}