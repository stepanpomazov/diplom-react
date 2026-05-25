// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AmoCrmService, UserStats } from "@/lib/amocrm-service"
import { Employee } from "@/lib/types/types"

// ВАЖНО: этот тип Period должен совпадать с тем, что в AmoCrmService
type Period = "all" | "year" | "month" | "day"

interface EmployeeStats {
    employeeId: number
    employeeName: string
    totalDeals: number
    totalAmount: number
    successTotal: number
    failTotal: number
    successMonth: number      // для period=day сюда кладём дневные значения
    failMonth: number         // пока 0, если не считаешь
    newClientsMonth: number   // для period=day тоже дневные
    targetClientsMonth: number
}

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const userCookie = cookieStore.get("user")

        if (!userCookie) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)

        if (user.role !== "admin") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)

        const periodParam = searchParams.get("period") as Period | null
        const period: Period =
            periodParam === "year" ||
            periodParam === "month" ||
            periodParam === "day" ||
            periodParam === "all"
                ? periodParam
                : "all"

        const dateParam = searchParams.get("date") ?? undefined

        const employeeIdParam = searchParams.get("employeeId")
        const employeeIdFilter = employeeIdParam ? Number(employeeIdParam) : null

        const amoCrm = new AmoCrmService()

        const allUsers = await amoCrm.getUsers()
        console.log("[ADMIN API] Found users:", allUsers.length)

        const employeesStatsRaw = await Promise.all(
            allUsers.map(async (employee: Employee) => {
                if (employeeIdFilter && employee.id !== employeeIdFilter) {
                    return null
                }

                const stats = await amoCrm.getUserStats(employee.id, {
                    period,
                    // date имеет смысл только для day
                    date: period === "day" ? dateParam : undefined,
                })

                // Для period=day используем дневные значения как "month"
                const periodDeals =
                    period === "day" ? (stats as UserStats).dayDeals ?? 0 : stats.monthDeals

                const emp: EmployeeStats = {
                    employeeId: employee.id,
                    employeeName: employee.name,
                    totalDeals: stats.totalDeals,
                    totalAmount: stats.totalAmount,
                    successTotal: stats.wonDeals,
                    failTotal: stats.lostDeals,
                    successMonth: periodDeals,
                    failMonth: 0,
                    newClientsMonth: periodDeals,
                    targetClientsMonth: 20,
                }

                return emp
            }),
        )

        const employeesStats: EmployeeStats[] = employeesStatsRaw.filter(
            (emp): emp is EmployeeStats => emp !== null,
        )

        const aggregated: EmployeeStats = employeesStats.reduce<EmployeeStats>(
            (acc, emp) => ({
                employeeId: 0,
                employeeName: "Все сотрудники",
                totalDeals: acc.totalDeals + emp.totalDeals,
                totalAmount: acc.totalAmount + emp.totalAmount,
                successTotal: acc.successTotal + emp.successTotal,
                failTotal: acc.failTotal + emp.failTotal,
                successMonth: acc.successMonth + emp.successMonth,
                failMonth: acc.failMonth + emp.failMonth,
                newClientsMonth: acc.newClientsMonth + emp.newClientsMonth,
                targetClientsMonth: acc.targetClientsMonth + emp.targetClientsMonth,
            }),
            {
                employeeId: 0,
                employeeName: "Все сотрудники",
                totalDeals: 0,
                totalAmount: 0,
                successTotal: 0,
                failTotal: 0,
                successMonth: 0,
                failMonth: 0,
                newClientsMonth: 0,
                targetClientsMonth: 0,
            },
        )

        return NextResponse.json({
            aggregated,
            employees: employeesStats,
            period,
        })
    } catch (error) {
        console.error("[ADMIN API] Error:", error)
        return NextResponse.json(
            { error: "Failed to load admin stats" },
            { status: 500 },
        )
    }
}
