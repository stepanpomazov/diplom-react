// app/api/chats/[chatId]/analyze/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
    MessageAnalysis,
    ExtendedChatAnalysis,
    ClientProfile,
    Prediction,
    NextStep,
    ManagerMetrics
} from '@/lib/types/chat-analysis'


// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

async function callYandexGPT(prompt: string, timeoutMs: number = 20000): Promise<string> {
    const apiKey = process.env.YANDEX_API_KEY
    const folderId = process.env.YANDEX_FOLDER_ID

    if (!apiKey || !folderId) {
        throw new Error('YandexGPT credentials not configured')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Api-Key ${apiKey}`
            },
            body: JSON.stringify({
                modelUri: `gpt://${folderId}/yandexgpt-lite`,
                completionOptions: {
                    stream: false,
                    temperature: 0.7,
                    maxTokens: 3000
                },
                messages: [{ role: 'user', text: prompt }]
            }),
            signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`YandexGPT API error: ${response.status} - ${error}`)
        }

        const data = await response.json()
        return data.result.alternatives[0].message.text
    } catch (error: any) {
        clearTimeout(timeoutId)
        if (error.name === 'AbortError') throw new Error('YandexGPT timeout')
        throw error
    }
}

function calculateManagerMetrics(messages: any[], conversationAnalysis?: MessageAnalysis[]): ManagerMetrics {
    const managerMessages = messages.filter(m => !m.is_client)

    if (managerMessages.length === 0) {
        return {
            response_time_avg: 0,
            messages_count: 0,
            positive_signals: 0,
            negative_signals: 0,
            engagement_score: 0
        }
    }

    // Расчет среднего времени ответа
    let totalResponseTime = 0
    let responseCount = 0

    for (let i = 1; i < messages.length; i++) {
        if (!messages[i].is_client && messages[i-1].is_client) {
            const responseTime = messages[i].created_at - messages[i-1].created_at
            if (responseTime > 0 && responseTime < 86400) {
                totalResponseTime += responseTime
                responseCount++
            }
        }
    }

    const responseTimeAvg = responseCount > 0 ? totalResponseTime / responseCount : 0

    // Считаем позитивные и негативные сигналы из анализа сообщений
    let positiveSignals = 0
    let negativeSignals = 0

    if (conversationAnalysis) {
        // Используем уже проанализированные сообщения
        for (const msg of managerMessages) {
            const analyzed = conversationAnalysis.find(m => m.id === msg.id)
            if (analyzed) {
                if (analyzed.sentiment === 'positive') {
                    positiveSignals++
                } else if (analyzed.sentiment === 'negative') {
                    negativeSignals++
                }
            }
        }
    } else {
        // Fallback: поиск по ключевым словам
        const positiveWords = ['спасибо', 'отлично', 'помогу', 'рад', 'хорошо', 'конечно', '!']
        const negativeWords = ['извините', 'к сожалению', 'жаль', 'проблема']

        for (const msg of managerMessages) {
            const text = msg.text.toLowerCase()
            if (positiveWords.some(w => text.includes(w))) positiveSignals++
            if (negativeWords.some(w => text.includes(w))) negativeSignals++
        }
    }

    // Расчет вовлеченности (engagement_score)
    let engagementScore = 0

    // За быстрые ответы (< 2 минут) +20, < 5 минут +10
    if (responseTimeAvg < 120) engagementScore += 20
    else if (responseTimeAvg < 300) engagementScore += 10

    // За количество сообщений
    engagementScore += Math.min(30, managerMessages.length * 5)

    // За позитивные сигналы
    engagementScore += Math.min(30, positiveSignals * 10)

    // Штраф за негативные сигналы
    engagementScore -= Math.min(20, negativeSignals * 10)

    // За энтузиазм (восклицательные знаки)
    const enthusiasmCount = managerMessages.filter(m => m.text.includes('!')).length
    engagementScore += Math.min(15, enthusiasmCount * 5)

    return {
        response_time_avg: responseTimeAvg,
        messages_count: managerMessages.length,
        positive_signals: positiveSignals,
        negative_signals: negativeSignals,
        engagement_score: Math.max(0, Math.min(100, engagementScore))
    }
}

