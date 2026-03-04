"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut, User, Shield } from "lucide-react"

export function DashboardHeader() {
    const { user, logout } = useAuth()

    if (!user) return null

    return (
        <header className="border-b border-border bg-card">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        {user.role === "admin" ? (
                            <Shield className="h-5 w-5 text-primary" />
                        ) : (
                            <User className="h-5 w-5 text-primary" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">{user.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            {user.role === "admin" ? "Администратор" : "Сотрудник"}
                        </p>
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
