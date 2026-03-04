// lib/amocrm-chat-service.ts
import crypto from 'crypto';

export class AmoCrmChatService {
    private accessToken: string
    private subdomain: string
    private scopeId: string
    private channelSecret: string

    constructor() {
        this.accessToken = process.env.AMOCRM_ACCESS_TOKEN!
        this.subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'
        this.scopeId = process.env.AMOCRM_SCOPE_ID!
        this.channelSecret = process.env.AMOCRM_CHANNEL_SECRET!

        if (!this.scopeId) {
            console.error('AMOCRM_SCOPE_ID is not set!');
        }
        if (!this.channelSecret) {
            console.error('AMOCRM_CHANNEL_SECRET is not set!');
        }
    }

    private async ajaxRequest(endpoint: string, options: RequestInit = {}) {
        const url = `https://amojo.amocrm.ru${endpoint}`
        console.log('[ChatService] Requesting:', url)
        console.log('[ChatService] Method:', options.method || 'GET')

        // Формируем обязательные заголовки для API Чатов
        const method = options.method || 'GET';
        const contentType = 'application/json';
        const date = new Date().toUTCString();

        // Тело запроса (для GET может быть пустым)
        const body = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : '';

        // Вычисляем Content-MD5 (даже для пустого тела)
        const checkSum = crypto.createHash('md5').update(body).digest('hex').toLowerCase();

        // Путь без query параметров
        const path = endpoint.split('?')[0];

        // Строка для подписи
        const stringToSign = [
            method,
            checkSum,
            contentType,
            date,
            path
        ].join('\n');

        // Вычисляем X-Signature
        const signature = crypto.createHmac('sha1', this.channelSecret)
            .update(stringToSign)
            .digest('hex')
            .toLowerCase();

        const headers = {
            'Date': date,
            'Content-Type': contentType,
            'Content-MD5': checkSum,
            'X-Signature': signature,
            ...options.headers
        };

        console.log('[ChatService] Headers:', {
            Date: date,
            'Content-MD5': checkSum,
            'X-Signature': signature
        });

        const response = await fetch(url, {
            ...options,
            headers: headers
        });

        if (!response.ok) {
            const text = await response.text()
            console.error('[ChatService] Error response:', text)
            throw new Error(`AmoCRM API error: ${response.status} - ${text}`)
        }

        return response.json()
    }

    // Получить сообщения чата
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

    // Отправить сообщение
    async sendMessage(conversationId: string, text: string, userId: number, userName: string, userAmojoId: string, contactId: number, contactName: string) {
        try {
            console.log('[ChatService] Sending message to conversation:', conversationId)

            const payload = {
                event_type: 'new_message',
                payload: {
                    timestamp: Math.floor(Date.now() / 1000),
                    msec_timestamp: Date.now(),
                    msgid: `msg_${Date.now()}_${Math.random()}`,
                    conversation_id: conversationId,
                    sender: {
                        id: `user_${userId}`,
                        name: userName,
                        ref_id: userAmojoId
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
            };

            const data = await this.ajaxRequest(`/v2/origin/custom/${this.scopeId}`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            // ВАЖНО: возвращаем и сообщение, и conversation_id из ответа
            return {
                message: data?.new_message,
                conversation_id: data?.new_message?.conversation_id || conversationId
            };
        } catch (error) {
            console.error('Error sending message:', error)
            throw error
        }
    }
}