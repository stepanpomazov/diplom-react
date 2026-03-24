// components/chat-ai-analysis.tsx
"use client"

import { useState } from 'react'
import { Brain, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Star, Send, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExportPDFButton } from './export-pdf-button'
import { ExtendedChatAnalysis, MessageAnalysis } from '@/lib/types/chat-analysis'

interface ChatAIAnalysisProps {
    chatId: string
    onSendSuggestion?: (text: string) => void
}

// Тип для ответа API
interface AnalysisResponse {
    success: boolean
    analysis: ExtendedChatAnalysis
    messages_count: number
    used_ai: boolean
    contact?: {
        name?: string
        id?: number
    }
    error?: string
    message?: string

}

export function ChatAIAnalysis({ chatId, onSendSuggestion }: ChatAIAnalysisProps) {
    const [analysis, setAnalysis] = useState<ExtendedChatAnalysis | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasAnalyzed, setHasAnalyzed] = useState(false)

    const loadAnalysis = async (): Promise<void> => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch(`/api/chats/${chatId}/analyze`, { credentials: 'include' })
            const data: AnalysisResponse = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to analyze chat')
            setAnalysis(data.analysis)
            setHasAnalyzed(true)
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const getSentimentIcon = (sentiment: string): React.ReactNode => {
        if (sentiment === 'positive') return <TrendingUp className="h-4 w-4 text-green-500" />
        if (sentiment === 'negative') return <TrendingDown className="h-4 w-4 text-red-500" />
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }

    const getSentimentColor = (sentiment: string): string => {
        if (sentiment === 'positive') return 'bg-green-100 text-green-700 border-green-200'
        if (sentiment === 'negative') return 'bg-red-100 text-red-700 border-red-200'
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    }

    const getSalesStageText = (stage: string): string => {
        const stages: Record<string, string> = {
            initial: 'Начальная стадия',
            discussion: 'Обсуждение',
            negotiation: 'Торг',
            closing: 'Закрытие сделки',
            lost: 'Потеряна'
        }
        return stages[stage] || stage
    }

    const getUrgencyText = (level: string): string => {
        if (level === 'high') return 'Высокая'
        if (level === 'medium') return 'Средняя'
        return 'Низкая'
    }

    const getUrgencyColor = (level: string): string => {
        if (level === 'high') return 'bg-red-100 text-red-700'
        if (level === 'medium') return 'bg-yellow-100 text-yellow-700'
        return 'bg-green-100 text-green-700'
    }

    const getActionIcon = (action: string): string => {
        if (action === 'call') return '📞'
        if (action === 'email') return '✉️'
        if (action === 'meeting') return '🤝'
        if (action === 'demo') return '🎥'
        return '💬'
    }

    const getConfidenceText = (level: string): string => {
        if (level === 'high') return 'Высокая'
        if (level === 'medium') return 'Средняя'
        return 'Низкая'
    }

    const getSentimentEmoji = (sentiment: string): string => {
        if (sentiment === 'positive') return '😊'
        if (sentiment === 'negative') return '😞'
        return '😐'
    }

    if (!hasAnalyzed && !analysis && !loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-12">
                        <Brain className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">AI Анализ диалога</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Проанализируйте диалог, чтобы получить рекомендации по тональности, стадии сделки и следующим шагам
                        </p>
                        <Button onClick={loadAnalysis} disabled={loading} className="gap-2">
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Анализирую...
                                </>
                            ) : (
                                <>
                                    <Brain className="h-4 w-4" />
                                    Запросить анализ
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
                        <span className="ml-2 text-gray-500">Анализирую диалог...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center text-red-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                        <p>{error}</p>
                        <Button variant="outline" size="sm" onClick={loadAnalysis} className="mt-4 gap-2">
                            <RotateCw className="h-4 w-4" />
                            Повторить
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!analysis) return null

    return (
        <Card className="shadow-lg border-t-4 border-t-purple-500">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Brain className="h-5 w-5 text-purple-500" />
                        AI Анализ диалога
                        <Badge variant="outline" className="text-xs">
                            {analysis.used_ai ? 'AI' : 'Базовый'}
                        </Badge>
                    </CardTitle>
                    <div className="flex gap-2">
                        <ExportPDFButton analysis={analysis} contact={analysis.contact} />
                        <Button variant="ghost" size="sm" onClick={loadAnalysis} disabled={loading} className="gap-1 text-xs">
                            <RotateCw className="h-3 w-3" />
                            Обновить
                        </Button>
                    </div>
                </div>
                <CardDescription>Автоматический анализ тональности и рекомендации</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Общая тональность */}
                <div className={`p-3 rounded-lg border ${getSentimentColor(analysis.client_sentiment)}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {getSentimentIcon(analysis.client_sentiment)}
                            <span className="font-medium">
                                {analysis.client_sentiment === 'positive' ? 'Позитивная' :
                                    analysis.client_sentiment === 'negative' ? 'Негативная' : 'Нейтральная'} тональность
                            </span>
                        </div>
                        <div className="text-sm">
                            <Progress value={(analysis.sentiment_score + 1) * 50} className="w-24 h-2" />
                            <span className="text-xs ml-2">{Math.round(analysis.sentiment_score * 100)}%</span>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="summary">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="summary">Обзор</TabsTrigger>
                        <TabsTrigger value="actions">Рекомендации</TabsTrigger>
                        <TabsTrigger value="insights">Инсайты</TabsTrigger>
                        <TabsTrigger value="advanced">Расширенный</TabsTrigger>
                        <TabsTrigger value="messages">Сообщения</TabsTrigger>
                    </TabsList>

                    {/* Вкладка Обзор */}
                    <TabsContent value="summary" className="space-y-3 mt-3">
                        <div>
                            <h4 className="text-sm font-medium mb-1">📋 Краткое содержание</h4>
                            <p className="text-sm text-gray-600">{analysis.summary}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <h4 className="text-sm font-medium mb-1">🎯 Намерение клиента</h4>
                                <p className="text-sm text-gray-600">{analysis.client_intent}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium mb-1">📊 Стадия сделки</h4>
                                <Badge variant="outline">{getSalesStageText(analysis.sales_stage)}</Badge>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium mb-1">⚡ Срочность</h4>
                            <Badge className={getUrgencyColor(analysis.urgency_level)}>
                                {getUrgencyText(analysis.urgency_level)}
                            </Badge>
                        </div>
                        {analysis.upsell_opportunity && (
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                <div className="flex items-center gap-2 text-purple-700 mb-1">
                                    <Star className="h-4 w-4" />
                                    <span className="font-medium">Возможность апсейла!</span>
                                </div>
                                <p className="text-sm">{analysis.upsell_suggestion}</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Вкладка Рекомендации */}
                    <TabsContent value="actions" className="space-y-3 mt-3">
                        <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-500" />
                                Рекомендуемые действия
                            </h4>
                            <ul className="space-y-2">
                                {analysis.recommended_actions.map((action: string, i: number) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                        <span className="text-blue-500">•</span>
                                        <span>{action}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium mb-2">🎯 Следующее лучшее действие</h4>
                            <p className="text-sm text-gray-600">{analysis.next_best_action}</p>
                        </div>
                        {analysis.suggested_response && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Send className="h-4 w-4 text-blue-500" />
                                    Предлагаемый ответ
                                </h4>
                                <p className="text-sm text-gray-700 mb-2">{analysis.suggested_response}</p>
                                {onSendSuggestion && (
                                    <Button size="sm" variant="outline" onClick={() => onSendSuggestion(analysis.suggested_response)}>
                                        Использовать
                                    </Button>
                                )}
                            </div>
                        )}
                        {analysis.response_templates.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium mb-2">📝 Шаблоны ответов</h4>
                                <div className="space-y-2">
                                    {analysis.response_templates.map((template: string, i: number) => (
                                        <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-600 flex-1">{template}</p>
                                            {onSendSuggestion && (
                                                <Button size="sm" variant="ghost" onClick={() => onSendSuggestion(template)}>
                                                    <Send className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* Вкладка Инсайты */}
                    <TabsContent value="insights" className="space-y-3 mt-3">
                        <div>
                            <h4 className="text-sm font-medium mb-2">💡 Ключевые инсайты</h4>
                            <ul className="space-y-2">
                                {analysis.key_insights.map((insight: string, i: number) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                        <span className="text-purple-500">✨</span>
                                        <span>{insight}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {analysis.pain_points.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium mb-2">⚠️ Болевые точки</h4>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.pain_points.map((point: string, i: number) => (
                                        <Badge key={i} variant="secondary">{point}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        {analysis.objections.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium mb-2">❌ Возражения</h4>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.objections.map((obj: string, i: number) => (
                                        <Badge key={i} variant="destructive" className="bg-red-100 text-red-700">{obj}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* Вкладка Расширенный анализ */}
                    <TabsContent value="advanced" className="space-y-3 mt-3">
                        {/* Профиль клиента */}
                        <div className="bg-purple-50 p-3 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">🧠 Профиль клиента</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-gray-500">Тип:</span> {analysis.client_profile.type}</div>
                                <div><span className="text-gray-500">Скорость решений:</span> {analysis.client_profile.decision_speed}</div>
                                <div><span className="text-gray-500">Стиль общения:</span> {analysis.client_profile.communication_style}</div>
                                <div><span className="text-gray-500">Готов к риску:</span> {analysis.client_profile.risk_tolerance}</div>
                            </div>
                            {analysis.client_profile.triggers.length > 0 && (
                                <div className="mt-2">
                                    <span className="text-gray-500 text-xs">Триггеры:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {analysis.client_profile.triggers.map((t: string, i: number) => (
                                            <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Прогноз сделки */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">📊 Прогноз сделки</h4>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm">Вероятность закрытия:</span>
                                <span className="text-xl font-bold text-blue-600">{analysis.prediction.probability}%</span>
                            </div>
                            <Progress value={analysis.prediction.probability} className="h-2 mb-3" />
                            <div className="flex justify-between text-xs text-gray-500 mb-2">
                                <span>Уверенность: {getConfidenceText(analysis.prediction.confidence_level)}</span>
                            </div>
                            {analysis.prediction.factors.positive.length > 0 && (
                                <div className="text-green-600 text-xs mt-1">
                                    ✅ {analysis.prediction.factors.positive.join(', ')}
                                </div>
                            )}
                            {analysis.prediction.factors.negative.length > 0 && (
                                <div className="text-red-600 text-xs">
                                    ⚠️ {analysis.prediction.factors.negative.join(', ')}
                                </div>
                            )}
                        </div>

                        {/* Следующий шаг */}
                        <div className="bg-yellow-50 p-3 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">🎯 Следующий шаг</h4>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge className={analysis.next_step.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}>
                                    {analysis.next_step.priority === 'high' ? 'Срочно' : 'Средний приоритет'}
                                </Badge>
                                <Badge variant="outline">
                                    {getActionIcon(analysis.next_step.action)} {analysis.next_step.action === 'call' ? 'Позвонить' :
                                    analysis.next_step.action === 'email' ? 'Написать' :
                                        analysis.next_step.action === 'meeting' ? 'Встреча' :
                                            analysis.next_step.action === 'demo' ? 'Демо' : 'Написать'}
                                </Badge>
                                <span className="text-xs text-gray-500">⏰ {analysis.next_step.timing}</span>
                            </div>
                            <p className="text-sm text-gray-700">{analysis.next_step.script}</p>
                            {analysis.next_step.suggested_time && (
                                <p className="text-xs text-gray-500 mt-2">Предлагаемое время: {analysis.next_step.suggested_time}</p>
                            )}
                        </div>

                        {/* Метрики менеджера */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">📈 Эффективность менеджера</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>⏱️ Среднее время ответа: {Math.round(analysis.manager_metrics.response_time_avg / 60)} мин</div>
                                <div>💬 Сообщений: {analysis.manager_metrics.messages_count}</div>
                                <div>👍 Позитивных сигналов: {analysis.manager_metrics.positive_signals}</div>
                                <div>👎 Негативных сигналов: {analysis.manager_metrics.negative_signals}</div>
                            </div>
                            <div className="mt-2">
                                <div className="flex justify-between text-xs">
                                    <span>Вовлеченность</span>
                                    <span>{analysis.manager_metrics.engagement_score}%</span>
                                </div>
                                <Progress value={analysis.manager_metrics.engagement_score} className="h-2" />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Вкладка Сообщения */}
                    <TabsContent value="messages" className="space-y-3 mt-3">
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                                {analysis.conversation_analysis?.map((msg: MessageAnalysis, i: number) => (
                                    <div key={msg.id || i} className="p-2 bg-gray-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-gray-500">
                                                {msg.author_name || (msg.is_client ? 'Клиент' : 'Менеджер')} • {msg.detected_intent}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {getSentimentEmoji(msg.sentiment)}
                                                {Math.round(msg.sentiment_score * 100)}%
                                            </Badge>
                                        </div>
                                        <p className="text-sm">{msg.text}</p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
