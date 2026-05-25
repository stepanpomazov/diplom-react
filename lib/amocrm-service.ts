import {
    AmoCrmAccount,
    AmoCrmDeal,
    AmoCrmUser,
    AmoCrmUserWithAmojoId,
    ApiResponse,
    DealWithContacts,
    LogData,
    WithEmbedded
} from "./types/types"

type Period = "all" | "year" | "month" | "day"

interface UserStatsOptions {
    period?: Period
    date?: string
}

export interface UserStats {
    totalDeals: number
    totalAmount: number
    wonDeals: number
    lostDeals: number
    inProgress: number
    monthDeals: number
    monthAmount: number
    yearDeals: number
    yearAmount: number
    dayDeals: number
    dayAmount: number
    avgDealAmount: number
    conversion: number
}

export class AmoCrmService {
    private accessToken: string
    private subdomain: string

    constructor() {
        this.accessToken = process.env.AMOCRM_ACCESS_TOKEN!
        this.subdomain = process.env.AMOCRM_SUBDOMAIN || "pomazovsp"

        if (!this.accessToken) {
            throw new Error("AMOCRM_ACCESS_TOKEN is not set")
        }
    }

    public async request<T>(endpoint: string): Promise<T> {
        console.log(`[AmoCRM] Requesting: ${endpoint}`)
        const response = await fetch(`https://${this.subdomain}.amocrm.ru/api/v4${endpoint}`, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            console.error(`[AmoCRM] Error ${response.status}:`, error)
            throw new Error(`AmoCRM API error: ${response.status} - ${error.detail || response.statusText}`)
        }

        const data = (await response.json()) as T

        const dataWithEmbedded = data as WithEmbedded<T>
        const logData: LogData = {
            status: response.status,
            hasData: !!dataWithEmbedded._embedded,
            count: dataWithEmbedded._embedded?.leads?.length || 0,
        }
        console.log(`[AmoCRM] Response for ${endpoint}:`, logData)

        return data
    }

    async getTalks(): Promise<{ _embedded?: { talks?: unknown[] } }> {
        return this.request("/api/v4/talks")
    }

    async getUserAmojoId(userId: number): Promise<string | null> {
        try {
            console.log("[AmoCRM] Getting amojo_id for user:", userId)
            const data = await this.request<AmoCrmUserWithAmojoId>(`/users/${userId}?with=amojo_id`)
            console.log("[AmoCRM] User amojo_id:", data.amojo_id)
            return data.amojo_id || null
        } catch (error) {
            console.error("Error getting user amojo_id:", error)
            return null
        }
    }

    async getAccount(): Promise<{ id: number; name: string; subdomain: string; current_user_id: number; amojo_id?: string }> {
        return await this.request<{
            id: number
            name: string
            subdomain: string
            current_user_id: number
            amojo_id?: string
        }>("/account?with=amojo_id")
    }

    async getCurrentUserAmojoId(userId: number): Promise<string | null> {
        return this.getUserAmojoId(userId)
    }

    async getCurrentUser(): Promise<AmoCrmUser | null> {
        try {
            const accountData = await this.request<AmoCrmAccount>("/account")
            const currentUserId = accountData.current_user_id

            if (currentUserId) {
                const userData = await this.request<AmoCrmUser>(`/users/${currentUserId}`)
                return {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    rights: userData.rights,
                }
            }

            return null
        } catch (error) {
            console.error("Error getting current user:", error)
            return null
        }
    }

    async getAllDeals(): Promise<AmoCrmDeal[]> {
        try {
            const data = await this.request<ApiResponse<AmoCrmDeal>>("/leads?order[created_at]=desc&limit=50")
            return data._embedded?.leads || []
        } catch (error) {
            console.error("Error getting all deals:", error)
            return []
        }
    }

    async getUsers(): Promise<AmoCrmUser[]> {
        try {
            const data = await this.request<ApiResponse<AmoCrmUser>>("/users")
            return data._embedded?.users || []
        } catch (error) {
            console.error("Error getting users:", error)
            return []
        }
    }

