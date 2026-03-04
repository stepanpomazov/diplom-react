// app/api/admin/stats/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AmoCrmService } from '@/lib/amocrm-service'
import {Employee} from "@/components/admin-dashboard";

export async function GET() {
    try {
        const cookieStore = await cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)

        // Проверяем, что пользователь админ
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const amoCrm = new AmoCrmService()

        // Получаем всех пользователей из amoCRM
        const allUsers = await amoCrm.getUsers()
        console.log('[ADMIN API] Found users:', allUsers.length)

        // Для каждого пользователя получаем статистику
        const employeesStats = await Promise.all(
            allUsers.map(async (employee: Employee) => {
                const stats = await amoCrm.getUserStats(employee.id)
                return {
                    employeeId: employee.id,
                    employeeName: employee.name,
                    totalDeals: stats.totalDeals,
                    totalAmount: stats.totalAmount,
                    successTotal: stats.wonDeals,
                    failTotal: stats.lostDeals,
                    successMonth: stats.monthDeals,
                    failMonth: 0,
                    newClientsMonth: stats.monthDeals,
                    targetClientsMonth: 20,
                }
            })
        )

        const aggregated = employeesStats.reduce((acc, emp) => ({
            employeeId: 0,
            employeeName: 'Все сотрудники',
            totalDeals: acc.totalDeals + emp.totalDeals,
            totalAmount: acc.totalAmount + emp.totalAmount,
            successTotal: acc.successTotal + emp.successTotal,
            failTotal: acc.failTotal + emp.failTotal,
            successMonth: acc.successMonth + emp.successMonth,
            failMonth: acc.failMonth + (emp.failMonth || 0),
            newClientsMonth: acc.newClientsMonth + emp.newClientsMonth,
            targetClientsMonth: acc.targetClientsMonth + emp.targetClientsMonth,
        }), {
            employeeId: 0,
            employeeName: 'Все сотрудники',
            totalDeals: 0,
            totalAmount: 0,
            successTotal: 0,
            failTotal: 0,
            successMonth: 0,
            failMonth: 0,
            newClientsMonth: 0,
            targetClientsMonth: 0,
        })

        return NextResponse.json({
            aggregated,
            employees: employeesStats
        })

    } catch (error) {
        console.error('[ADMIN API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to load admin stats' },
            { status: 500 }
        )
    }
}