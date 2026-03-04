// lib/amocrm-service.ts
export class AmoCrmService {
    private accessToken: string
    private subdomain: string

    constructor() {
        this.accessToken = process.env.AMOCRM_ACCESS_TOKEN!
        this.subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'
    }

    private async request(endpoint: string) {
        const response = await fetch(`https://${this.subdomain}.amocrm.ru/api/v4${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            throw new Error(`AmoCRM API error: ${response.status} - ${error.detail || response.statusText}`)
        }

        return response.json()
    }

    // Получить сделки пользователя
    async getUserDeals(userId: number) {
        try {
            const data = await this.request(`/leads?filter[responsible_user_id]=${userId}&order[created_at]=desc&limit=50`)
            return data._embedded?.leads || []
        } catch (error) {
            console.error('Error getting deals:', error)
            return []
        }
    }

    // Получить статистику по сделкам
    async getUserStats(userId: number) {
        const deals = await this.getUserDeals(userId)

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfYear = new Date(now.getFullYear(), 0, 1)

        const stats = {
            totalDeals: deals.length,
            totalAmount: 0,
            wonDeals: 0,
            lostDeals: 0,
            inProgress: 0,
            monthDeals: 0,
            monthAmount: 0,
            yearDeals: 0,
            yearAmount: 0,
            avgDealAmount: 0,
            conversion: 0
        }

        deals.forEach((deal: any) => {
            const amount = deal.price || 0
            const createdAt = new Date(deal.created_at * 1000)
            const statusId = deal.status_id

            stats.totalAmount += amount

            // Статусы (настройте под свою CRM)
            if (statusId === 142) { // Успешная сделка
                stats.wonDeals++
            } else if (statusId === 143) { // Проигранная
                stats.lostDeals++
            } else {
                stats.inProgress++
            }

            // За месяц
            if (createdAt > startOfMonth) {
                stats.monthDeals++
                stats.monthAmount += amount
            }

            // За год
            if (createdAt > startOfYear) {
                stats.yearDeals++
                stats.yearAmount += amount
            }
        })

        stats.avgDealAmount = stats.totalDeals > 0 ? Math.round(stats.totalAmount / stats.totalDeals) : 0
        stats.conversion = stats.totalDeals > 0
            ? Math.round((stats.wonDeals / (stats.wonDeals + stats.lostDeals)) * 100)
            : 0

        return stats
    }

    // Получить детальную информацию о сделках
    async getUserDealsWithDetails(userId: number) {
        try {
            const data = await this.request(`/leads?filter[responsible_user_id]=${userId}&with=contacts,companies&order[created_at]=desc&limit=20`)
            return data._embedded?.leads || []
        } catch (error) {
            console.error('Error getting deals with details:', error)
            return []
        }
    }
}