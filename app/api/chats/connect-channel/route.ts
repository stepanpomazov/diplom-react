// app/api/chats/connect-channel/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST() {
    try {
        const channelId = process.env.AMOCRM_CHANNEL_ID;
        const channelSecret = process.env.AMOCRM_CHANNEL_SECRET;
        const accountId = '32937090'; // Ваш ID аккаунта

        // Проверяем наличие переменных
        if (!channelId || !channelSecret) {
            console.error('Missing channel credentials:', { channelId, channelSecret });
            return NextResponse.json(
                { error: 'Channel credentials not configured' },
                { status: 500 }
            );
        }

        const method = 'POST';
        const contentType = 'application/json';
        const date = new Date().toUTCString();
        const path = `/v2/origin/custom/${channelId}/connect`;
        const url = `https://amojo.amocrm.ru${path}`;

        // Тело запроса
        const body = {
            account_id: accountId,
            title: 'Чат для сделок',
            hook_api_version: 'v2',
        };
        const requestBody = JSON.stringify(body);

        // Вычисляем Content-MD5
        const checkSum = crypto.createHash('md5').update(requestBody).digest('hex').toLowerCase();

        // Строка для подписи
        const stringToSign = [method, checkSum, contentType, date, path].join('\n');

        // Вычисляем X-Signature
        const signature = crypto.createHmac('sha1', channelSecret)
            .update(stringToSign)
            .digest('hex')
            .toLowerCase();

        const headers = {
            'Date': date,
            'Content-Type': contentType,
            'Content-MD5': checkSum,
            'X-Signature': signature,
        };

        console.log('Connecting channel...', { url, headers, body });

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: requestBody,
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Connection failed:', data);
            return NextResponse.json({ error: data }, { status: response.status });
        }

        // 🎉 УСПЕХ! Возвращаем scope_id
        console.log('✅ Channel connected! Scope ID:', data.scope_id);

        return NextResponse.json({
            success: true,
            scope_id: data.scope_id,
            message: 'Сохраните этот scope_id в переменную AMOCRM_SCOPE_ID'
        });

    } catch (error) {
        console.error('Error connecting channel:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Добавляем OPTIONS для CORS если нужно
export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}