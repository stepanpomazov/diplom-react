// app/api/user/[id]/deals/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AmoCrmService } from "@/lib/amocrm-service"
import type { DealWithContacts } from "@/lib/types/types"

type Period = "all" | "year" | "month" | "day"

// тот же offset, что и в getUserStats
const MSK_OFFSET_HOURS = 3
const MSK_OFFSET_MS = MSK_OFFSET_HOURS * 60 * 60 * 1000

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const userId = parseInt(id, 10)

        if (Number.isNaN(userId)) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
        }

        const cookieStore = await cookies()
        const userCookie = cookieStore.get("user")

        if (!userCookie) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        const user = JSON.parse(userCookie.value)

        // Только админ может смотреть чужие сделки
        if (user.role !== "admin") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const periodParam = searchParams.get("period") as Period | null
        const period: Period =
            periodParam === "all" ||
            periodParam === "year" ||
            periodParam === "month" ||
            periodParam === "day"
                ? periodParam
                : "all"

        const dateParam = searchParams.get("date") ?? undefined

        const amoCrm = new AmoCrmService()
        const deals = await amoCrm.getUserDealsWithContacts(userId)

        console.log(
            `[User Deals] Loaded ${deals.length} deals for user ${userId}, period=${period}, date=${dateParam}`,
        )

        // month/year считаем по МСК, чтобы совпадало с getUserStats
        const nowUtc = new Date()
        const nowMsk = new Date(nowUtc.getTime() + MSK_OFFSET_MS)
        const startOfMonthMsk = new Date(nowMsk.getFullYear(), nowMsk.getMonth(), 1)
        const startOfYearMsk = new Date(nowMsk.getFullYear(), 0, 1)

        let startOfDayUtc: Date | null = null
        let endOfDayUtc: Date | null = null

        if (period === "day" && dateParam) {
            const [y, m, d] = dateParam.split("-")
            const year = Number(y)
            const month = Number(m) - 1
            const day = Number(d)

            // день по МСК
            const mskStart = new Date(year, month, day, 0, 0, 0, 0)
            const mskEnd = new Date(year, month, day, 23, 59, 59, 999)

            // переводим границы в UTC, потому что created_at — Unix UTC
            startOfDayUtc = new Date(mskStart.getTime() - MSK_OFFSET_MS)
            endOfDayUtc = new Date(mskEnd.getTime() - MSK_OFFSET_MS)
        }

        const filteredDeals: DealWithContacts[] = deals.filter((deal) => {
            const createdAtUtc = new Date(deal.created_at * 1000)
            const createdAtMsk = new Date(createdAtUtc.getTime() + MSK_OFFSET_MS)

            if (period === "all") return true

            if (period === "year") {
                return createdAtMsk >= startOfYearMsk
            }

            if (period === "month") {
                return createdAtMsk >= startOfMonthMsk
            }

            if (period === "day" && startOfDayUtc && endOfDayUtc) {
                return createdAtUtc >= startOfDayUtc && createdAtUtc <= endOfDayUtc
            }

            return true
        })

        console.log(
            `[User Deals] After filter: ${filteredDeals.length} deals for user ${userId}`,
        )

        return NextResponse.json({ deals: filteredDeals })
    } catch (error) {
        console.error("[User Deals] Error:", error)
        return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 })
    }
}
