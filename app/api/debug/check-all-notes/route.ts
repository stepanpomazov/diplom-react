// app/api/debug/check-all-notes/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const url = `https://${process.env.AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4/leads/notes?limit=50`;
        console.log('[DEBUG] Fetching all notes:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const text = await response.text();
        console.log('[DEBUG] Response status:', response.status);
        console.log('[DEBUG] Response length:', text.length);

        if (!response.ok) {
            return NextResponse.json({
                error: 'Failed',
                status: response.status,
                text: text.substring(0, 500)
            });
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            return NextResponse.json({
                error: 'Invalid JSON',
                text: text.substring(0, 500)
            });
        }

        return NextResponse.json({
            success: true,
            endpoint: '/api/v4/leads/notes',
            totalNotes: data._embedded?.notes?.length || 0,
            notes: data._embedded?.notes || []
        });

    } catch (error) {
        return NextResponse.json({
            error: 'Internal error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}