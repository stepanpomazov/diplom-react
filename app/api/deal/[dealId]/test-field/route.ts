// app/api/deal/[dealId]/test-field/route.ts
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ dealId: string }> }
) {
    try {
        const { dealId } = await params
        const accessToken = process.env.AMOCRM_ACCESS_TOKEN
        const subdomain = process.env.AMOCRM_SUBDOMAIN

        const response = await fetch(
            `https://${subdomain}.amocrm.ru/api/v4/leads/${dealId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        )

        const deal = await response.json()

        // Ищем поле "Test"
        const testField = deal.custom_fields_values?.find(
            (f: any) => f.field_name === 'Test' || f.field_code === 'TEST'
        )

        return NextResponse.json({
            deal_id: dealId,
            has_test_field: !!testField,
            test_field_value: testField?.values[0]?.value,
            all_fields: deal.custom_fields_values
        })

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
