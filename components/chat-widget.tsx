// components/chat-widget.tsx
"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'

interface ChatWidgetProps {
    dealId: number
    contactId: number
    userId: number
}

export function ChatWidget({ dealId, contactId, userId }: ChatWidgetProps) {
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)

    const sendMessage = async () => {
        if (!message.trim()) return

        setSending(true)
        try {
            const response = await fetch('/api/chats/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dealId,
                    contactId,
                    userId,
                    text: message
                })
            })

            if (response.ok) {
                setMessage('')
                // TODO: Добавить уведомление об успехе
                // Например, можно использовать toast или alert
            }
        } catch (error) {
            console.error('Failed to send message:', error)
        } finally {
            setSending(false)
        }
    }

    // Используем onKeyDown вместо устаревшего onKeyPress
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault() // Предотвращаем переход на новую строку
            sendMessage()
        }
    }

    return (
        <div className="flex gap-2 p-4 border rounded-lg">
            <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Введите сообщение..."
                disabled={sending}
            />
            <Button onClick={sendMessage} disabled={sending}>
                <Send className="h-4 w-4" />
            </Button>
        </div>
    )
}