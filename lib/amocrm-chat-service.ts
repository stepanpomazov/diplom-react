// lib/amocrm-chat-service.ts
export class AmoCrmChatService {
    private accessToken: string
    private subdomain: string
    private scopeId: string

    constructor() {
        this.accessToken = process.env.AMOCRM_ACCESS_TOKEN!
        this.subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'
        this.scopeId = process.env.AMOCRM_SCOPE_ID!

        if (!this.scopeId) {
            console.error('AMOCRM_SCOPE_ID is not set!');
        }
    }

    private async ajaxRequest(endpoint: string, options: RequestInit = {}) {
        const url = `https://amojo.amocrm.ru${endpoint}`
        console.log('[ChatService] Requesting:', url)
        console.log('[ChatService] Method:', options.method || 'GET')
        console.log('[ChatService] Body:', options.body)

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            }
        })

        if (!response.ok) {
            const text = await response.text()
            console.error('[ChatService] Error response:', text)
            throw new Error(`AmoCRM API error: ${response.status} - ${text}`)
        }

        return response.json()
    }

    // Получить чат по сделке - заглушка для обратной совместимости
    // В документации нет метода для получения чата по сделке,
    // мы работаем с conversation_id на основе dealId
    async getDealChat(_dealId: number) {
        // Возвращаем пустой массив, так как мы не храним чаты по ID сделки
        // Вместо этого используем conversation_id = `deal_${dealId}`
        return []
    }

    // СОЗДАТЬ НОВЫЙ ЧАТ для сделки (по документации)
    async createChat(dealId: number, contactId: number, contactName: string, contactPhone?: string) {
        try {
            console.log('[ChatService] Creating chat for deal:', dealId, 'contact:', contactId)

            // Генерируем уникальный conversation_id на основе сделки
            const conversationId = `deal_${dealId}`

            const data = await this.ajaxRequest(`/v2/origin/custom/${this.scopeId}/chats`, {
                method: 'POST',
                body: JSON.stringify({
                    conversation_id: conversationId,
                    user: {
                        id: `contact_${contactId}`,
                        name: contactName,
                        profile: {
                            phone: contactPhone || ''
                        }
                    }
                })
            })

            console.log('[ChatService] Create chat response:', data)
            return {
                id: data.id,
                conversation_id: conversationId,
                user: data.user
            }
        } catch (error) {
            console.error('Error creating chat:', error)
            throw error
        }
    }

    // Получить сообщения чата (по документации)
    async getChatMessages(conversationId: string) {
        try {
            console.log('[ChatService] Getting messages for conversation:', conversationId)
            const data = await this.ajaxRequest(
                `/v2/origin/custom/${this.scopeId}/chats/${conversationId}/history?limit=50`
            )
            return data?.messages || []
        } catch (error) {
            console.error('Error getting messages:', error)
            return []
        }
    }

    // Отправить сообщение (по документации)
    async sendMessage(conversationId: string, text: string, userId: number, userName: string, contactId: number, contactName: string) {
        try {
            console.log('[ChatService] Sending message to conversation:', conversationId)

            const data = await this.ajaxRequest(`/v2/origin/custom/${this.scopeId}`, {
                method: 'POST',
                body: JSON.stringify({
                    event_type: 'new_message',
                    payload: {
                        timestamp: Math.floor(Date.now() / 1000),
                        msec_timestamp: Date.now(),
                        msgid: `msg_${Date.now()}_${Math.random()}`,
                        conversation_id: conversationId,
                        sender: {
                            id: `user_${userId}`,
                            name: userName,
                            ref_id: userId.toString()
                        },
                        receiver: {
                            id: `contact_${contactId}`,
                            name: contactName
                        },
                        message: {
                            type: 'text',
                            text: text
                        },
                        silent: false
                    }
                })
            })

            return data?.new_message
        } catch (error) {
            console.error('Error sending message:', error)
            throw error
        }
    }
}