// Функция для анализа сообщений с определением тональности
function enrichMessagesWithSentiment(messages: any[]): MessageAnalysis[] {
    return messages.map((msg: any) => {
        const text = msg.text.toLowerCase()
        let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
        let sentiment_score = 0
        let detected_intent = 'общение'

        // Позитивные маркеры
        const positivePatterns = [
            { pattern: /спасибо|благодарю/i, score: 0.8, intent: 'благодарность' },
            { pattern: /отлично|прекрасно|замечательно/i, score: 0.7, intent: 'положительная оценка' },
            { pattern: /!.*да|!.*хорошо|!.*конечно/i, score: 0.6, intent: 'энтузиазм' },
            { pattern: /\bда\b(?!\?)/i, score: 0.4, intent: 'согласие' },
            { pattern: /конечно|разумеется/i, score: 0.5, intent: 'согласие' },
            { pattern: /хорошо|ладно/i, score: 0.4, intent: 'согласие' },
            { pattern: /рад|приятно/i, score: 0.5, intent: 'положительная эмоция' }
        ]

        // Негативные маркеры
        const negativePatterns = [
            { pattern: /\bнет\b(?!\?)/i, score: -0.6, intent: 'отказ' },
            { pattern: /не хочу|не буду|не надо/i, score: -0.7, intent: 'отказ' },
            { pattern: /жаль|к сожалению/i, score: -0.5, intent: 'сожаление' },
            { pattern: /плохо|ужасно|негативно/i, score: -0.6, intent: 'негативная оценка' },
            { pattern: /не подходит|не устраивает/i, score: -0.5, intent: 'недовольство' }
        ]

        // Вопросы
        const questionPatterns = [
            { pattern: /сколько стоит|цена|стоимость|тариф/i, intent: 'вопрос о цене' },
            { pattern: /как|почему|зачем|что за/i, intent: 'вопрос' },
            { pattern: /когда|во сколько/i, intent: 'вопрос о сроках' }
        ]

        // Приветствия и прощания
        if (/здравствуйте|привет|добрый день|доброе утро/i.test(text)) {
            detected_intent = 'приветствие'
        } else if (/до свидания|пока|удачи|всего хорошего/i.test(text)) {
            detected_intent = 'прощание'
        }

        // Проверяем позитивные маркеры
        for (const p of positivePatterns) {
            if (p.pattern.test(text)) {
                sentiment = 'positive'
                sentiment_score = Math.max(sentiment_score, p.score)
                if (detected_intent === 'общение') detected_intent = p.intent
            }
        }

        // Проверяем негативные маркеры
        for (const p of negativePatterns) {
            if (p.pattern.test(text)) {
                sentiment = 'negative'
                sentiment_score = Math.min(sentiment_score, p.score)
                if (detected_intent === 'общение') detected_intent = p.intent
            }
        }

        // Проверяем вопросы (если еще не определили)
        if (detected_intent === 'общение' && text.includes('?')) {
            for (const q of questionPatterns) {
                if (q.pattern.test(text)) {
                    detected_intent = q.intent
                    break
                }
            }
            if (detected_intent === 'общение') detected_intent = 'вопрос'
        }

        // Особые случаи
        if (text.includes('подключайте') && text.includes('спасибо')) {
            sentiment = 'positive'
            sentiment_score = 0.9
            detected_intent = 'согласие с благодарностью'
        }

        if (text.includes('!') && !text.includes('?')) {
            sentiment_score = Math.max(sentiment_score, 0.3)
        }

        return {
            id: msg.id,
            text: msg.text,
            sentiment: sentiment,
            sentiment_score: Math.min(0.9, Math.max(-0.9, sentiment_score)),
            detected_intent: detected_intent,
            author_name: msg.author_name,
            is_client: msg.is_client
        }
    })
}

