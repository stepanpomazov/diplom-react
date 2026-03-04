"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Mail, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export function LoginForm() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const { login, isAuthenticated } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/dashboard')
        }
    }, [isAuthenticated, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                login() // Редирект на OAuth
            } else {
                setError(data.error || "Неверный email или пароль")
                setIsLoading(false)
            }
        } catch (err) {
            setError("Ошибка соединения с сервером")
            setIsLoading(false)
        }
    }

    const handleAmoLogin = () => {
        //login()
    }

    // ВРЕМЕННО: Прямой демо-вход для разработки
    const handleDemoLogin = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/auth/demo-login')
            if (response.ok) {
                window.location.href = '/dashboard'
            }
        } catch (err) {
            setError("Ошибка демо-входа")
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Вход в CRM</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Используйте ваш аккаунт amoCRM
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-foreground">
                                Email
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-secondary pl-10 text-foreground placeholder:text-muted-foreground"
                                    placeholder="Введите email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-foreground">
                                Пароль
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-secondary pl-10 text-foreground placeholder:text-muted-foreground"
                                    placeholder="Введите пароль"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? "Вход..." : "Войти"}
                        </Button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-card px-2 text-muted-foreground">или</span>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleAmoLogin}
                        disabled={isLoading}
                    >
                        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                        Войти через amoCRM
                    </Button>

                    {/* Демо-вход для разработки */}
                    {process.env.NODE_ENV === 'development' && (
                        <>
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-card px-2 text-muted-foreground">демо</span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full"
                                onClick={handleDemoLogin}
                                disabled={isLoading}
                            >
                                Быстрый демо-вход
                            </Button>

                            <div className="mt-4 text-xs text-muted-foreground">
                                <p className="font-medium">Используйте демо-вход для разработки,</p>
                                <p>чтобы не настраивать OAuth каждый раз</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}