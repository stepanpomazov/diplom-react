// lib/amocrm-chat-service.ts
export class AmoCrmChatService {
    private accessToken: string
    private subdomain: string

    constructor() {
        this.accessToken = process.env.AMOCRM_ACCESS_TOKEN!
        this.subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'
    }

    // 1. Получить чат по сделке
    async getDealChat(dealId: number) {
        try {
            const response = await fetch(
                `https://${this.subdomain}.amocrm.ru/api/v4/chats?filter[entity_id]=${dealId}&filter[entity_type]=leads`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
            const data = await response.json()
            return data._embedded?.chats || []
        } catch (error) {
            console.error('Error getting chat:', error)
            return []
        }
    }

    // 2. Создать новый чат для сделки
    async createChat(dealId: number, contactId: number, source: string = 'chat') {
        try {
            const response = await fetch(`https://${this.subdomain}.amocrm.ru/api/v4/chats`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
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
            return await response.json()
        } catch (error) {
            console.error('Error creating chat:', error)
            return null
        }
    }

    // 3. Отправить сообщение в чат (от имени пользователя)
    async sendMessageAsUser(chatId: string, text: string, userId: number) {
        try {
            const response = await fetch(`https://${this.subdomain}.amocrm.ru/api/v4/chats/${chatId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
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
            return await response.json()
        } catch (error) {
            console.error('Error sending message:', error)
            return null
        }
    }

    // 4. Отправить сообщение от имени бота
    async sendMessageAsBot(chatId: string, text: string) {
        try {
            const response = await fetch(`https://${this.subdomain}.amocrm.ru/api/v4/chats/${chatId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: {
                        text: text,
                        author: {
                            type: 'bot'
                        }
                    }
                })
            })
            return await response.json()
        } catch (error) {
            console.error('Error sending bot message:', error)
            return null
        }
    }

    // 5. Получить историю сообщений
    async getChatMessages(chatId: string, limit: number = 50) {
        try {
            const response = await fetch(
                `https://${this.subdomain}.amocrm.ru/api/v4/chats/${chatId}/messages?limit=${limit}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
            const data = await response.json()
            return data._embedded?.messages || []
        } catch (error) {
            console.error('Error getting messages:', error)
            return []
        }
    }
}