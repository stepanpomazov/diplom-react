// lib/amocrm-chat-service.ts
export class AmoCrmChatService {
    private accessToken: string
    private subdomain: string

    constructor() {
        this.accessToken = process.env.AMOCRM_ACCESS_TOKEN!
        this.subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const response = await fetch(`https://${this.subdomain}.amocrm.ru/api/v4${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            throw new Error(`AmoCRM API error: ${response.status} - ${error.detail || response.statusText}`)
        }

        return response.json()
    }

    // Получить чат по сделке
    async getDealChat(dealId: number) {
        try {
            const data = await this.request(`/chats?filter[entity_id]=${dealId}&filter[entity_type]=leads`)
            return data._embedded?.chats || []
        } catch (error) {
            console.error('Error getting chat:', error)
            return []
        }
    }

    // СОЗДАТЬ НОВЫЙ ЧАТ для сделки
    async createChat(dealId: number, contactId: number, source: string = 'chat') {
        try {
            console.log('[ChatService] Creating chat for deal:', dealId, 'contact:', contactId)

            const data = await this.request('/chats', {
                method: 'POST',
                body: JSON.stringify({
                    chat: {
                        entity_id: dealId,
                        entity_type: 'leads',
                        source: source
                    },
                    contact: {
                        id: contactId
                    }
                })
            })

            console.log('[ChatService] Chat created:', data)
            return data
        } catch (error) {
            console.error('Error creating chat:', error)
            throw error
        }
    }

    // Получить сообщения чата
    async getChatMessages(chatId: string) {
        try {
            const data = await this.request(`/chats/${chatId}/messages?limit=50`)
            return data._embedded?.messages || []
        } catch (error) {
            console.error('Error getting messages:', error)
            return []
        }
    }

    // Отправить сообщение
    async sendMessageAsUser(chatId: string, text: string, userId: number) {
        try {
            return await this.request(`/chats/${chatId}/messages`, {
                method: 'POST',
                body: JSON.stringify({
                    message: {
                        text: text,
                        author: {
                            id: userId,
                            type: 'user'
                        }
                    }
                })
            })
        } catch (error) {
            console.error('Error sending message:', error)
            throw error
        }
    }
}