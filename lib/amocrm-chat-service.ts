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

    // Используем amojo.amocrm.ru для всех запросов к чатам!
    private async ajaxRequest(endpoint: string, options: RequestInit = {}) {
        // ВАЖНО: Используем amojo.amocrm.ru, а не поддомен!
        const url = `https://amojo.amocrm.ru${endpoint}`
        console.log('[ChatService] Requesting:', url)

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

    // Получить чат по сделке
    async getDealChat(dealId: number) {
        try {
            console.log('[ChatService] Getting chat for deal:', dealId)
            const data = await this.ajaxRequest(
                `/v2/origin/custom/${this.scopeId.split('_')[0]}/chats?entity_type=leads&entity_id=${dealId}`
            )
            console.log('[ChatService] Chat list response:', data)
            return data?.response?.items || []
        } catch (error) {
            console.error('Error getting chat:', error)
            return []
        }
    }

    // СОЗДАТЬ НОВЫЙ ЧАТ для сделки
    async createChat(dealId: number, contactId: number) {
        try {
            console.log('[ChatService] Creating chat for deal:', dealId, 'contact:', contactId)

            const data = await this.ajaxRequest(`/v2/origin/custom/${this.scopeId.split('_')[0]}/chats`, {
                method: 'POST',
                body: JSON.stringify({
                    entity_type: 'leads',
                    entity_id: dealId,
                    contact_id: contactId,
                    source: 'chat',
                    scope_id: this.scopeId
                })
            })

            console.log('[ChatService] Create chat response:', data)
            return data?.response
        } catch (error) {
            console.error('Error creating chat:', error)
            throw error
        }
    }

    // Получить сообщения чата
    async getChatMessages(chatId: string) {
        try {
            console.log('[ChatService] Getting messages for chat:', chatId)
            const data = await this.ajaxRequest(
                `/v2/origin/custom/${this.scopeId.split('_')[0]}/chats/${chatId}/messages?limit=50`
            )
            return data?.response?.messages || []
        } catch (error) {
            console.error('Error getting messages:', error)
            return []
        }
    }

    // Отправить сообщение
    async sendMessageAsUser(chatId: string, text: string, userId: number) {
        try {
            console.log('[ChatService] Sending message to chat:', chatId)
            const data = await this.ajaxRequest(`/v2/origin/custom/${this.scopeId.split('_')[0]}/chats/${chatId}/messages`, {
                method: 'POST',
                body: JSON.stringify({
                    message: {
                        text: text,
                        author_id: userId
                    },
                    scope_id: this.scopeId
                })
            })
            return data?.response
        } catch (error) {
            console.error('Error sending message:', error)
            throw error
        }
    }
}