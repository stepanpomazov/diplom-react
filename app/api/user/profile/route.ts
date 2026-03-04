// app/api/user/profile/route.ts
import { NextResponse } from 'next/server'
import { AmoCrmService } from '@/lib/amocrm-service'

export async function GET() {
    try {
        const amoCrmService = new AmoCrmService()
        const user = await amoCrmService.getCurrentUser()

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error('Error fetching user profile:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}