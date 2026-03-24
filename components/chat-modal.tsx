// components/chat-modal.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Send, Loader2, User, Building, MessageSquare, ExternalLink, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatAIAnalysis } from "./chat-ai-analysis"

interface Message {
    id: string
    text: string
    created_at: number
    author_id?: number
    author_name?: string
    is_client?: boolean
}

interface TalkInfo {
    id: number
    chat_id: string
    origin?: string
    created_at?: number
    updated_at?: number
    is_in_work?: boolean
    is_read?: boolean
    url?: string
    entity_id?: number
    entity_type?: string
}

interface ChatModalProps {
    deal: {
        id: number
        name: string
        price: number
        contact_name?: string
        company_name?: string
    } | null
    isOpen: boolean
    onClose: () => void
    userId: number
    userName: string
}

export function ChatModal({ deal, isOpen, onClose, userId, userName }: ChatModalProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [talkInfo, setTalkInfo] = useState<TalkInfo | null>(null)
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"chat" | "ai">("chat")
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Загрузка информации о чате и истории сообщений
    const loadTalkAndMessages = useCallback(async () => {
        if (!deal) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Загружаем информацию о чате
            const response = await fetch(`/api/deal/${deal.id}/messages`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to load messages');
                return;
            }

            // Устанавливаем talkInfo
            setTalkInfo(data.talk || null);

            // 2. Если есть chat_id, загружаем историю сообщений
            if (data.talk?.chat_id) {
                const messagesRes = await fetch(`/api/amocrm/chats/${data.talk.chat_id}/messages`, {
                    credentials: 'include'
                })

                if (messagesRes.ok) {
                    const messagesData = await messagesRes.json()
                    setMessages(messagesData.messages || [])
                } else {
                    console.error('Failed to load messages:', await messagesRes.text())
                    setMessages([])
                }
            } else {
                setMessages([])
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            setError('Ошибка загрузки сообщений');
        } finally {
            setLoading(false);
        }
    }, [deal]);

    // Обновление истории сообщений
    const refreshMessages = useCallback(async () => {
        if (!talkInfo?.chat_id) return;

        try {
            const response = await fetch(`/api/amocrm/chats/${talkInfo.chat_id}/messages`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.messages) {
                    setMessages(data.messages);
                }
            }
        } catch (error) {
            console.error('Failed to refresh messages:', error);
        }
    }, [talkInfo]);

    // Основной эффект при открытии модалки
    useEffect(() => {
        if (isOpen && deal) {
            loadTalkAndMessages();
        }
    }, [isOpen, deal, loadTalkAndMessages]);

    // Интервал обновления сообщений (каждые 5 секунд)
    useEffect(() => {
        if (!isOpen || !talkInfo?.chat_id) return;

        const interval = setInterval(() => {
            refreshMessages();
        }, 5000);

        return () => clearInterval(interval);
    }, [isOpen, talkInfo, refreshMessages]);

    // Скролл к последнему сообщению
    useEffect(() => {
        if (activeTab === "chat") {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, activeTab]);

    // Отправка сообщения
    const sendMessage = async () => {
        if (!newMessage.trim() || !deal || !talkInfo?.chat_id) return;

        setSending(true);
        setError(null);

        const messageText = newMessage.trim();
        setNewMessage(""); // Очищаем сразу для UX

        try {
            const response = await fetch(`/api/chats/${talkInfo.chat_id}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: messageText }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                // Оптимистичное обновление: добавляем сообщение сразу
                const tempMessage: Message = {
                    id: `temp_${Date.now()}`,
                    text: messageText,
                    created_at: Math.floor(Date.now() / 1000),
                    author_name: userName || 'Вы',
                    author_id: userId,
                    is_client: false
                };
                setMessages(prev => [...prev, tempMessage]);

                // Затем обновляем из API для получения реального ID
                setTimeout(() => refreshMessages(), 500);
            } else {
                setError(data.error || 'Failed to send message');
                // Возвращаем сообщение обратно в поле ввода
                setNewMessage(messageText);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setError('Ошибка отправки сообщения');
            setNewMessage(messageText);
        } finally {
            setSending(false);
        }
    };

    // Обработка нажатия Enter
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Вставка предложенного ответа из AI
    const handleAISuggestion = (suggestion: string) => {
        setNewMessage(suggestion);
        setActiveTab("chat");
    };

    if (!isOpen || !deal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl h-[600px] bg-white rounded-xl shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900">{deal.name}</h2>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            {deal.contact_name && (
                                <div className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {deal.contact_name}
                                </div>
                            )}
                            {deal.company_name && (
                                <div className="flex items-center gap-1">
                                    <Building className="h-4 w-4" />
                                    {deal.company_name}
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <span className="font-medium">{(deal.price / 1000).toFixed(1)}K ₽</span>
                            </div>
                        </div>

                        {/* Talk Info */}
                        {talkInfo && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                {talkInfo.origin && (
                                    <span className="px-2 py-1 bg-gray-100 rounded-full">
                                        {talkInfo.origin === 'telegram' ? 'Telegram' :
                                            talkInfo.origin === 'whatsapp' ? 'WhatsApp' :
                                                talkInfo.origin}
                                    </span>
                                )}
                                <span className={`px-2 py-1 rounded-full ${
                                    talkInfo.is_in_work
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {talkInfo.is_in_work ? 'В работе' : 'Закрыта'}
                                </span>
                                <span className={`px-2 py-1 rounded-full ${
                                    talkInfo.is_read
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {talkInfo.is_read ? 'Прочитано' : 'Не прочитано'}
                                </span>
                                {talkInfo.created_at && (
                                    <span className="px-2 py-1 bg-gray-100 rounded-full">
                                        {new Date(talkInfo.created_at * 1000).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="ml-4 flex-shrink-0">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Tabs */}
                <div className="px-4 pt-2 flex-shrink-0">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "ai")}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="chat" className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Чат
                            </TabsTrigger>
                            <TabsTrigger value="ai" className="flex items-center gap-2">
                                <Brain className="h-4 w-4" />
                                AI Анализ
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 px-4 overflow-hidden">
                    {activeTab === "chat" ? (
                        <div className="h-full overflow-y-auto py-4">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : error ? (
                                <div className="text-center text-red-500 mt-20">
                                    <p>{error}</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={loadTalkAndMessages}
                                        className="mt-4"
                                    >
                                        Повторить
                                    </Button>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-gray-500 mt-20">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                    <p className="text-lg font-medium">Нет сообщений</p>
                                    <p className="text-sm mt-2">
                                        {talkInfo?.url
                                            ? 'Перейдите в amoCRM чтобы начать диалог'
                                            : 'Напишите что-нибудь клиенту!'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((msg) => {
                                        const isCurrentUser = !msg.is_client;

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[70%] rounded-lg p-3 ${
                                                        isCurrentUser
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-gray-100 text-gray-900'
                                                    }`}
                                                >
                                                    {!isCurrentUser && msg.author_name && (
                                                        <p className="text-xs font-medium mb-1 text-gray-600">
                                                            {msg.author_name}
                                                        </p>
                                                    )}
                                                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                                    <p className="text-xs mt-1 opacity-70">
                                                        {new Date(msg.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto py-4">
                            <ChatAIAnalysis
                                chatId={talkInfo?.chat_id || ''}
                                onSendSuggestion={handleAISuggestion}
                            />
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t flex-shrink-0">
                    {activeTab === "chat" ? (
                        talkInfo?.url ? (
                            <div className="text-center text-sm text-gray-500 py-2">
                                <a
                                    href={talkInfo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Открыть чат в amoCRM
                                </a>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Введите сообщение..."
                                    disabled={sending}
                                    className="flex-1"
                                />
                                <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                                    {sending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        )
                    ) : (
                        <div className="text-center text-sm text-gray-500 py-2">
                            <Brain className="h-4 w-4 inline mr-1" />
                            AI анализ поможет подобрать лучший ответ
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
