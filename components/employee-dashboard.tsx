"use client"

import { useState, useEffect } from "react"
// import { useAuth } from "@/lib/auth-context"
import { DonutChart } from "@/components/donut-chart"
import { Loader2 } from "lucide-react"

export function EmployeeDashboard() {
    const [data, setData] = useState<{ user: any; stats: any } | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const response = await fetch('/api/user/stats')

                if (!response.ok) {
                    // throw new Error('Failed to fetch stats')
                }

                const data = await response.json()
                setData(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ошибка загрузки')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">Загрузка данных из amoCRM...</p>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500">{error || 'Нет данных'}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Повторить
                    </button>
                </div>
            </div>
        )
    }

    const { user: amoCrmUser, stats } = data

    return (
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">
                        Здравствуйте, {amoCrmUser.name}!
                    </h2>
                    <p className="mt-1 text-muted-foreground">
                        Ваша статистика продаж в amoCRM
                    </p>
                </div>
                {amoCrmUser.avatar && (
                    <img
                        src={amoCrmUser.avatar}
                        alt={amoCrmUser.name}
                        className="h-12 w-12 rounded-full border-2 border-gray-200"
                    />
                )}
            </div>

            {/* Ваши графики... */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <DonutChart
                    title="Успешность продаж"
                    value1={stats.successTotal}
                    value2={stats.failTotal}
                    label1="Успешные"
                    label2="Неуспешные"
                    color1="#22c55e"
                    color2="#ef4444"
                />
                {/* остальные графики */}
            </div>
        </div>
    )
}