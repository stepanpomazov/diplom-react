import { NextResponse } from 'next/server';

export async function POST() {
    console.log('✅ TEST ENDPOINT CALLED');
    return NextResponse.json({
        success: true,
        message: 'Test endpoint is working',
        env: {
            channelIdExists: !!process.env.AMOCRM_CHANNEL_ID,
            channelSecretExists: !!process.env.AMOCRM_CHANNEL_SECRET
        }
    });
}