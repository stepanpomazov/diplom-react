// components/chat-modal.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { X, Send, Loader2, User, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Message {
    id: string
    text: string
    created_at: number
    author_id: number
    author_name?: string
    is_client?: boolean
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
}

export function ChatModal({ deal, isOpen, onClose, userId }: ChatModalProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen && deal) {
            loadMessages()
        }
    }, [isOpen, deal])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const loadMessages = async () => {
        if (!deal) return
        setLoading(true)
        setError(null)
        try {
            const response = await fetch(`/api/chats/${deal.id}`)
            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Failed to load messages')
                return
            }

            // Добавляем имена авторов
            const messagesWithAuthors = data.messages.map((msg: Message) => ({
                ...msg,
                author_name: msg.author_id === userId ? 'Вы' : 'Клиент',
                is_client: msg.author_id !== userId
            }))
            setMessages(messagesWithAuthors)
        } catch (error) {
            console.error('Failed to load messages:', error)
            setError('Ошибка загрузки сообщений')
        } finally {
            setLoading(false)
        }
    }

    const sendMessage = async () => {
        if (!newMessage.trim() || !deal) return

        setSending(true)
        setError(null)
        try {
            const response = await fetch('/api/chats/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dealId: deal.id,
                    text: newMessage,
                    userId
                })
            })

            const data = await response.json()

            if (response.ok) {
                setNewMessage("")
                // Добавляем отправленное сообщение сразу в список
                const newMsg: Message = {
                    id: data.message.id || Date.now().toString(),
                    text: newMessage,
                    created_at: Math.floor(Date.now() / 1000),
                    author_id: userId,
                    author_name: 'Вы',
                    is_client: false
                }
                setMessages(prev => [...prev, newMsg])
            } else {
                setError(data.error || 'Failed to send message')
            }
        } catch (error) {
            console.error('Failed to send message:', error)
            setError('Ошибка отправки сообщения')
        } finally {
            setSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    if (!isOpen || !deal) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl h-[600px] bg-white rounded-xl shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
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
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                onClick={loadMessages}
                                className="mt-4"
                            >
                                Повторить
                            </Button>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-20">
                            Нет сообщений. Напишите что-нибудь клиенту!
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.author_id === userId ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg p-3 ${
                                        msg.author_id === userId
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-900'
                                    }`}
                                >
                                    {msg.author_id !== userId && (
                                        <p className="text-xs font-medium mb-1 text-gray-600">
                                            {msg.author_name || 'Клиент'}
                                        </p>
                                    )}
                                    <p>{msg.text}</p>
                                    <p className="text-xs mt-1 opacity-70">
                                        {new Date(msg.created_at * 1000).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t">
                    <div className="flex gap-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}  // Заменили onKeyPress на onKeyDown
                            placeholder="Введите сообщение..."
                            disabled={sending}
                        />
                        <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                            {sending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}