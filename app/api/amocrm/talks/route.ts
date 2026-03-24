// app/api/amocrm/talks/route.ts
import { NextResponse } from 'next/server'
import { AmoCrmService } from '@/lib/amocrm-service'

export async function GET() {
    try {
        const amoCrm = new AmoCrmService()
        const talks = await amoCrm.getTalks()

        return NextResponse.json({
            success: true,
            talks: talks._embedded?.talks || [],
            total: talks._embedded?.talks?.length || 0
        })
    } catch (error: any) {
        console.error('[Talks] Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
