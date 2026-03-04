export interface UserData {
    id: string
    username: string
    password: string
    name: string
    role: "admin" | "employee"
}

export interface SalesData {
    employeeId: string
    successTotal: number
    failTotal: number
    successMonth: number
    failMonth: number
    newClientsMonth: number
    targetClientsMonth: number
}

export const users: UserData[] = [
    {
        id: "1",
        username: "admin",
        password: "admin123",
        name: "Администратор",
        role: "admin",
    },
    {
        id: "2",
        username: "ivanov",
        password: "ivanov123",
        name: "Иванов Иван",
        role: "employee",
    },
    {
        id: "3",
        username: "petrov",
        password: "petrov123",
        name: "Петров Петр",
        role: "employee",
    },
    {
        id: "4",
        username: "sidorova",
        password: "sidorova123",
        name: "Сидорова Анна",
        role: "employee",
    },
]

export const salesData: SalesData[] = [
    {
        employeeId: "2",
        successTotal: 156,
        failTotal: 44,
        successMonth: 23,
        failMonth: 7,
        newClientsMonth: 12,
        targetClientsMonth: 15,
    },
    {
        employeeId: "3",
        successTotal: 203,
        failTotal: 57,
        successMonth: 31,
        failMonth: 9,
        newClientsMonth: 18,
        targetClientsMonth: 20,
    },
    {
        employeeId: "4",
        successTotal: 178,
        failTotal: 32,
        successMonth: 28,
        failMonth: 4,
        newClientsMonth: 14,
        targetClientsMonth: 15,
    },
]

export function getEmployeeSalesData(employeeId: string): SalesData | undefined {
    return salesData.find((data) => data.employeeId === employeeId)
}

export function getAllSalesData(): SalesData[] {
    return salesData
}

export function getAggregatedSalesData(): SalesData {
    return salesData.reduce(
        (acc, data) => ({
            employeeId: "all",
            successTotal: acc.successTotal + data.successTotal,
            failTotal: acc.failTotal + data.failTotal,
            successMonth: acc.successMonth + data.successMonth,
            failMonth: acc.failMonth + data.failMonth,
            newClientsMonth: acc.newClientsMonth + data.newClientsMonth,
            targetClientsMonth: acc.targetClientsMonth + data.targetClientsMonth,
        }),
        {
            employeeId: "all",
            successTotal: 0,
            failTotal: 0,
            successMonth: 0,
            failMonth: 0,
            newClientsMonth: 0,
            targetClientsMonth: 0,
        }
    )
}

export function getEmployeeById(id: string): UserData | undefined {
    return users.find((user) => user.id === id)
}
