// components/export-pdf-button.tsx
"use client"

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { ExtendedChatAnalysis } from '@/lib/types/chat-analysis'
import { useEffect, useState } from 'react'

// Регистрируем шрифты для поддержки кириллицы
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf' },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' }
    ]
})

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 10,
        fontFamily: 'Roboto'
    },
    title: {
        fontSize: 20,
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: 'bold'
    },
    subtitle: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 20,
        color: '#666'
    },
    section: {
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        borderBottomStyle: 'solid',
        paddingBottom: 10
    },
    heading: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 5,
        backgroundColor: '#f5f5f5',
        padding: 4
    },
    subheading: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        marginTop: 5
    },
    text: {
        fontSize: 10,
        marginBottom: 3,
        lineHeight: 1.4
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
        flexWrap: 'wrap'
    },
    label: {
        width: 120,
        fontWeight: 'bold',
        fontSize: 10
    },
    value: {
        flex: 1,
        fontSize: 10
    },
    badge: {
        backgroundColor: '#e5e7eb',
        padding: 2,
        borderRadius: 4,
        fontSize: 8,
        marginRight: 4
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8
    },
    card: {
        backgroundColor: '#f9f9f9',
        padding: 8,
        marginBottom: 8,
        borderRadius: 4
    },
    positive: {
        color: '#10b981'
    },
    negative: {
        color: '#ef4444'
    },
    neutral: {
        color: '#f59e0b'
    }
})

