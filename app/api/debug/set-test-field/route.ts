// app/api/debug/set-test-field/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const accessToken = process.env.AMOCRM_ACCESS_TOKEN
        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'
        const dealId = 974424
        const chatId = '61d8f7c7-19bb-47b4-8f53-921b9d593247'

        console.log('[DEBUG] Setting Test field for deal:', dealId)
        console.log('[DEBUG] Chat ID:', chatId)

        // Сначала найдем ID поля "Test"
        const fieldsResponse = await fetch(
            `https://${subdomain}.amocrm.ru/api/v4/leads/custom_fields`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        )

        if (!fieldsResponse.ok) {
            return NextResponse.json({
                error: 'Failed to get fields',
                status: fieldsResponse.status
            })
        }

        const fieldsData = await fieldsResponse.json()

        // Ищем поле с названием "Test"
        const testField = fieldsData._embedded?.custom_fields?.find(
            (f: any) => f.name === 'Test' || f.code === 'TEST'
        )

        if (!testField) {
            return NextResponse.json({
                error: 'Test field not found',
                available_fields: fieldsData._embedded?.custom_fields?.map((f: any) => ({
                    id: f.id,
                    name: f.name,
                    code: f.code,
                    type: f.type
                }))
            })
        }

        console.log('[DEBUG] Found Test field:', testField)

        // Обновляем сделку с chat_id в поле Test
        const updateResponse = await fetch(
            `https://${subdomain}.amocrm.ru/api/v4/leads/${dealId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    custom_fields_values: [{
                        field_id: testField.id,
                        values: [{
                            value: chatId
                        }]
                    }]
                })
            }
        )

        if (!updateResponse.ok) {
            const error = await updateResponse.text()
            return NextResponse.json({
                error: 'Failed to update deal',
                status: updateResponse.status,
                details: error
            })
        }

        const result = await updateResponse.json()

        return NextResponse.json({
            success: true,
            field_id: testField.id,
            field_name: testField.name,
            value: chatId,
            result
        })

    } catch (error) {
        console.error('[DEBUG] Error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
