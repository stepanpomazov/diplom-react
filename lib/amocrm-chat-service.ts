// lib/amocrm-chat-service.ts
import crypto from 'crypto';

interface ChatMessage {
    id: string
    text: string
    created_at: number
    author_id: number
    author_name: string
    is_client: boolean
}

interface AmojoMessage {
    timestamp: number
    message?: {
        id?: string
        text?: string
    }
    sender?: {
        id?: string
        name?: string
        client_id?: string
        ref_id?: string
    }
}

interface AmojoResponse {
    messages?: AmojoMessage[]
    new_message?: {
        msgid?: string
        conversation_id?: string
    }
}

export class AmoCrmChatService {
    private accessToken: string
    private subdomain: string
    private scopeId: string
    private channelSecret: string
    private userId?: number

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

    setUserId(userId: number) {
        this.userId = userId;
    }

    private async ajaxRequest<T = AmojoResponse>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `https://amojo.amocrm.ru${endpoint}`;
        const method = (options.method || 'GET').toUpperCase();
        const contentType = 'application/json';
        const date = new Date().toUTCString();

        const body = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : '';
        const checkSum = crypto.createHash('md5').update(body).digest('hex').toLowerCase();

        const pathForSign = endpoint.split('?')[0];

        const stringToSign = [
            method,
            checkSum,
            contentType,
            date,
            pathForSign
        ].join('\n');

        const signature = crypto
            .createHmac('sha1', this.channelSecret)
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

        console.log('[amojo] String to sign:', stringToSign);
        console.log('[amojo] Signature:', signature);

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            const text = await response.text();
            console.error('[amojo] Error:', response.status, text);
            throw new Error(`amojo error ${response.status}: ${text}`);
        }

        return response.json();
    }

    async getChatMessages(conversationId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
        try {
            const query = `?limit=${limit}&offset=${offset}`;
            const endpoint = `/v2/origin/custom/${this.scopeId}/chats/${conversationId}/history${query}`;

            const data = await this.ajaxRequest<AmojoResponse>(endpoint);

            console.log('[amojo] History loaded:', data.messages?.length || 0, 'messages');

            return (data.messages || []).map((msg: AmojoMessage) => {
                const senderId = msg.sender?.id || '';
                const senderRefId = msg.sender?.ref_id;
                const senderClientId = msg.sender?.client_id;

                const isManager = senderId.includes('manager') || !!senderRefId;
                const isClient = !!senderClientId || senderId.includes('contact');

                const isClientMessage: boolean = isClient && !isManager;

                return {
                    id: msg.message?.id || `msg_${msg.timestamp}`,
                    text: msg.message?.text || '',
                    created_at: msg.timestamp,
                    author_id: isManager ? (this.userId || 0) : 0,
                    author_name: msg.sender?.name || (isClientMessage ? 'Клиент' : 'Система'),
                    is_client: isClientMessage
                };
            });
        } catch (error) {
            console.error('[getChatMessages] Error:', error);
            return [];
        }
    }

    async getAllChatMessages(conversationId: string): Promise<ChatMessage[]> {
        let allMessages: ChatMessage[] = [];
        let offset = 0;
        const limit = 50;

        while (true) {
            const batch = await this.getChatMessages(conversationId, limit, offset);
            allMessages = allMessages.concat(batch);
            if (batch.length < limit) break;
            offset += limit;
        }

        return allMessages;
    }

    async sendMessage(
        conversationId: string,
        text: string,
        userId: number,
        userName: string,
        userAmojoId: string,
        contactId: number,
        contactName: string
    ): Promise<{ message: { msgid?: string; conversation_id?: string }; conversation_id: string }> {
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

            const data = await this.ajaxRequest<AmojoResponse>(`/v2/origin/custom/${this.scopeId}`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            return {
                message: data?.new_message || {},
                conversation_id: data?.new_message?.conversation_id || conversationId
            };
        } catch (error) {
            console.error('Error sending message:', error)
            throw error
        }
    }
}
