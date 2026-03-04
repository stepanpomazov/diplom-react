// components/chat-modal.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Send, Loader2, User, Building, FileText, MessageSquare } from "lucide-react"
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
            const response = await fetch(`/api/chats/${deal.id}?type=chat`, {
                credentials: 'include'
            })
            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Failed to load messages')
                return
            }

            setMessages(data.messages || [])
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
        if (!newMessage.trim() || !deal) return

        setSending(true)
        setError(null)
        try {
            const response = await fetch(`/api/chats/${deal.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: newMessage,
                    type: 'chat',
                    userId
                }),
                credentials: 'include'
            })

            const data = await response.json()

            if (response.ok) {
                setNewMessage("")
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

    const handleTabChange = (value: string) => {
        setActiveTab(value as "chat" | "notes")
    }

    if (!isOpen || !deal) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl h-[600px] bg-white rounded-xl shadow-2xl flex flex-col">
                {/* Header - фиксированная высота */}
                <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
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

                {/* Tabs - фиксированная высота */}
                <div className="px-4 pt-2 flex-shrink-0">
                    <Tabs value={activeTab} onValueChange={handleTabChange}>
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

                {/* Контент - занимает все свободное пространство с прокруткой */}
                <div className="flex-1 overflow-hidden px-4">
                    <Tabs value={activeTab} onValueChange={handleTabChange}>
                        <TabsContent value="chat" className="h-full mt-2">
                            <div className="h-full overflow-y-auto pr-2">
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
                                        <p className="text-sm mt-2">Напишите что-нибудь клиенту!</p>
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
                                                    <p>{msg.text}</p>
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
                        </TabsContent>

                        <TabsContent value="notes" className="h-full mt-2">
                            <div className="h-full overflow-y-auto pr-2">
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
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Input - фиксированная высота внизу */}
                <div className="p-4 border-t flex-shrink-0">
                    {activeTab === "chat" ? (
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
                    ) : (
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
                    )}
                    {activeTab === "notes" && (
                        <p className="text-xs text-gray-500 mt-2">
                            ⚡ Примечание сразу появится в ленте сделки в amoCRM
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}