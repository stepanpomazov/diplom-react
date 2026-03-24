// components/employee-dashboard.tsx
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import {
    TrendingUp,
    Calendar,
    RefreshCw,
    RussianRuble,
    ReceiptRussianRuble,
    Handshake,
    Info,
    User,
    Building2
} from "lucide-react"
import { ChatModal } from "@/components/chat-modal"

// Типы для данных
interface Deal {
    id: number
    name: string
    price: number
    status_id: number
    created_at: number
    _embedded?: {
        contacts?: Array<{ id: number; is_main?: boolean }>
        companies?: Array<{ id: number }>
    }
}

interface Stats {
    totalDeals: number
    totalAmount: number
    wonDeals: number
    lostDeals: number
    inProgress: number
    monthDeals: number
    monthAmount: number
    yearDeals: number
    yearAmount: number
    avgDealAmount: number
    conversion: number
}

interface DashboardData {
    user: {
        id: number
        name: string
        email: string
        role?: string
    }
    stats: Stats
    recentDeals: Deal[]
}

type MetricColor = 'blue' | 'green' | 'purple' | 'orange'
type StatColor = 'green' | 'red' | 'blue'

export function EmployeeDashboard() {
    const { user: authUser } = useAuth()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
    const [isChatOpen, setIsChatOpen] = useState(false)

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/user/stats', {
                credentials: 'include'
            })
            const json = await res.json()
            if (res.ok) {
                setData(json)
            } else {
                console.error('API error:', json.error)
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchStats()
    }

    const formatPrice = (price: number) => {
        if (price === 0) return '0 ₽'
        if (price >= 1000000) {
            return `${(price / 1000000).toFixed(1)}M ₽`
        }
        if (price >= 1000) {
            return `${(price / 1000).toFixed(1)}K ₽`
        }
        return `${price} ₽`
    }

    const getStatusText = (statusId: number) => {
        // Статусы из твоей воронки
        if (statusId === 142) return { text: 'Успешно', color: 'text-green-600' }
        if (statusId === 143) return { text: 'Проиграно', color: 'text-red-600' }
        if (statusId === 84493078 || statusId === 84493214) return { text: 'Неразобранное', color: 'text-gray-500' }
        if (statusId === 84493082) return { text: 'Первичный контакт', color: 'text-yellow-600' }
        if (statusId === 84493086) return { text: 'Переговоры', color: 'text-blue-600' }
        if (statusId === 84493090) return { text: 'Принимают решение', color: 'text-purple-600' }
        if (statusId === 84493094) return { text: 'Согласование', color: 'text-orange-600' }
        return { text: 'В работе', color: 'text-gray-600' }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="p-8 text-center">
                <div className="text-red-500 mb-4">Ошибка загрузки данных</div>
                <button
                    onClick={fetchStats}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                    Повторить
                </button>
            </div>
        )
    }

    const { stats, recentDeals } = data
    const userName = data.user?.name || authUser?.name || 'Сотрудник'

    const openChat = (deal: Deal) => {
        setSelectedDeal(deal)
        setIsChatOpen(true)
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Приветствие с кнопкой обновления */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Здравствуйте, {userName}!
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Ваша статистика продаж в amoCRM
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Обновить
                </button>
            </div>

            {/* Основные метрики */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard
                    title="Всего сделок"
                    value={stats.totalDeals}
                    icon={<Handshake className="h-6 w-6" />}
                    color="blue"
                />
                <MetricCard
                    title="Общая сумма"
                    value={formatPrice(stats.totalAmount)}
                    icon={<RussianRuble className="h-6 w-6" />}
                    color="green"
                />
                <MetricCard
                    title="Конверсия"
                    value={`${stats.conversion}%`}
                    icon={<TrendingUp className="h-6 w-6" />}
                    color="purple"
                />
                <MetricCard
                    title="Средний чек"
                    value={formatPrice(stats.avgDealAmount)}
                    icon={<ReceiptRussianRuble className="h-6 w-6" />}
                    color="orange"
                />
            </div>

            {/* Детальная статистика */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Успешные сделки
                    </h2>
                    <div className="space-y-3">
                        <StatRow
                            label="Всего"
                            value={stats.wonDeals}
                            total={stats.totalDeals}
                            color="green"
                        />
                        <StatRow
                            label="За месяц"
                            value={stats.monthDeals}
                            total={stats.totalDeals}
                            color="green"
                        />
                        <StatRow
                            label="За год"
                            value={stats.yearDeals}
                            total={stats.totalDeals}
                            color="green"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-500" />
                        Статусы сделок
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">В работе</span>
                            <span className="font-semibold text-blue-600">{stats.inProgress}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Выиграно</span>
                            <span className="font-semibold text-green-600">{stats.wonDeals}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Проиграно</span>
                            <span className="font-semibold text-red-600">{stats.lostDeals}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Последние сделки */}
            {recentDeals?.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border">
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Последние сделки
                        </h2>
                    </div>
                    <div className="divide-y">
                        {recentDeals.map((deal) => {
                            const mainContact = deal._embedded?.contacts?.find(c => c.is_main) || deal._embedded?.contacts?.[0]
                            const mainCompany = deal._embedded?.companies?.[0]

                            const contactDisplay = mainContact ? `Клиент ${mainContact.id}` : 'Нет контакта'
                            const companyDisplay = mainCompany ? `Компания ${mainCompany.id}` : ''
                            const status = getStatusText(deal.status_id)

                            return (
                                <div
                                    key={deal.id}
                                    onClick={() => openChat(deal)}
                                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">{deal.name}</h3>
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {contactDisplay}
                                                {companyDisplay && (
                                                    <>
                                                        <Building2 className="h-3 w-3 ml-2" />
                                                        {companyDisplay}
                                                    </>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                ID: {deal.id} • Создано: {new Date(deal.created_at * 1000).toLocaleDateString('ru-RU')}
                                            </p>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="font-semibold text-gray-900">
                                                {formatPrice(deal.price)}
                                            </p>
                                            <p className={`text-sm ${status.color}`}>
                                                {status.text}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
                    <Handshake className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Нет активных сделок</p>
                    <p className="text-sm mt-1">Сделки появятся здесь после начала общения с клиентами</p>
                </div>
            )}

            <ChatModal
                deal={selectedDeal ? {
                    id: selectedDeal.id,
                    name: selectedDeal.name,
                    price: selectedDeal.price,
                    contact_name: selectedDeal._embedded?.contacts?.[0]?.id
                        ? `Клиент ${selectedDeal._embedded.contacts[0].id}`
                        : undefined,
                    company_name: selectedDeal._embedded?.companies?.[0]?.id
                        ? `Компания ${selectedDeal._embedded.companies[0].id}`
                        : undefined
                } : null}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                userId={authUser?.id || 0}
                userName={authUser?.name || userName}
            />
        </div>
    )
}

// Компонент для карточки метрики
function MetricCard({ title, value, icon, color }: {
    title: string
    value: string | number
    icon: React.ReactNode
    color: MetricColor
}) {
    const colors: Record<MetricColor, string> = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600'
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    )
}

// Компонент для строки статистики
function StatRow({ label, value, total, color }: {
    label: string
    value: number
    total: number
    color: StatColor
}) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0
    const colors: Record<StatColor, string> = {
        green: 'text-green-600',
        red: 'text-red-600',
        blue: 'text-blue-600'
    }

    return (
        <div className="flex justify-between items-center">
            <span className="text-gray-600">{label}</span>
            <div className="flex items-center gap-3">
                <span className={`font-semibold ${colors[color]}`}>{value}</span>
                <span className="text-sm text-gray-400">({percentage}%)</span>
            </div>
        </div>
    )
}
