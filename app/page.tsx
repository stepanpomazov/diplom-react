// app/page.tsx
"use client"

import { useState } from "react"
import { useAuth, AuthProvider } from "@/lib/auth-context"
import { LoginForm } from "@/components/login-form"
import { DashboardHeader } from "@/components/dashboard-header"
import { EmployeeDashboard } from "@/components/employee-dashboard"
import { AdminDashboard } from "@/components/admin-dashboard"

function AppContent() {
    const { user, isLoading } = useAuth()
    const [adminViewMode, setAdminViewMode] = useState<"admin" | "employee">("admin")

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        )
    }

    if (!user) {
        return <LoginForm />
    }

    // Определяем какой дашборд показывать
    const getDashboard = () => {
        if (user.role === "employee") {
            return <EmployeeDashboard />
        }
        // Для админа показываем выбранный режим
        if (adminViewMode === "admin") {
            return <AdminDashboard />
        }
        return <EmployeeDashboard />
    }

    return (
        <div className="min-h-screen bg-background">
            <DashboardHeader
                viewMode={user.role === "admin" ? adminViewMode : undefined}
                onViewModeChange={user.role === "admin" ? setAdminViewMode : undefined}
            />
            {getDashboard()}
        </div>
    )
}

export default function Home() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}
