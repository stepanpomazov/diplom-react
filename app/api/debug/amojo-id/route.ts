// app/api/debug/amojo-id/route.ts
import { NextResponse } from 'next/server';

// Тип для ответа от API
interface AccountResponse {
    id: number;
    amojo_id?: string;
    name?: string;
    subdomain?: string;
}

export async function GET() {
    try {

        const response = await fetch(
            `https://${process.env.AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4/account?with=amojo_id`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = await response.json() as AccountResponse;

        return NextResponse.json({
            account_id: data.id,
            amojo_id: data.amojo_id || 'Не найден',
            raw_data: data,
            message: data.amojo_id
                ? 'Этот amojo_id нужно использовать для подключения канала'
                : 'amojo_id не получен. Возможно, у интеграции нет прав?'
        });

    } catch (error) {
        console.error('Error getting amojo_id:', error);
        return NextResponse.json(
            {
                error: 'Failed to get amojo_id',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}