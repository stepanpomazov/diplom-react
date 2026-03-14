// app/api/debug/check-deal-field/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const accessToken = process.env.AMOCRM_ACCESS_TOKEN
        const subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'
        const dealId = 974424

        console.log('[DEBUG] Checking deal fields for deal:', dealId)

        // Получаем информацию о сделке
        const response = await fetch(
            `https://${subdomain}.amocrm.ru/api/v4/leads/${dealId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        )

        if (!response.ok) {
            return NextResponse.json({
                error: 'Failed to fetch deal',
                status: response.status
            })
        }

        const deal = await response.json()

        // Ищем все кастомные поля
        const customFields = deal.custom_fields_values || []

        // Ищем поле с названием "Test"
        const testField = customFields.find((f: any) =>
            f.field_name === 'Test' || f.field_code === 'TEST'
        )

        return NextResponse.json({
            deal_id: dealId,
            deal_name: deal.name,
            has_custom_fields: customFields.length > 0,
            custom_fields: customFields.map((f: any) => ({
                name: f.field_name,
                code: f.field_code,
                value: f.values[0]?.value
            })),
            test_field: testField ? {
                name: testField.field_name,
                code: testField.field_code,
                value: testField.values[0]?.value
            } : null
        })

    } catch (error) {
        console.error('[DEBUG] Error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
