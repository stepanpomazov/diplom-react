// app/api/deals/update-chat-id/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { dealId, chatId } = await request.json()

        const accessToken = process.env.AMOCRM_ACCESS_TOKEN
        const subdomain = process.env.AMOCRM_SUBDOMAIN

        // ID поля "chat_id" = 122160
        const fieldId = 122160

        console.log(`[UPDATE CHAT ID] Updating deal ${dealId} with chat_id: ${chatId}`)

        const response = await fetch(`https://${subdomain}.amocrm.ru/api/v4/leads/${dealId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                custom_fields_values: [
                    {
                        field_id: fieldId,
                        values: [
                            {
                                value: chatId
                            }
                        ]
                    }
                ]
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('[UPDATE CHAT ID] Error:', error)
            return NextResponse.json({
                error: 'Failed to update deal',
                details: error
            }, { status: 500 })
        }

        const data = await response.json()
        console.log('[UPDATE CHAT ID] Success:', data)

        return NextResponse.json({ success: true, data })

    } catch (error) {
        console.error('[UPDATE CHAT ID] Error:', error)
        return NextResponse.json(
            { error: 'Failed to update chat ID', details: String(error) },
            { status: 500 }
        )
    }
}
