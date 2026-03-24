// lib/types/chat-analysis.ts

export interface MessageAnalysis {
    id: string
    text: string
    sentiment: 'positive' | 'neutral' | 'negative'
    sentiment_score: number
    detected_intent: string
    author_name: string
    is_client: boolean
}

export interface ChatAnalysis {
    summary: string
    client_sentiment: 'positive' | 'neutral' | 'negative'
    sentiment_score: number
    client_intent: string
    pain_points: string[]
    objections: string[]
    sales_stage: 'initial' | 'discussion' | 'negotiation' | 'closing' | 'lost'
    recommended_actions: string[]
    suggested_response: string
    next_best_action: string
    upsell_opportunity: boolean
    upsell_suggestion?: string
    urgency_level: 'low' | 'medium' | 'high'
    key_insights: string[]
    response_templates: string[]
    conversation_analysis: MessageAnalysis[]
}

// НОВЫЕ ТИПЫ ДЛЯ РАСШИРЕННОГО АНАЛИЗА
export interface ClientProfile {
    type: 'решающий' | 'аналитик' | 'эмоциональный' | 'избегающий'
    decision_speed: 'быстрый' | 'средний' | 'медленный'
    triggers: string[]
    communication_style: 'официальный' | 'дружеский' | 'деловой'
    risk_tolerance: 'высокий' | 'средний' | 'низкий'
    values: string[]
}

export interface Prediction {
    probability: number
    factors: {
        positive: string[]
        negative: string[]
    }
    estimated_close_date: string | null
    confidence_level: 'high' | 'medium' | 'low'
}

export interface NextStep {
    action: 'call' | 'email' | 'meeting' | 'demo' | 'whatsapp' | 'telegram'
    script: string
    timing: string
    priority: 'high' | 'medium' | 'low'
    suggested_time?: string
}

export interface ManagerMetrics {
    response_time_avg: number
    messages_count: number
    positive_signals: number
    negative_signals: number
    engagement_score: number
}

export interface ExtendedChatAnalysis extends ChatAnalysis {
    client_profile: ClientProfile
    prediction: Prediction
    next_step: NextStep
    manager_metrics: ManagerMetrics
    used_ai?: boolean
    contact?: {
        name?: string
        id?: number
    }
}
