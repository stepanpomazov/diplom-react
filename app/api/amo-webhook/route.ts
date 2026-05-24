import { saveFromWebhook } from '@/lib/chatParticipants'
import {NextRequest, NextResponse} from "next/server";

export async function POST(req: NextRequest) {
	const body = await req.json()
	const { event_type, payload } = body

	if (event_type === 'new_message' && payload) {
		saveFromWebhook(
			payload.conversation_id,
			payload.sender?.id,
			payload.receiver?.id
		)
	}

	return NextResponse.json({ ok: true })
}
