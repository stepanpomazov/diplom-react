"use client"

import { useAuth, AuthProvider } from "@/lib/auth-context"
import { LoginForm } from "@/components/login-form"
import { DashboardHeader } from "@/components/dashboard-header"
import { EmployeeDashboard } from "@/components/employee-dashboard"
import { AdminDashboard } from "@/components/admin-dashboard"

function AppContent() {
  const { user, isLoading } = useAuth()

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

  return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        {user.role === "admin" ? <AdminDashboard /> : <EmployeeDashboard />}
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
