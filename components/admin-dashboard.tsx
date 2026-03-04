// components/admin-dashboard.tsx
"use client"

import { useState, useEffect } from "react"
import { DonutChart } from "@/components/donut-chart"
import { Button } from "@/components/ui/button"
import { Users, User, Loader2 } from "lucide-react"

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

interface DashboardData {
    aggregated: EmployeeStats
    employees: EmployeeStats[]
}

export function AdminDashboard() {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchAllStats = async () => {
            try {
                setLoading(true)
                const response = await fetch('/api/admin/stats', {
                    credentials: 'include'
                })

                const json = await response.json()

                if (!response.ok) {
                    // Вместо throw используем setError
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">Загрузка данных всех сотрудников....</p>
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
            {/* Заголовок */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

            {/* Кнопки выбора сотрудника */}
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

            {/* Основные метрики */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard
                    title="Всего сделок"
                    value={currentData.totalDeals}
                    subtitle={`На сумму ${(currentData.totalAmount / 1000).toFixed(1)}K ₽`}
                />
                <MetricCard
                    title="Успешные всего"
                    value={currentData.successTotal}
                    subtitle={`${Math.round((currentData.successTotal / (currentData.successTotal + currentData.failTotal || 1)) * 100)}% конверсия`}
                />
                <MetricCard
                    title="Продаж за месяц"
                    value={currentData.successMonth + currentData.failMonth}
                    subtitle={`${currentData.successMonth} успешных`}
                />
                <MetricCard
                    title="Новых клиентов"
                    value={currentData.newClientsMonth}
                    subtitle={`План: ${currentData.targetClientsMonth}`}
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
                    value2={currentData.targetClientsMonth - currentData.newClientsMonth}
                    label1="Привлечено"
                    label2="До плана"
                    color1="#8b5cf6"
                    color2="#374151"
                />
            </div>

            {/* Таблица всех сотрудников (показываем только в общем режиме) */}
            {selectedEmployeeId === null && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold mb-4">Все сотрудники</h2>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Имя</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Всего сделок</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Успешных</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">В этом месяце</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Новые клиенты</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                            {data.employees.map((emp) => (
                                <tr
                                    key={emp.employeeId}
                                    onClick={() => setSelectedEmployeeId(emp.employeeId)}
                                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {emp.employeeName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {/* Показываем email, если он есть, иначе прочерк */}
                                        {emp.employeeName.includes('@') ? emp.employeeName :
                                            data.employees.find(e => e.employeeId === emp.employeeId)?.employeeName || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{emp.totalDeals}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{emp.successTotal}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{emp.successMonth}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{emp.newClientsMonth}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

// Компонент для карточки метрики
function MetricCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    )
}