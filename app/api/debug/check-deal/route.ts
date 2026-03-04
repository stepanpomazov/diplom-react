// app/api/debug/check-deal/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const dealId = 817274;
        console.log('[DEAL] Checking deal:', dealId);

        const url = `https://${process.env.AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4/leads/${dealId}`;
        console.log('[DEAL] Fetching:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const text = await response.text();
        console.log('[DEAL] Status:', response.status);
        console.log('[DEAL] Response:', text.substring(0, 200));

        if (!response.ok) {
            return NextResponse.json({
                error: 'Deal not found',
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
                error: 'Invalid JSON',
                text: text.substring(0, 500)
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            deal: {
                id: data.id,
                name: data.name,
                price: data.price,
                status_id: data.status_id
            }
        });

    } catch (error) {
        console.error('[DEAL] Error:', error);
        return NextResponse.json({
            error: 'Internal error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}