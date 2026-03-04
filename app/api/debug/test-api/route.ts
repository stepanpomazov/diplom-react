// app/api/debug/test-api/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        console.log('[TEST] Starting API test...');

        // Проверяем переменные окружения
        const config = {
            subdomain: process.env.AMOCRM_SUBDOMAIN,
            tokenExists: !!process.env.AMOCRM_ACCESS_TOKEN,
            tokenPreview: process.env.AMOCRM_ACCESS_TOKEN
                ? process.env.AMOCRM_ACCESS_TOKEN.substring(0, 20) + '...'
                : 'none'
        };
        console.log('[TEST] Config:', config);

        if (!config.subdomain || !config.tokenExists) {
            return NextResponse.json({
                error: 'Missing config',
                config
            }, { status: 500 });
        }

        // Пробуем получить информацию об аккаунте (простой запрос)
        const url = `https://${config.subdomain}.amocrm.ru/api/v4/account`;
        console.log('[TEST] Fetching:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('[TEST] Response status:', response.status);

        const text = await response.text();
        console.log('[TEST] Response text length:', text.length);
        console.log('[TEST] Response preview:', text.substring(0, 200));

        if (!response.ok) {
            return NextResponse.json({
                error: 'API error',
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
            config,
            account: {
                id: data.id,
                name: data.name,
                subdomain: data.subdomain
            }
        });

    } catch (error) {
        console.error('[TEST] Error:', error);
        return NextResponse.json({
            error: 'Internal error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}