    async getUserStats(userId: number, options?: UserStatsOptions): Promise<UserStats> {
        const deals = await this.getUserDeals(userId)

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfYear = new Date(now.getFullYear(), 0, 1)

        const period: Period = options?.period ?? "all"

        let startOfDay: Date | null = null
        let endOfDay: Date | null = null

        if (period === "day" && options?.date) {
            // options.date в формате 'YYYY-MM-DD' — это дата по МСК
            const [yearStr, monthStr, dayStr] = options.date.split("-")
            const year = Number(yearStr)
            const month = Number(monthStr) - 1 // JS месяц с 0
            const day = Number(dayStr)

            const tzOffsetHours = 3 // Москва = UTC+3
            const tzOffsetMs = tzOffsetHours * 60 * 60 * 1000

            // Начало дня по МСК: 00:00 МСК → 21:00 предыдущего дня по UTC
            const mskStart = new Date(Date.UTC(year, month, day, 0, 0, 0))
            const mskEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999))

            // Сдвигаем к UTC, учитывая, что created_at в UTC
            startOfDay = new Date(mskStart.getTime() - tzOffsetMs)
            endOfDay = new Date(mskEnd.getTime() - tzOffsetMs)
        }

        const stats: UserStats = {
            totalDeals: 0,
            totalAmount: 0,
            wonDeals: 0,
            lostDeals: 0,
            inProgress: 0,
            monthDeals: 0,
            monthAmount: 0,
            yearDeals: 0,
            yearAmount: 0,
            dayDeals: 0,
            dayAmount: 0,
            avgDealAmount: 0,
            conversion: 0,
        }

        deals.forEach((deal: AmoCrmDeal) => {
            const amount = deal.price || 0
            const createdAt = new Date(deal.created_at * 1000)
            const statusId = deal.status_id

            const isInMonth = createdAt >= startOfMonth
            const isInYear = createdAt >= startOfYear
            const isInDay =
                startOfDay && endOfDay
                    ? createdAt >= startOfDay && createdAt <= endOfDay
                    : false

            const includeInTotals =
                period === "all" ||
                (period === "year" && isInYear) ||
                (period === "month" && isInMonth) ||
                (period === "day" && isInDay)

            if (includeInTotals) {
                stats.totalDeals++
                stats.totalAmount += amount

                if (statusId === 142) {
                    stats.wonDeals++
                } else if (statusId === 143) {
                    stats.lostDeals++
                } else {
                    stats.inProgress++
                }
            }

            if (isInMonth) {
                stats.monthDeals++
                stats.monthAmount += amount
            }

            if (isInYear) {
                stats.yearDeals++
                stats.yearAmount += amount
            }

            if (isInDay) {
                stats.dayDeals++
                stats.dayAmount += amount
            }
        })

        stats.avgDealAmount =
            stats.totalDeals > 0 ? Math.round(stats.totalAmount / stats.totalDeals) : 0

        stats.conversion =
            stats.wonDeals + stats.lostDeals > 0
                ? Math.round((stats.wonDeals / (stats.wonDeals + stats.lostDeals)) * 100)
                : 0

        return stats
    }

    async getUserDeals(userId: number): Promise<AmoCrmDeal[]> {
        try {
            const data = await this.request<ApiResponse<AmoCrmDeal>>(
                `/leads?filter[responsible_user_id]=${userId}&order[created_at]=desc&limit=50`
            )

            return data._embedded?.leads || []
        } catch (error) {
            console.error("Error getting user deals:", error)
            return []
        }
    }

    async getUserDealsWithContacts(userId: number): Promise<DealWithContacts[]> {
        try {
            const data = await this.request<ApiResponse<DealWithContacts>>(
                `/leads?filter[responsible_user_id]=${userId}&with=contacts,companies&order[created_at]=desc&limit=20`
            )
            return data._embedded?.leads || []
        } catch (error) {
            console.error("Error getting deals with contacts:", error)
            return []
        }
    }
}