function createEnhancedPrompt(conversationText: string, contactName: string, messageCount: number): string {
    return `Ты — лучший менеджер по продажам с 10-летним опытом. Проанализируй диалог.

ДИАЛОГ (каждое сообщение имеет уникальный ID):
${conversationText}

КОНТЕКСТ:
- Клиент: ${contactName || 'Неизвестно'}
- Сообщений: ${messageCount}

Верни строго JSON:

{
    "summary": "краткое содержание",
    "client_sentiment": "positive/neutral/negative",
    "sentiment_score": число от -1 до 1,
    "client_intent": "намерение клиента",
    "pain_points": [],
    "objections": [],
    "sales_stage": "initial/discussion/negotiation/closing/lost",
    "recommended_actions": [],
    "suggested_response": "готовое сообщение",
    "next_best_action": "следующее действие",
    "upsell_opportunity": true/false,
    "upsell_suggestion": "предложение",
    "urgency_level": "low/medium/high",
    "key_insights": [],
    "response_templates": [],
    
    "client_profile": {
        "type": "решающий/аналитик/эмоциональный/избегающий",
        "decision_speed": "быстрый/средний/медленный",
        "triggers": [],
        "communication_style": "официальный/дружеский/деловой",
        "risk_tolerance": "высокий/средний/низкий",
        "values": []
    },
    
    "prediction": {
        "probability": число 0-100,
        "factors": {"positive": [], "negative": []},
        "estimated_close_date": null,
        "confidence_level": "high/medium/low"
    },
    
    "next_step": {
        "action": "call/email/meeting/demo/whatsapp/telegram",
        "script": "готовый сценарий",
        "timing": "сегодня/завтра/на этой неделе",
        "priority": "high/medium/low"
    }
}`
}

function simpleFallbackAnalysis(messages: any[], managerMetrics: ManagerMetrics): ExtendedChatAnalysis {
    const allText = messages.map(m => m.text.toLowerCase()).join(' ')

    let clientIntent = 'общение'
    if (allText.includes('интеграцию') || allText.includes('поможете')) clientIntent = 'запрос помощи'
    if (allText.includes('предложение')) clientIntent = 'предложение'
    if (allText.includes('нет') || allText.includes('не хочу')) clientIntent = 'отказ'
    if (allText.includes('?')) clientIntent = 'вопрос'

    let salesStage: any = 'initial'
    if (allText.includes('тариф') || allText.includes('цена')) salesStage = 'discussion'
    if (allText.includes('да') && allText.includes('подключайте')) salesStage = 'closing'

    const clientProfile: ClientProfile = {
        type: allText.includes('сколько') ? 'аналитик' : allText.includes('спасибо') ? 'эмоциональный' : 'решающий',
        decision_speed: allText.includes('срочно') ? 'быстрый' : 'средний',
        triggers: allText.includes('интеграцию') ? ['интеграция CRM'] : [],
        communication_style: allText.includes('спасибо') ? 'дружеский' : 'деловой',
        risk_tolerance: 'средний',
        values: ['качество', 'сервис']
    }

    const probability = 50 + (messages.filter(m => m.text.toLowerCase().includes('спасибо')).length * 10)
    const prediction: Prediction = {
        probability: Math.min(100, probability),
        factors: { positive: ['Есть позитивные сигналы'], negative: [] },
        estimated_close_date: null,
        confidence_level: probability > 70 ? 'high' : probability > 40 ? 'medium' : 'low'
    }

    const nextStep: NextStep = {
        action: salesStage === 'closing' ? 'call' : 'email',
        script: clientIntent === 'запрос помощи' ? 'Здравствуйте! Расскажите подробнее о ваших задачах.' : 'Свяжитесь с клиентом для уточнения.',
        timing: 'сегодня',
        priority: salesStage === 'closing' ? 'high' : 'medium'
    }

    // Используем enrichMessagesWithSentiment для анализа сообщений
    const conversationAnalysis = enrichMessagesWithSentiment(messages)

    return {
        summary: clientIntent === 'запрос помощи' ? 'Клиент просит помочь с интеграцией CRM' : 'Диалог требует внимания',
        client_sentiment: 'neutral',
        sentiment_score: 0,
        client_intent: clientIntent,
        pain_points: [],
        objections: [],
        sales_stage: salesStage,
        recommended_actions: salesStage === 'closing' ? ['Завершите сделку', 'Поблагодарите клиента'] : ['Уточните потребности'],
        suggested_response: nextStep.script,
        next_best_action: nextStep.script,
        upsell_opportunity: false,
        urgency_level: 'medium',
        key_insights: [],
        response_templates: [],
        conversation_analysis: conversationAnalysis,
        client_profile: clientProfile,
        prediction: prediction,
        next_step: nextStep,
        manager_metrics: managerMetrics
    }
}

