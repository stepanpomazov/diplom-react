"use client"

import { useState } from "react"
import { getAllSalesData, getAggregatedSalesData, getEmployeeById } from "@/lib/data"
import { DonutChart } from "@/components/donut-chart"
import { Button } from "@/components/ui/button"
import { Users, User } from "lucide-react"

export function AdminDashboard() {
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
    const allSalesData = getAllSalesData()
    const aggregatedData = getAggregatedSalesData()

    const currentData = selectedEmployee
        ? allSalesData.find((d) => d.employeeId === selectedEmployee)
        : aggregatedData

    const employees = allSalesData.map((data) => {
        const employee = getEmployeeById(data.employeeId)
        return {
            id: data.employeeId,
            name: employee?.name || "Неизвестный",
        }
    })

    if (!currentData) return null

    return (
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {selectedEmployee
                            ? `Дашборд: ${employees.find((e) => e.id === selectedEmployee)?.name}`
                            : "Общий дашборд"}
                    </h2>
                    <p className="mt-1 text-muted-foreground">
                        {selectedEmployee
                            ? "Индивидуальная статистика сотрудника"
                            : "Суммарная статистика по всем сотрудникам"}
                    </p>
                </div>
            </div>

            <div className="mb-8 flex flex-wrap gap-2">
                <Button
                    variant={selectedEmployee === null ? "default" : "outline"}
                    onClick={() => setSelectedEmployee(null)}
                    className="gap-2"
                >
                    <Users className="h-4 w-4" />
                    Все сотрудники
                </Button>
                {employees.map((employee) => (
                    <Button
                        key={employee.id}
                        variant={selectedEmployee === employee.id ? "default" : "outline"}
                        onClick={() => setSelectedEmployee(employee.id)}
                        className="gap-2"
                    >
                        <User className="h-4 w-4" />
                        {employee.name}
                    </Button>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <DonutChart
                    title="Продажи за все время"
                    value1={currentData.successTotal}
                    value2={currentData.failTotal}
                    label1="Успешные"
                    label2="Неуспешные"
                    color1="#22c55e"
                    color2="#ef4444"
                />
                <DonutChart
                    title="Продажи за месяц"
                    value1={currentData.successMonth}
                    value2={currentData.failMonth}
                    label1="Успешные"
                    label2="Неуспешные"
                    color1="#3b82f6"
                    color2="#f59e0b"
                />
                <DonutChart
                    title="Новые клиенты за месяц"
                    value1={currentData.newClientsMonth}
                    value2={currentData.targetClientsMonth - currentData.newClientsMonth}
                    label1="Привлечено"
                    label2="До плана"
                    color1="#8b5cf6"
                    color2="#374151"
                />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Всего продаж"
                    value={currentData.successTotal + currentData.failTotal}
                />
                <StatCard label="Успешных продаж" value={currentData.successTotal} />
                <StatCard
                    label="Продаж в этом месяце"
                    value={currentData.successMonth + currentData.failMonth}
                />
                <StatCard label="Новых клиентов" value={currentData.newClientsMonth} />
            </div>

            {selectedEmployee === null && (
                <div className="mt-8">
                    <h3 className="mb-4 text-lg font-semibold text-foreground">
                        Сотрудники
                    </h3>
                    <div className="overflow-hidden rounded-xl border border-border">
                        <table className="w-full">
                            <thead className="bg-secondary">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    Имя
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    Успех (всего)
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    Успех (месяц)
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    Новые клиенты
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                            {allSalesData.map((data) => {
                                const employee = getEmployeeById(data.employeeId)
                                return (
                                    <tr
                                        key={data.employeeId}
                                        className="cursor-pointer transition-colors hover:bg-secondary/50"
                                        onClick={() => setSelectedEmployee(data.employeeId)}
                                    >
                                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                                            {employee?.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {data.successTotal}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {data.successMonth}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {data.newClientsMonth}
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        </div>
    )
}
