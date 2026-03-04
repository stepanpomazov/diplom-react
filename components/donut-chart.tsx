"use client"

import { PieChart, ResponsiveContainer } from "recharts"

interface DonutChartProps {
    title: string
    value1: number
    value2: number
    label1: string
    label2: string
    color1: string
    color2: string
}

export function DonutChart({
                               title,
                               value1,
                               value2,
                               label1,
                               label2,
                               color1,
                               color2,
                           }: DonutChartProps) {
    const total = value1 + value2
    const percentage = total > 0 ? Math.round((value1 / total) * 100) : 0

    { /* const data = [
        { name: label1, value: value1 },
        { name: label2, value: value2 },
    ]

    const colors = [color1, color2] */ }

    return (
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-center text-sm font-medium text-muted-foreground">
                {title}
            </h3>
            <div className="relative h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        { /* <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            strokeWidth={0}
                        >
                            {data.map((_, index) => (
                               <Cell key={`cell-${index}`} fill={colors[index]} />
                            ))}
                        </Pie> */ }
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">{percentage}%</span>
                    <span className="text-xs text-muted-foreground">{label1}</span>
                </div>
            </div>
            <div className="mt-4 flex gap-6">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color1 }} />
                    <span className="text-sm text-muted-foreground">
            {label1}: {value1}
          </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color2 }} />
                    <span className="text-sm text-muted-foreground">
            {label2}: {value2}
          </span>
                </div>
            </div>
        </div>
    )
}
