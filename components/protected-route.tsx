// components/protected-route.tsx
"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ProtectedRouteProps {
    children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !user) {
            // Если не авторизован и загрузка завершена, редиректим на логин
            router.push('/login')
        }
    }, [user, isLoading, router])

    // Показываем загрузку пока проверяем авторизацию
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Загрузка...</p>
                </div>
            </div>
        )
    }

    // Если пользователь авторизован, показываем дочерние компоненты
    if (user) {
        return <>{children}</>
    }

    // Если не авторизован, не показываем ничего (редирект уже сработал)
    return null
}