const AnalysisPDF = ({ analysis, contact, date }: { analysis: ExtendedChatAnalysis; contact: any; date: string }) => {
    // Безопасное получение данных
    const safeAnalysis = analysis || {}
    const safeContact = contact || { name: 'Неизвестно' }
    const safePrediction = safeAnalysis.prediction || { probability: 50, confidence_level: 'medium', factors: { positive: [], negative: [] } }
    const safeClientProfile = safeAnalysis.client_profile || { type: 'аналитик', decision_speed: 'средний', triggers: [], communication_style: 'деловой', risk_tolerance: 'средний', values: [] }
    const safeNextStep = safeAnalysis.next_step || { action: 'email', script: 'Свяжитесь с клиентом', timing: 'сегодня', priority: 'medium' }
    const safeManagerMetrics = safeAnalysis.manager_metrics || { response_time_avg: 0, messages_count: 0, positive_signals: 0, negative_signals: 0, engagement_score: 0 }

    const getSentimentText = (sentiment: string) => {
        if (sentiment === 'positive') return 'Позитивная'
        if (sentiment === 'negative') return 'Негативная'
        return 'Нейтральная'
    }

    const getStageText = (stage: string) => {
        const stages: Record<string, string> = {
            initial: 'Начальная',
            discussion: 'Обсуждение',
            negotiation: 'Торг',
            closing: 'Закрытие',
            lost: 'Потеряна'
        }
        return stages[stage] || stage
    }

    const getActionText = (action: string) => {
        const actions: Record<string, string> = {
            call: '📞 Позвонить',
            email: '✉️ Написать',
            meeting: '🤝 Встреча',
            demo: '🎥 Демонстрация',
            whatsapp: '💬 WhatsApp',
            telegram: '💬 Telegram'
        }
        return actions[action] || action
    }

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Заголовок */}
                <Text style={styles.title}>📊 Анализ диалога</Text>
                <Text style={styles.subtitle}>Сгенерировано AI • {date}</Text>

                {/* Информация о клиенте */}
                <View style={styles.section}>
                    <Text style={styles.heading}>👤 Информация о клиенте</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Имя:</Text>
                        <Text style={styles.value}>{safeContact.name}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Намерение:</Text>
                        <Text style={styles.value}>{safeAnalysis.client_intent || 'не определено'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Тональность:</Text>
                        <Text style={[styles.value, styles[safeAnalysis.client_sentiment as keyof typeof styles]]}>
                            {getSentimentText(safeAnalysis.client_sentiment)} ({Math.round((safeAnalysis.sentiment_score || 0) * 100)}%)
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Стадия сделки:</Text>
                        <Text style={styles.value}>{getStageText(safeAnalysis.sales_stage)}</Text>
                    </View>
                </View>

                {/* Прогноз */}
                <View style={styles.section}>
                    <Text style={styles.heading}>📈 Прогноз сделки</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Вероятность:</Text>
                        <Text style={[styles.value, styles.positive]}>{safePrediction.probability}%</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Уверенность:</Text>
                        <Text style={styles.value}>
                            {safePrediction.confidence_level === 'high' ? 'Высокая' :
                                safePrediction.confidence_level === 'medium' ? 'Средняя' : 'Низкая'}
                        </Text>
                    </View>
                    {safePrediction.factors.positive.length > 0 && (
                        <View>
                            <Text style={styles.subheading}>✅ Положительные факторы:</Text>
                            {safePrediction.factors.positive.map((f: string, i: number) => (
                                <Text key={i} style={styles.text}>• {f}</Text>
                            ))}
                        </View>
                    )}
                    {safePrediction.factors.negative.length > 0 && (
                        <View>
                            <Text style={styles.subheading}>⚠️ Отрицательные факторы:</Text>
                            {safePrediction.factors.negative.map((f: string, i: number) => (
                                <Text key={i} style={styles.text}>• {f}</Text>
                            ))}
                        </View>
                    )}
                </View>

                {/* Профиль клиента */}
                <View style={styles.section}>
                    <Text style={styles.heading}>🧠 Профиль клиента</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Тип:</Text>
                        <Text style={styles.value}>{safeClientProfile.type}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Скорость решений:</Text>
                        <Text style={styles.value}>{safeClientProfile.decision_speed}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Стиль общения:</Text>
                        <Text style={styles.value}>{safeClientProfile.communication_style}</Text>
                    </View>
                    {safeClientProfile.values.length > 0 && (
                        <View>
                            <Text style={styles.subheading}>Ценности:</Text>
                            <View style={styles.grid}>
                                {safeClientProfile.values.map((v: string, i: number) => (
                                    <Text key={i} style={styles.badge}> {v} </Text>
                                ))}
                            </View>
                        </View>
                    )}
                    {safeClientProfile.triggers.length > 0 && (
                        <View>
                            <Text style={styles.subheading}>Триггеры:</Text>
                            {safeClientProfile.triggers.map((t: string, i: number) => (
                                <Text key={i} style={styles.text}>✨ {t}</Text>
                            ))}
                        </View>
                    )}
                </View>

                {/* Рекомендации */}
                <View style={styles.section}>
                    <Text style={styles.heading}>💡 Рекомендации</Text>
                    {safeAnalysis.recommended_actions && safeAnalysis.recommended_actions.length > 0 ? (
                        safeAnalysis.recommended_actions.map((action: string, i: number) => (
                            <Text key={i} style={styles.text}>• {action}</Text>
                        ))
                    ) : (
                        <Text style={styles.text}>• Продолжить диалог, уточнить потребности</Text>
                    )}
                </View>

                {/* Следующий шаг */}
                <View style={styles.section}>
                    <Text style={styles.heading}>🎯 Следующий шаг</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Действие:</Text>
                            <Text style={styles.value}>{getActionText(safeNextStep.action)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Приоритет:</Text>
                            <Text style={styles.value}>
                                {safeNextStep.priority === 'high' ? '🔴 Высокий' :
                                    safeNextStep.priority === 'medium' ? '🟡 Средний' : '🟢 Низкий'}
                            </Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Когда:</Text>
                            <Text style={styles.value}>{safeNextStep.timing}</Text>
                        </View>
                        <Text style={styles.subheading}>Сценарий:</Text>
                        <Text style={styles.text}>{safeNextStep.script}</Text>
                    </View>
                </View>

                {/* Ключевые инсайты */}
                {safeAnalysis.key_insights && safeAnalysis.key_insights.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.heading}>✨ Ключевые инсайты</Text>
                        {safeAnalysis.key_insights.map((insight: string, i: number) => (
                            <Text key={i} style={styles.text}>✨ {insight}</Text>
                        ))}
                    </View>
                )}

                {/* Метрики менеджера */}
                <View style={styles.section}>
                    <Text style={styles.heading}>📊 Эффективность менеджера</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Сообщений:</Text>
                        <Text style={styles.value}>{safeManagerMetrics.messages_count}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Время ответа:</Text>
                        <Text style={styles.value}>{Math.round(safeManagerMetrics.response_time_avg / 60)} мин</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Позитивные сигналы:</Text>
                        <Text style={[styles.value, styles.positive]}>{safeManagerMetrics.positive_signals}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Негативные сигналы:</Text>
                        <Text style={[styles.value, styles.negative]}>{safeManagerMetrics.negative_signals}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Вовлеченность:</Text>
                        <Text style={styles.value}>{safeManagerMetrics.engagement_score}%</Text>
                    </View>
                </View>

                {/* Предлагаемый ответ */}
                {safeAnalysis.suggested_response && (
                    <View style={styles.section}>
                        <Text style={styles.heading}>💬 Предлагаемый ответ</Text>
                        <View style={styles.card}>
                            <Text style={styles.text}>{safeAnalysis.suggested_response}</Text>
                        </View>
                    </View>
                )}

                <Text style={{ fontSize: 8, textAlign: 'center', marginTop: 20, color: '#999' }}>
                    Отчет сгенерирован автоматически AI-ассистентом
                </Text>
            </Page>
        </Document>
    )
}

export function ExportPDFButton({ analysis, contact }: { analysis: ExtendedChatAnalysis; contact: any }) {
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    if (!analysis || !isClient) return null

    const date = new Date().toLocaleString('ru-RU')

    return (
        <PDFDownloadLink
            document={<AnalysisPDF analysis={analysis} contact={contact} date={date} />}
            fileName={`chat-analysis-${Date.now()}.pdf`}
        >
            {({ loading }) => (
                <Button variant="outline" size="sm" disabled={loading} className="gap-1">
                    <Download className="h-4 w-4" />
                    {loading ? 'Генерация...' : 'PDF'}
                </Button>
            )}
        </PDFDownloadLink>
    )
}
