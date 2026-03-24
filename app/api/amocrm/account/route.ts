// app/api/amocrm/account/route.ts
import { NextResponse } from 'next/server'
import { AmoCrmService } from '@/lib/amocrm-service'

export async function GET() {
    try {
        const amoCrm = new AmoCrmService()
        const account = await amoCrm.getAccount()

        console.log('[Account] AmoJO ID:', account.amojo_id)

        return NextResponse.json({
            account_id: account.id,
            amojo_id: account.amojo_id,
            name: account.name
        })
    } catch (error) {
        console.error('[Account] Error:', error)
        return NextResponse.json({ error: 'Failed to get account info' }, { status: 500 })
    }
}
