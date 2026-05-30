// components/chat-modal.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Send, Loader2, User, Building, MessageSquare, ExternalLink, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatAIAnalysis } from "./chat-ai-analysis"
import { ChatModalProps, Message, TalkInfo } from "@/lib/types/types"

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
        if (!deal) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/deal/${deal.id}/messages`, {
                credentials: "include",
            })
            const data = await response.json()

            if (!response.ok) {
                setError(data.error || "Failed to load messages")
                return
            }

            setTalkInfo(data.talk || null)

            if (data.talk?.chat_id) {
                const messagesRes = await fetch(`/api/amocrm/chats/${data.talk.chat_id}/messages`, {
                    credentials: "include",
                })

                if (messagesRes.ok) {
                    const messagesData = await messagesRes.json()
                    setMessages(messagesData.messages || [])
                } else {
                    console.error("Failed to load messages:", await messagesRes.text())
                    setMessages([])
                }
            } else {
                setMessages([])
            }
        } catch (error) {
            console.error("Failed to load messages:", error)
            setError("Ошибка загрузки сообщений")
        } finally {
            setLoading(false)
        }
    }, [deal])

    // Обновление истории сообщений
    const refreshMessages = useCallback(async () => {
        if (!talkInfo?.chat_id) return

        try {
            const response = await fetch(`/api/amocrm/chats/${talkInfo.chat_id}/messages`, {
                credentials: "include",
            })

            if (response.ok) {
                const data = await response.json()
                if (data.messages) {
                    setMessages(data.messages)
                }
            }
        } catch (error) {
            console.error("Failed to refresh messages:", error)
        }
    }, [talkInfo])

    // Основной эффект при открытии модалки
    useEffect(() => {
        if (isOpen && deal) {
            loadTalkAndMessages()
        }
    }, [isOpen, deal, loadTalkAndMessages])

    // Интервал обновления сообщений (каждые 5 секунд)
    useEffect(() => {
        if (!isOpen || !talkInfo?.chat_id) return

        const interval = setInterval(() => {
            refreshMessages()
        }, 5000)

        return () => clearInterval(interval)
    }, [isOpen, talkInfo, refreshMessages])

    // Скролл к последнему сообщению
    useEffect(() => {
        if (activeTab === "chat") {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, activeTab])

    // Отправка сообщения
    const sendMessage = async () => {
        if (!newMessage.trim() || !deal || !talkInfo?.chat_id) return

        setSending(true)
        setError(null)

        const messageText = newMessage.trim()
        setNewMessage("")

        try {
            const response = await fetch(`/api/chats/${talkInfo.chat_id}/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: messageText }),
                credentials: "include",
            })

            const data = await response.json()

            if (response.ok) {
                const tempMessage: Message = {
                    id: `temp_${Date.now()}`,
                    text: messageText,
                    created_at: Math.floor(Date.now() / 1000),
                    author_name: userName || "Вы",
                    author_id: userId,
                    is_client: false,
                }
                setMessages((prev) => [...prev, tempMessage])

                setTimeout(() => refreshMessages(), 500)
            } else {
                setError(data.error || "Failed to send message")
                setNewMessage(messageText)
            }
        } catch (error) {
            console.error("Failed to send message:", error)
            setError("Ошибка отправки сообщения")
            setNewMessage(messageText)
        } finally {
            setSending(false)
        }
    }

    // Обработка нажатия Enter
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    // Вставка предложенного ответа из AI
    const handleAISuggestion = (suggestion: string) => {
        setNewMessage(suggestion)
        setActiveTab("chat")
    }

    if (!isOpen || !deal) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/50 sm:flex sm:items-center sm:justify-center">
            <div className="flex h-[100dvh] w-screen flex-col bg-white sm:my-6 sm:h-[600px] sm:max-w-2xl sm:rounded-xl sm:shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b p-3 sm:p-4">
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
                            {deal.name}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 sm:text-sm">
                            {deal.contact_name && (
                                <div className="flex items-center gap-1 max-w-[60%] truncate">
                                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    <span className="truncate">{deal.contact_name}</span>
                                </div>
                            )}
                            {deal.company_name && (
                                <div className="flex items-center gap-1 max-w-[60%] truncate">
                                    <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    <span className="truncate">{deal.company_name}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                <span className="font-medium text-sm sm:text-base">
                  {(deal.price / 1000).toFixed(1)}K ₽
                </span>
                            </div>
                        </div>

                        {/* Talk Info */}
                        {talkInfo && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 sm:text-xs">
                                {talkInfo.origin && (
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5">
                    {talkInfo.origin === "telegram"
                        ? "Telegram"
                        : talkInfo.origin === "whatsapp"
                            ? "WhatsApp"
                            : talkInfo.origin}
                  </span>
                                )}
                                <span
                                    className={`rounded-full px-2 py-0.5 ${
                                        talkInfo.is_in_work
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-500"
                                    }`}
                                >
                  {talkInfo.is_in_work ? "В работе" : "Закрыта"}
                </span>
                                <span
                                    className={`rounded-full px-2 py-0.5 ${
                                        talkInfo.is_read
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-yellow-100 text-yellow-700"
                                    }`}
                                >
                  {talkInfo.is_read ? "Прочитано" : "Не прочитано"}
                </span>
                                {talkInfo.created_at && (
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5">
                    {new Date(talkInfo.created_at * 1000).toLocaleDateString()}
                  </span>
                                )}
                            </div>
                        )}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="flex h-8 w-8 flex-shrink-0 sm:h-9 sm:w-9"
                    >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex-shrink-0 px-3 pt-2 sm:px-4">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "ai")}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger
                                value="chat"
                                className="flex items-center gap-2 text-xs sm:text-sm"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Чат
                            </TabsTrigger>
                            <TabsTrigger
                                value="ai"
                                className="flex items-center gap-2 text-xs sm:text-sm"
                            >
                                <Brain className="h-4 w-4" />
                                AI Анализ
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1 overflow-hidden px-3 sm:px-4">
                    {activeTab === "chat" ? (
                        <div className="h-full overflow-y-auto py-3 sm:py-4">
                            {loading ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : error ? (
                                <div className="mt-10 text-center text-red-500 sm:mt-20">
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
                                <div className="mt-10 text-center text-gray-500 sm:mt-20">
                                    <MessageSquare className="mx-auto mb-4 h-10 w-10 text-gray-400 sm:h-12 sm:w-12" />
                                    <p className="text-base font-medium sm:text-lg">Нет сообщений</p>
                                    <p className="mt-2 text-xs sm:text-sm">
                                        {talkInfo?.url
                                            ? "Перейдите в amoCRM чтобы начать диалог"
                                            : "Напишите что-нибудь клиенту!"}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 sm:space-y-4">
                                    {messages.map((msg) => {
                                        const isCurrentUser = !msg.is_client

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex ${
                                                    isCurrentUser ? "justify-end" : "justify-start"
                                                }`}
                                            >
                                                <div
                                                    className={`max-w-[85%] rounded-lg p-2.5 text-sm sm:max-w-[70%] sm:p-3 ${
                                                        isCurrentUser
                                                            ? "bg-blue-500 text-white"
                                                            : "bg-gray-100 text-gray-900"
                                                    }`}
                                                >
                                                    {!isCurrentUser && msg.author_name && (
                                                        <p className="mb-1 text-[11px] font-medium text-gray-600 sm:text-xs">
                                                            {msg.author_name}
                                                        </p>
                                                    )}
                                                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                                    <p className="mt-1 text-[10px] opacity-70 sm:text-xs">
                                                        {new Date(msg.created_at * 1000).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto py-3 sm:py-4">
                            <ChatAIAnalysis
                                chatId={talkInfo?.chat_id || ""}
                                onSendSuggestion={handleAISuggestion}
                            />
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="flex-shrink-0 border-t p-3 sm:p-4">
                    {activeTab === "chat" ? (
                        talkInfo?.url ? (
                            <div className="py-2 text-center text-xs text-gray-500 sm:text-sm">
                                <a
                                    href={talkInfo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 font-medium text-blue-600 hover:text-blue-800"
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
                                    className="flex-1 text-sm sm:text-base"
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
                        <div className="py-2 text-center text-xs text-gray-500 sm:text-sm">
                            <Brain className="mr-1 inline h-4 w-4" />
                            AI анализ поможет подобрать лучший ответ
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
