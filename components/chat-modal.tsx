// components/chat-modal.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Send, Loader2, User, Building, FileText, MessageSquare, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

interface Message {
    id: string
    text: string
    created_at: number
    author_id: number
    author_name?: string
    is_client?: boolean
}

interface Note {
    id: string
    text: string
    created_at: number
    author_name: string
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
    const [notes, setNotes] = useState<Note[]>([])
    const [talkInfo, setTalkInfo] = useState<TalkInfo | null>(null)
    const [newMessage, setNewMessage] = useState("")
    const [newNote, setNewNote] = useState("")
    const [loading, setLoading] = useState(false)
    const [loadingNotes, setLoadingNotes] = useState(false)
    const [sending, setSending] = useState(false)
    const [sendingNote, setSendingNote] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"chat" | "notes">("chat")
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const notesEndRef = useRef<HTMLDivElement>(null)

    const loadMessages = useCallback(async () => {
        if (!deal) return

        setLoading(true)
        setError(null)
        try {
            const response = await fetch(`/api/deal/${deal.id}/messages`, {
                credentials: 'include'
            })
            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Failed to load messages')
                return
            }

            setMessages(data.messages || [])
            setTalkInfo(data.talk || null)
        } catch (error) {
            console.error('Failed to load messages:', error)
            setError('Ошибка загрузки сообщений')
        } finally {
            setLoading(false)
        }
    }, [deal])

    const loadNotes = useCallback(async () => {
        if (!deal) return
        setLoadingNotes(true)
        setError(null)
        try {
            const response = await fetch(`/api/chats/${deal.id}?type=notes`, {
                credentials: 'include'
            })
            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Failed to load notes')
                return
            }

            setNotes(data.notes || [])
        } catch (error) {
            console.error('Failed to load notes:', error)
            setError('Ошибка загрузки примечаний')
        } finally {
            setLoadingNotes(false)
        }
    }, [deal])

    useEffect(() => {
        if (isOpen && deal) {
            loadMessages()
            loadNotes()

            // Обновляем сообщения каждые 5 секунд
            const interval = setInterval(() => {
                loadMessages()
            }, 5000)

            return () => clearInterval(interval)
        }
    }, [isOpen, deal, loadMessages, loadNotes])

    useEffect(() => {
        if (activeTab === "chat") {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        } else {
            notesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, notes, activeTab])

    const sendMessage = async () => {
        if (!newMessage.trim() || !deal || !talkInfo?.chat_id) return

        setSending(true)
        setError(null)
        try {
            const response = await fetch(`/api/chats/${talkInfo.chat_id}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newMessage }),
                credentials: 'include'
            })

            const data = await response.json()

            if (response.ok) {
                setNewMessage("")
                // Добавляем сообщение в локальный список
                setMessages(prev => [...prev, data.message])
            } else {
                setError(data.error || 'Failed to send message')
                console.error('[SEND] Error:', data)
            }
        } catch (error) {
            console.error('Failed to send message:', error)
            setError('Ошибка отправки сообщения')
        } finally {
            setSending(false)
        }
    }

    const sendNote = async () => {
        if (!newNote.trim() || !deal) return

        setSendingNote(true)
        setError(null)
        try {
            const response = await fetch(`/api/chats/${deal.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: newNote,
                    type: 'notes',
                    userId
                }),
                credentials: 'include'
            })

            const data = await response.json()

            if (response.ok) {
                setNewNote("")
                const newNoteItem: Note = {
                    id: data.note?.id || Date.now().toString(),
                    text: newNote,
                    created_at: Math.floor(Date.now() / 1000),
                    author_name: userName
                }
                setNotes(prev => [...prev, newNoteItem])
            } else {
                setError(data.error || 'Failed to send note')
            }
        } catch (error) {
            console.error('Failed to send note:', error)
            setError('Ошибка отправки примечания')
        } finally {
            setSendingNote(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (activeTab === "chat") {
                sendMessage()
            } else {
                sendNote()
            }
        }
    }

    useEffect(() => {
        if (isOpen && deal && talkInfo?.chat_id) {
            const fetchMessages = async () => {
                const response = await fetch(`/api/chats/messages?chatId=${talkInfo.chat_id}`)
                const data = await response.json()
                if (data.messages) {
                    setMessages(data.messages)
                }
            }

            fetchMessages()
            const interval = setInterval(fetchMessages, 3000)
            return () => clearInterval(interval)
        }
    }, [isOpen, deal, talkInfo])

    if (!isOpen || !deal) return null

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
                            <div className="mt-2 space-y-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
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

                                {talkInfo.url && (
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                        <p className="text-sm text-blue-700 flex items-start gap-2">
                                            <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                            <span>
                                                Для просмотра полной истории и отправки сообщений используйте интерфейс amoCRM
                                            </span>
                                        </p>
                                        <a
                                            href={talkInfo.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Открыть чат в amoCRM
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
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
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="chat" className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Чат
                            </TabsTrigger>
                            <TabsTrigger value="notes" className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Примечания
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
                                        onClick={loadMessages}
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
                                    {messages.map((msg) => (
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
                                                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                                <p className="text-xs mt-1 opacity-70">
                                                    {new Date(msg.created_at * 1000).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto py-4">
                            {loadingNotes ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : notes.length === 0 ? (
                                <div className="text-center text-gray-500 mt-20">
                                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                    <p className="text-lg font-medium">Нет примечаний</p>
                                    <p className="text-sm mt-2">Добавьте первое примечание к сделке</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {notes.map((note) => (
                                        <div key={note.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {note.author_name}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(note.created_at * 1000).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 whitespace-pre-wrap">{note.text}</p>
                                        </div>
                                    ))}
                                    <div ref={notesEndRef} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t flex-shrink-0">
                    {activeTab === "chat" ? (
                        talkInfo?.url ? (
                            <div className="text-center text-sm text-gray-500 py-2">
                                Отправка сообщений доступна только в amoCRM
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
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
                        )
                    ) : (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Текст примечания (Shift+Enter для новой строки)..."
                                    disabled={sendingNote}
                                    rows={3}
                                    className="resize-none"
                                />
                                <Button
                                    onClick={sendNote}
                                    disabled={sendingNote || !newNote.trim()}
                                    className="self-end"
                                >
                                    {sendingNote ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <FileText className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                                ⚡ Примечание сразу появится в ленте сделки в amoCRM
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
