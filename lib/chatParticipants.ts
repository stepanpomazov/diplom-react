// где‑нибудь в серверной области (например, отдельный модуль)
const chatParticipants = new Map<
	string,
	{ clientId: string | null; managerId: string | null }
>()

export function saveFromWebhook(conversationId: string, senderId?: string, receiverId?: string) {
	const prev = chatParticipants.get(conversationId) ?? { clientId: null, managerId: null }

	// предполагаем, что new_message входящее → sender = клиент
	const next = {
		clientId: senderId ?? prev.clientId,
		managerId: receiverId ?? prev.managerId,
	}

	chatParticipants.set(conversationId, next)
}

export function getClientIdByChat(conversationId: string) {
	return chatParticipants.get(conversationId)?.clientId ?? null
}
