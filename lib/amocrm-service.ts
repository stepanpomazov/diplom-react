// lib/amocrm-service.ts
export class AmoCrmService {
    private accessToken: string
    private subdomain: string

    constructor() {
        this.accessToken = process.env.AMOCRM_ACCESS_TOKEN!
        this.subdomain = process.env.AMOCRM_SUBDOMAIN || 'stpomazov'

        if (!this.accessToken) {
            throw new Error('AMOCRM_ACCESS_TOKEN is not set')
        }
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

    // ПОЛУЧАЕМ РЕАЛЬНОГО ПОЛЬЗОВАТЕЛЯ из amoCRM
    async getCurrentUser() {
        try {
            // Получаем информацию об аккаунте - там есть данные о текущем пользователе
            const accountData = await this.request('/account')
            console.log('Account data:', accountData)

            // В accountData может быть информация о текущем пользователе
            // Если нет, пробуем получить список пользователей
            if (!accountData.id) {
                // Получаем список пользователей и берем первого
                const usersData = await this.request('/users')
                const firstUser = usersData._embedded?.users?.[0]

                if (firstUser) {
                    return {
                        id: firstUser.id,
                        name: firstUser.name,
                        email: firstUser.email,
                        rights: firstUser.rights
                    }
                }
            }

            // Если нашли ID в accountData, получаем детальную информацию
            if (accountData.id) {
                const userData = await this.request(`/users/${accountData.id}`)
                return {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    rights: userData.rights
                }
            }

            return null
        } catch (error) {
            console.error('Error getting current user:', error)
            return null
        }
    }

    // ПОЛУЧАЕМ РЕАЛЬНЫЕ СДЕЛКИ пользователя
    async getUserDeals(userId: number) {
        try {
            const data = await this.request(`/leads?filter[responsible_user_id]=${userId}&order[created_at]=desc&limit=50`)
            console.log(`Found ${data._embedded?.leads?.length || 0} deals for user ${userId}`)
            return data._embedded?.leads || []
        } catch (error) {
            console.error('Error getting deals:', error)
            return []
        }
    }

    // ПОЛУЧАЕМ РЕАЛЬНУЮ СТАТИСТИКУ по сделкам
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

            // В amoCRM статусы сделок могут быть разными
            // Обычно:
            // 142 - Успешно реализовано
            // 143 - Закрыто и не реализовано
            if (statusId === 142) {
                stats.wonDeals++
            } else if (statusId === 143) {
                stats.lostDeals++
            } else {
                stats.inProgress++
            }

            if (createdAt > startOfMonth) {
                stats.monthDeals++
                stats.monthAmount += amount
            }

            if (createdAt > startOfYear) {
                stats.yearDeals++
                stats.yearAmount += amount
            }
        })

        stats.avgDealAmount = stats.totalDeals > 0 ? Math.round(stats.totalAmount / stats.totalDeals) : 0
        stats.conversion = (stats.wonDeals + stats.lostDeals) > 0
            ? Math.round((stats.wonDeals / (stats.wonDeals + stats.lostDeals)) * 100)
            : 0

        return stats
    }

    // ПОЛУЧАЕМ СДЕЛКИ С КОНТАКТАМИ
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