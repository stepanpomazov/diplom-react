// app/dashboard/page.tsx
"use client"

import { useAuth } from "@/lib/auth-context"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {AdminDashboard} from "@/components/admin-dashboard";

export default function DashboardPage() {
    const { user, isLoading } = useAuth()
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
        <AdminDashboard />
    )
}