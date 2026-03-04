// lib/amocrm-service.ts

// Типы для ответов от amoCRM
interface AmoCrmUser {
    id: number
    name: string
    email: string
    avatar?: string
    rights?: {
        leads?: {
            view: 'all' | 'own' | 'none'
        }
    }
}

interface AmoCrmDeal {
    id: number
    name: string
    price: number
    status_id: number
    created_at: number
    closed_at: number
    responsible_user_id: number
    _embedded?: {
        contacts?: any[]
        companies?: any[]
    }
}

export class AmoCrmService {
    private accessToken: string
    private refreshToken: string
    private subdomain: string
    private clientId: string
    private clientSecret: string
    private tokenExpiresAt: number

    constructor() {
        this.accessToken = process.env.AMOCRM_ACCESS_TOKEN!
        this.refreshToken = process.env.AMOCRM_REFRESH_TOKEN!
        this.subdomain = process.env.AMOCRM_SUBDOMAIN!
        this.clientId = process.env.AMOCRM_CLIENT_ID!
        this.clientSecret = process.env.AMOCRM_CLIENT_SECRET!

        if (!this.accessToken || !this.refreshToken || !this.subdomain || !this.clientId || !this.clientSecret) {
            throw new Error('Missing required environment variables for AmoCrmService')
        }

        const tokenData = this.decodeJwt(this.accessToken)
        this.tokenExpiresAt = tokenData.exp * 1000
    }

    private decodeJwt(token: string): { exp: number; sub: string } {
        try {
            const base64Url = token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            }).join(''))
            return JSON.parse(jsonPayload)
        } catch (error) {
            console.error('Failed to decode JWT:', error)
            return { exp: Date.now() / 1000 + 86400, sub: '0' }
        }
    }

    private async ensureValidToken(): Promise<void> {
        if (this.tokenExpiresAt - Date.now() < 300000) {
            await this.refreshAccessToken()
        }
    }

    private async refreshAccessToken(): Promise<void> {
        try {
            const response = await fetch(`https://${this.subdomain}.amocrm.ru/oauth2/access_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken,
                    redirect_uri: process.env.AMOCRM_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'
                })
            })

            const tokens = await response.json()
            this.accessToken = tokens.access_token
            this.refreshToken = tokens.refresh_token
            const tokenData = this.decodeJwt(this.accessToken)
            this.tokenExpiresAt = tokenData.exp * 1000

            console.log('Token refreshed successfully')
        } catch (error) {
            console.error('Error refreshing token:', error)
            throw error
        }
    }

    private async request(endpoint: string): Promise<any> {
        await this.ensureValidToken()

        const response = await fetch(`https://${this.subdomain}.amocrm.ru/api/v4${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            if (response.status === 401) {
                await this.refreshAccessToken()
                return this.request(endpoint)
            }

            const errorData = await response.json().catch(() => ({}))
            throw new Error(`AmoCRM API error: ${response.status} - ${errorData.detail || response.statusText}`)
        }

        return response.json()
    }

    async getUserDeals(userId?: number): Promise<AmoCrmDeal[]> {
        try {
            if (!userId) {
                const tokenData = this.decodeJwt(this.accessToken)
                userId = parseInt(tokenData.sub)
            }

            const data = await this.request(`/leads?filter[responsible_user_id]=${userId}`)
            return data._embedded?.leads || []
        } catch (error) {
            console.error('Error getting deals:', error)
            return []
        }
    }

    async getCurrentUser(): Promise<AmoCrmUser | null> {
        try {
            const tokenData = this.decodeJwt(this.accessToken)
            const userId = parseInt(tokenData.sub)

            const data = await this.request(`/users/${userId}`)
            return {
                id: data.id,
                name: data.name,
                email: data.email,
                avatar: data.avatar,
                rights: data.rights
            }
        } catch (error) {
            console.error('Error getting current user:', error)
            return null
        }
    }

    // Добавленный метод getUserStats
    async getUserStats(userId?: number): Promise<{
        totalDeals: number
        openDeals: number
        closedDeals: number
        totalAmount: number
        successTotal: number
        failTotal: number
        successMonth: number
        failMonth: number
        averageDealAmount: number
    }> {
        try {
            const deals = await this.getUserDeals(userId)

            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

            const stats = deals.reduce((acc, deal) => {
                const isClosed = deal.closed_at !== 0
                const isSuccess = deal.status_id === 142 // Настройте под свои статусы!
                const isThisMonth = new Date(deal.created_at * 1000) > startOfMonth

                acc.totalDeals++
                acc.totalAmount += deal.price || 0

                if (isClosed) {
                    acc.closedDeals++
                    if (isSuccess) {
                        acc.successTotal++
                    } else {
                        acc.failTotal++
                    }
                } else {
                    acc.openDeals++
                }

                if (isThisMonth) {
                    if (isSuccess) {
                        acc.successMonth++
                    } else if (isClosed && !isSuccess) {
                        acc.failMonth++
                    }
                }

                return acc
            }, {
                totalDeals: 0,
                openDeals: 0,
                closedDeals: 0,
                totalAmount: 0,
                successTotal: 0,
                failTotal: 0,
                successMonth: 0,
                failMonth: 0,
                averageDealAmount: 0
            })

            stats.averageDealAmount = stats.totalDeals > 0
                ? Math.round(stats.totalAmount / stats.totalDeals)
                : 0

            return stats

        } catch (error) {
            console.error('Error getting user stats:', error)
            return {
                totalDeals: 0,
                openDeals: 0,
                closedDeals: 0,
                totalAmount: 0,
                successTotal: 0,
                failTotal: 0,
                successMonth: 0,
                failMonth: 0,
                averageDealAmount: 0
            }
        }
    }
}