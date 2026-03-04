// app/api/chats/connect-channel/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST() {
    try {
        // 👇 ЭТИ ДАННЫЕ ВЫ ДОЛЖНЫ ПОЛУЧИТЬ ОТ ТЕХПОДДЕРЖКИ AMOCRM
        const channelId = 'YOUR_CHANNEL_ID'; // Вставьте ваш ID канала
        const channelSecret = 'YOUR_CHANNEL_SECRET'; // Вставьте ваш секрет
        const accountId = '32937090'; // Ваш ID аккаунта

        const method = 'POST';
        const contentType = 'application/json';
        const date = new Date().toUTCString(); // Текущее время в формате RFC 2822
        const path = `/v2/origin/custom/${channelId}/connect`;
        const url = `https://amojo.amocrm.ru${path}`;

        // Тело запроса
        const body = {
            account_id: accountId,
            title: 'Мой чат для сделок', // Название, которое увидит пользователь
            hook_api_version: 'v2',
        };
        const requestBody = JSON.stringify(body);

        // Вычисляем Content-MD5 (хэш от тела запроса)
        const checkSum = crypto.createHash('md5').update(requestBody).digest('hex').toLowerCase();

        // Строка для подписи (ВАЖНО: именно в таком порядке!)
        const stringToSign = [method, checkSum, contentType, date, path].join('\n');

        // Вычисляем X-Signature (подпись)
        const signature = crypto.createHmac('sha1', channelSecret)
            .update(stringToSign)
            .digest('hex')
            .toLowerCase();

        // Формируем заголовки
        const headers = {
            'Date': date,
            'Content-Type': contentType,
            'Content-MD5': checkSum,
            'X-Signature': signature,
        };

        console.log('Подключаем канал к аккаунту...', { url, headers, body });

        // Выполняем запрос
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: requestBody,
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Ошибка подключения:', data);
            return NextResponse.json({ error: data }, { status: response.status });
        }

        // 🎉 УСПЕХ! Сохраняем scope_id
        console.log('✅ Канал подключен! Scope ID:', data.scope_id);

        // ВАЖНО: Скопируйте этот scope_id и сохраните его в .env
        return NextResponse.json({
            success: true,
            scope_id: data.scope_id,
            message: 'Сохраните этот scope_id в переменную AMOCRM_SCOPE_ID'
        });

    } catch (error) {
        console.error('Ошибка:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}