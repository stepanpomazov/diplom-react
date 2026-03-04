// lib/auth-context.tsx
"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

export type UserRole = "admin" | "employee"

export interface User {
    id: number
    name: string
    email: string
    role: UserRole
    avatar?: string
}

interface AuthContextType {
    user: User | null
    login: () => void  // БЕЗ аргументов!
    logout: () => Promise<void>
    isLoading: boolean
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        console.log('AuthProvider - checking session...')
        checkSession()
    }, [])

    const checkSession = async () => {
        try {
            console.log('Fetching /api/auth/session...')
            const response = await fetch('/api/auth/session')
            const data = await response.json()
            console.log('Session response:', data)

            if (response.ok && data.user) {
                console.log('User found in session:', data.user)
                setUser(data.user)
            } else {
                console.log('No user in session')
            }
        } catch (error) {
            console.error('Session check failed:', error)
        } finally {
            console.log('Session check complete, isLoading=false')
            setIsLoading(false)
        }
    }

    const login = () => {
        // Редирект на инициацию OAuth
        window.location.href = '/api/auth/init'
    }

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            setUser(null)
            router.push('/login')
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isLoading,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}