// components/admin-dashboard.tsx
"use client"

import { useState, useEffect } from "react"
import { DonutChart } from "@/components/donut-chart"
import { Button } from "@/components/ui/button"
import { Users, User, Loader2, Calendar, Handshake, TrendingUp, UserCircle, Building2, ChevronLeft } from "lucide-react"
import { ChatModal } from "@/components/chat-modal"

// Типы для данных
export interface Employee {
    id: number
    name: string
    email: string
}

interface EmployeeStats {
    employeeId: number
    employeeName: string
    totalDeals: number
    totalAmount: number
    successTotal: number
    failTotal: number
    successMonth: number
    failMonth: number
    newClientsMonth: number
    targetClientsMonth: number
}

interface Deal {
    id: number
    name: string
    price: number
    status_id: number
    created_at: number
    responsible_user_id: number
    _embedded?: {
        contacts?: Array<{ id: number; is_main?: boolean }>
        companies?: Array<{ id: number }>
    }
}

interface DashboardData {
    aggregated: EmployeeStats
    employees: EmployeeStats[]
}

export function AdminDashboard() {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [employeeDeals, setEmployeeDeals] = useState<Deal[]>([])
    const [dealsLoading, setDealsLoading] = useState(false)
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
    const [isChatOpen, setIsChatOpen] = useState(false)

    useEffect(() => {
        const fetchAllStats = async () => {
            try {
                setLoading(true)
                const response = await fetch('/api/admin/stats', {
                    credentials: 'include'
                })

                const json = await response.json()

                if (!response.ok) {
                    setError(json.error || 'Failed to fetch stats')
                    return
                }

                setData(json)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ошибка загрузки')
            } finally {
                setLoading(false)
            }
        }

        fetchAllStats()
    }, [])

    // Загрузка сделок выбранного сотрудника (через user stats API)
    useEffect(() => {
        const fetchEmployeeDeals = async () => {
            if (!selectedEmployeeId) {
                setEmployeeDeals([])
                return
            }

            setDealsLoading(true)
            try {
                // Используем тот же API, что и для сотрудника, но с параметром userId
                const response = await fetch(`/api/user/${selectedEmployeeId}/deals`, {
                    credentials: 'include'
                })
                const json = await response.json()
                if (response.ok) {
                    setEmployeeDeals(json.deals || [])
                } else {
                    console.error('Failed to fetch employee deals:', json.error)
                }
            } catch (error) {
                console.error('Error fetching employee deals:', error)
            } finally {
                setDealsLoading(false)
            }
        }

        fetchEmployeeDeals()
    }, [selectedEmployeeId])

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
        if (statusId === 142) return { text: 'Успешно', color: 'text-green-600', bg: 'bg-green-50' }
        if (statusId === 143) return { text: 'Проиграно', color: 'text-red-600', bg: 'bg-red-50' }
        if (statusId === 84493078 || statusId === 84493214) return { text: 'Неразобранное', color: 'text-gray-500', bg: 'bg-gray-50' }
        if (statusId === 84493082) return { text: 'Первичный контакт', color: 'text-yellow-600', bg: 'bg-yellow-50' }
        if (statusId === 84493086) return { text: 'Переговоры', color: 'text-blue-600', bg: 'bg-blue-50' }
        if (statusId === 84493090) return { text: 'Принимают решение', color: 'text-purple-600', bg: 'bg-purple-50' }
        if (statusId === 84493094) return { text: 'Согласование', color: 'text-orange-600', bg: 'bg-orange-50' }
        return { text: 'В работе', color: 'text-gray-600', bg: 'bg-gray-50' }
    }

    const openChat = (deal: Deal) => {
        setSelectedDeal(deal)
        setIsChatOpen(true)
    }

    const handleBack = () => {
        setSelectedEmployeeId(null)
        setEmployeeDeals([])
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">Загрузка данных всех сотрудников...</p>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500">{error || 'Нет данных'}</p>
                    <Button
                        onClick={() => window.location.reload()}
                        className="mt-4"
                    >
                        Повторить
                    </Button>
                </div>
            </div>
        )
    }

    const currentData = selectedEmployeeId
        ? data.employees.find(e => e.employeeId === selectedEmployeeId)!
        : data.aggregated

    const currentEmployeeName = selectedEmployeeId
        ? data.employees.find(e => e.employeeId === selectedEmployeeId)?.employeeName
        : 'Все сотрудники'

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Заголовок с кнопкой назад */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    {selectedEmployeeId && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                            className="gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Назад
                        </Button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {selectedEmployeeId ? currentEmployeeName : 'Общая статистика'}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {selectedEmployeeId
                                ? "Индивидуальная статистика сотрудника"
                                : "Суммарная статистика по всем сотрудникам"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Кнопки выбора сотрудника (только в общем режиме) */}
            {!selectedEmployeeId && (
                <div className="mb-8 flex flex-wrap gap-2">
                    <Button
                        variant={selectedEmployeeId === null ? "default" : "outline"}
                        onClick={() => setSelectedEmployeeId(null)}
                        className="gap-2"
                    >
                        <Users className="h-4 w-4" />
                        Все сотрудники
                    </Button>
                    {data.employees.map((employee) => (
                        <Button
                            key={employee.employeeId}
                            variant={selectedEmployeeId === employee.employeeId ? "default" : "outline"}
                            onClick={() => setSelectedEmployeeId(employee.employeeId)}
                            className="gap-2"
                        >
                            <User className="h-4 w-4" />
                            {employee.employeeName.split(' ')[0]}
                        </Button>
                    ))}
                </div>
            )}

            {/* Основные метрики */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard
                    title="Всего сделок"
                    value={currentData.totalDeals}
                    icon={<Handshake className="h-5 w-5" />}
                    subtitle={`На сумму ${(currentData.totalAmount / 1000).toFixed(1)}K ₽`}
                    color="blue"
                />
                <MetricCard
                    title="Успешные сделки"
                    value={currentData.successTotal}
                    icon={<TrendingUp className="h-5 w-5" />}
                    subtitle={`${Math.round((currentData.successTotal / (currentData.successTotal + currentData.failTotal || 1)) * 100)}% конверсия`}
                    color="green"
                />
                <MetricCard
                    title="Продажи за месяц"
                    value={currentData.successMonth + currentData.failMonth}
                    icon={<Calendar className="h-5 w-5" />}
                    subtitle={`${currentData.successMonth} успешных`}
                    color="purple"
                />
                <MetricCard
                    title="Новых клиентов"
                    value={currentData.newClientsMonth}
                    icon={<UserCircle className="h-5 w-5" />}
                    subtitle={`План: ${currentData.targetClientsMonth}`}
                    color="orange"
                />
            </div>

            {/* Графики */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <DonutChart
                    title="Продажи за все время"
                    value1={currentData.successTotal}
                    value2={currentData.failTotal}
                    label1="Успешные"
                    label2="Неуспешные"
                    color1="#22c55e"
                    color2="#ef4444"
                />
                <DonutChart
                    title="Продажи за месяц"
                    value1={currentData.successMonth}
                    value2={currentData.failMonth}
                    label1="Успешные"
                    label2="Неуспешные"
                    color1="#3b82f6"
                    color2="#f59e0b"
                />
                <DonutChart
                    title="Новые клиенты"
                    value1={currentData.newClientsMonth}
                    value2={Math.max(0, currentData.targetClientsMonth - currentData.newClientsMonth)}
                    label1="Привлечено"
                    label2="До плана"
                    color1="#8b5cf6"
                    color2="#374151"
                />
            </div>

            {/* Список сделок сотрудника (при выборе конкретного) */}
            {selectedEmployeeId && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Handshake className="h-5 w-5" />
                            Сделки сотрудника
                        </h2>
                        <span className="text-sm text-gray-500">
                            Всего: {employeeDeals.length} сделок
                        </span>
                    </div>

                    {dealsLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : employeeDeals.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
                            <Handshake className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>Нет активных сделок у этого сотрудника</p>
                            <p className="text-sm mt-1">Сделки появятся здесь после начала общения с клиентами</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <div className="divide-y">
                                {employeeDeals.map((deal) => {
                                    const mainContact = deal._embedded?.contacts?.find(c => c.is_main) || deal._embedded?.contacts?.[0]
                                    const mainCompany = deal._embedded?.companies?.[0]
                                    const status = getStatusText(deal.status_id)

                                    const contactDisplay = mainContact ? `Клиент ${mainContact.id}` : 'Нет контакта'
                                    const companyDisplay = mainCompany ? `Компания ${mainCompany.id}` : ''

                                    return (
                                        <div
                                            key={deal.id}
                                            onClick={() => openChat(deal)}
                                            className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-medium text-gray-900">{deal.name}</h3>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                                                            {status.text}
                                                        </span>
                                                    </div>
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
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Таблица всех сотрудников (показываем только в общем режиме) */}
            {!selectedEmployeeId && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Все сотрудники
                    </h2>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Сотрудник</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Всего сделок</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Сумма</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Успешных</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Конверсия</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">За месяц</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Новые клиенты</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                            {data.employees.map((emp) => {
                                const conversion = emp.successTotal + emp.failTotal > 0
                                    ? Math.round((emp.successTotal / (emp.successTotal + emp.failTotal)) * 100)
                                    : 0
                                return (
                                    <tr
                                        key={emp.employeeId}
                                        onClick={() => setSelectedEmployeeId(emp.employeeId)}
                                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900">{emp.employeeName}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{emp.totalDeals}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{formatPrice(emp.totalAmount)}</td>
                                        <td className="px-6 py-4 text-sm text-green-600 font-medium">{emp.successTotal}</td>
                                        <td className="px-6 py-4">
                                                <span className={`text-sm font-medium ${conversion >= 50 ? 'text-green-600' : conversion >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {conversion}%
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{emp.successMonth}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{emp.newClientsMonth}</td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
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
                userId={selectedEmployeeId || 0}
                userName={currentEmployeeName || ''}
            />
        </div>
    )
}

// Компонент для карточки метрики
function MetricCard({ title, value, icon, subtitle, color }: {
    title: string
    value: string | number
    icon?: React.ReactNode
    subtitle?: string
    color?: 'blue' | 'green' | 'purple' | 'orange'
}) {
    const colors = {
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
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                {icon && (
                    <div className={`p-2 rounded-lg ${color ? colors[color] : 'bg-gray-50 text-gray-600'}`}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    )
}