// ========== ОСНОВНОЙ ЭНДПОИНТ ==========

export async function GET(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
    try {
        const { chatId } = await params
        console.log('[Analyze] Enhanced analysis for chat:', chatId)

        const cookieStore = await cookies()
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        const messagesRes = await fetch(`${baseUrl}/api/amocrm/chats/${chatId}/messages`, {
            headers: { 'Cookie': cookieStore.toString() }
        })

        if (!messagesRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: messagesRes.status })
        }

        const { messages, contact } = await messagesRes.json()

        if (!messages || messages.length === 0) {
            return NextResponse.json({ success: true, analysis: null, message: 'Нет сообщений для анализа' })
        }

        // СНАЧАЛА анализируем сообщения
        const conversationAnalysis = enrichMessagesWithSentiment(messages)

        // ПЕРЕДАЕМ conversationAnalysis в calculateManagerMetrics
        const managerMetrics = calculateManagerMetrics(messages, conversationAnalysis)

        let analysis: ExtendedChatAnalysis
        let usedAI = false

        try {
            const conversationText = messages.map((msg: any) => {
                const sender = msg.is_client ? 'Клиент' : 'Менеджер'
                return `[ID: ${msg.id}] ${sender} (${msg.author_name}): ${msg.text}`
            }).join('\n')

            const prompt = createEnhancedPrompt(conversationText, contact?.name, messages.length)
            const aiResponse = await callYandexGPT(prompt)
            const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const aiAnalysis = JSON.parse(cleanResponse)

            analysis = {
                summary: aiAnalysis.summary || 'Диалог требует внимания',
                client_sentiment: aiAnalysis.client_sentiment || 'neutral',
                sentiment_score: aiAnalysis.sentiment_score || 0,
                client_intent: aiAnalysis.client_intent || 'не определено',
                pain_points: aiAnalysis.pain_points || [],
                objections: aiAnalysis.objections || [],
                sales_stage: aiAnalysis.sales_stage || 'initial',
                recommended_actions: aiAnalysis.recommended_actions || ['Продолжить диалог'],
                suggested_response: aiAnalysis.suggested_response || '',
                next_best_action: aiAnalysis.next_best_action || 'Уточнить потребности',
                upsell_opportunity: aiAnalysis.upsell_opportunity || false,
                upsell_suggestion: aiAnalysis.upsell_suggestion,
                urgency_level: aiAnalysis.urgency_level || 'medium',
                key_insights: aiAnalysis.key_insights || [],
                response_templates: aiAnalysis.response_templates || [],
                conversation_analysis: conversationAnalysis,
                client_profile: aiAnalysis.client_profile || {
                    type: 'аналитик', decision_speed: 'средний', triggers: [],
                    communication_style: 'деловой', risk_tolerance: 'средний', values: ['качество']
                },
                prediction: aiAnalysis.prediction || { probability: 50, factors: { positive: [], negative: [] }, estimated_close_date: null, confidence_level: 'medium' },
                next_step: aiAnalysis.next_step || { action: 'email', script: 'Свяжитесь с клиентом', timing: 'сегодня', priority: 'medium' },
                manager_metrics: managerMetrics
            }
            usedAI = true
            console.log('[Analyze] Enhanced analysis complete')

        } catch (error) {
            console.error('[Analyze] YandexGPT failed, using fallback:', error)
            analysis = simpleFallbackAnalysis(messages, managerMetrics)
            analysis.conversation_analysis = conversationAnalysis
        }

        return NextResponse.json({
            success: true,
            analysis,
            messages_count: messages.length,
            used_ai: usedAI,
            contact: { name: contact?.name, id: contact?.id }
        })

    } catch (error: any) {
        console.error('[Analyze Chat] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
