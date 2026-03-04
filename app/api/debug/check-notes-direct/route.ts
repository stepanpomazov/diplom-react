// app/api/debug/check-notes-direct/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const dealId = 817274;
        console.log('[NOTES] Checking notes for deal:', dealId);

        const url = `https://${process.env.AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4/leads/${dealId}/notes`;
        console.log('[NOTES] Fetching:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const text = await response.text();
        console.log('[NOTES] Status:', response.status);
        console.log('[NOTES] Response length:', text.length);
        console.log('[NOTES] Response preview:', text.substring(0, 200));

        if (!response.ok) {
            return NextResponse.json({
                error: 'Failed to fetch notes',
                status: response.status,
                text: text.substring(0, 500)
            }, { status: response.status });
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            alert(error);
            return NextResponse.json({
                error: 'Invalid JSON response',
                text: text.substring(0, 500)
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            dealId: dealId,
            notesCount: data._embedded?.notes?.length || 0,
            notes: data._embedded?.notes || []
        });

    } catch (error) {
        console.error('[NOTES] Error:', error);
        return NextResponse.json({
            error: 'Internal error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}