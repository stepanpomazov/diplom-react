// components/dashboard-header.tsx
"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut, User, ShieldUser, LayoutDashboard, Users } from "lucide-react"

interface DashboardHeaderProps {
    viewMode?: "admin" | "employee"
    onViewModeChange?: (mode: "admin" | "employee") => void
}

export function DashboardHeader({ viewMode: externalViewMode, onViewModeChange }: DashboardHeaderProps) {
    const { user, logout } = useAuth()
    const [internalViewMode, setInternalViewMode] = useState<"admin" | "employee">("admin")

    // Используем внешний режим если передан, иначе внутренний
    const viewMode = externalViewMode !== undefined ? externalViewMode : internalViewMode

    const handleViewModeChange = (mode: "admin" | "employee") => {
        setInternalViewMode(mode)
        onViewModeChange?.(mode)
    }

    if (!user) return null

    // Если пользователь не админ, показываем упрощенный хедер
    if (user.role !== "admin") {
        return (
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-foreground">{user.name}</h1>
                            <p className="text-sm text-muted-foreground">Сотрудник</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={logout} className="gap-2 bg-transparent">
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Выйти</span>
                    </Button>
                </div>
            </header>
        )
    }

    // Для админа показываем хедер с переключателем
    return (
        <header className="border-b border-border bg-card">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <ShieldUser className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">{user.name}</h1>
                        <p className="text-sm text-muted-foreground">Администратор</p>
                    </div>
                </div>

                {/* Переключатель режимов */}
                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-border bg-muted p-1">
                        <button
                            onClick={() => handleViewModeChange("admin")}
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                viewMode === "admin"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            <span className="hidden sm:inline">Админ панель</span>
                            <span className="sm:hidden">Админ</span>
                        </button>
                        <button
                            onClick={() => handleViewModeChange("employee")}
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                viewMode === "employee"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Как сотрудник</span>
                            <span className="sm:hidden">Сотрудник</span>
                        </button>
                    </div>

                    <Button variant="outline" onClick={logout} className="gap-2 bg-transparent">
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Выйти</span>
                    </Button>
                </div>
            </div>
        </header>
    )
}
