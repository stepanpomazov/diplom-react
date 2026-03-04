// app/dashboard/page.tsx
"use client"

import { useAuth } from "@/lib/auth-context"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
    const { user, isLoading, logout } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login')
        }
    }, [user, isLoading, router])

    if (isLoading) {
        return <div className="p-8">Загрузка...</div>
    }

    if (!user) {
        return null
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Дашборд</h1>
                <button
                    onClick={logout}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Выйти
                </button>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Информация о пользователе</h2>
                <pre className="bg-gray-100 p-4 rounded">
                    {JSON.stringify(user, null, 2)}
                </pre>
            </div>
        </div>
    )
}