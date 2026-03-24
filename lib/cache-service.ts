// lib/cache-service.ts
import fs from 'fs/promises'
import path from 'path'

const CACHE_DIR = path.join(process.cwd(), '.cache')
const CACHE_TTL = 60 * 60 * 24 // 24 часа в секундах

// Тип для данных кэша
export interface CacheData<T = unknown> {
    data: T
    expiresAt: number
    createdAt: number
    chatId: string
    messageCount: number
}

export interface CacheEntry<T = unknown> extends CacheData<T> {}

export class CacheService {
    private static instance: CacheService
    private cache: Map<string, CacheEntry> = new Map()
    private initialized = false

    private constructor() {}

    static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService()
        }
        return CacheService.instance
    }

    async init(): Promise<void> {
        if (this.initialized) return

        try {
            await fs.mkdir(CACHE_DIR, { recursive: true })
            // Загружаем существующие кэши из файлов
            const files = await fs.readdir(CACHE_DIR)
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(CACHE_DIR, file)
                    const content = await fs.readFile(filePath, 'utf-8')
                    const entry = JSON.parse(content) as CacheEntry
                    // Проверяем срок действия
                    if (entry.expiresAt > Date.now()) {
                        this.cache.set(file.replace('.json', ''), entry)
                    } else {
                        // Удаляем просроченный кэш
                        await fs.unlink(filePath).catch(() => {})
                    }
                }
            }
        } catch (error) {
            console.error('[Cache] Failed to initialize:', error)
        }
        this.initialized = true
    }

    private getCacheKey(chatId: string, messageCount: number): string {
        return `${chatId}_${messageCount}`
    }

    async get<T = unknown>(chatId: string, messageCount: number): Promise<CacheEntry<T> | null> {
        const key = this.getCacheKey(chatId, messageCount)
        const entry = this.cache.get(key) as CacheEntry<T> | undefined

        if (entry && entry.expiresAt > Date.now()) {
            console.log(`[Cache] Hit for ${chatId} (${messageCount} messages)`)
            return entry
        }

        if (entry) {
            console.log(`[Cache] Expired for ${chatId}`)
            // Удаляем просроченный кэш
            await this.delete(key)
        }

        console.log(`[Cache] Miss for ${chatId}`)
        return null
    }

    async set<T = unknown>(chatId: string, messageCount: number, data: T): Promise<void> {
        const key = this.getCacheKey(chatId, messageCount)
        const entry: CacheEntry<T> = {
            data,
            expiresAt: Date.now() + (CACHE_TTL * 1000),
            createdAt: Date.now(),
            chatId,
            messageCount
        }

        this.cache.set(key, entry as CacheEntry)

        // Сохраняем в файл
        try {
            const filePath = path.join(CACHE_DIR, `${key}.json`)
            await fs.writeFile(filePath, JSON.stringify(entry, null, 2))
            console.log(`[Cache] Saved for ${chatId} (${messageCount} messages)`)
        } catch (error) {
            console.error('[Cache] Failed to save to file:', error)
        }
    }

    async delete(key: string): Promise<void> {
        this.cache.delete(key)
        try {
            const filePath = path.join(CACHE_DIR, `${key}.json`)
            await fs.unlink(filePath).catch(() => {})
        } catch (error) {
            console.error('[Cache] Failed to delete file:', error)
        }
    }

    async clear(): Promise<void> {
        this.cache.clear()
        try {
            const files = await fs.readdir(CACHE_DIR)
            for (const file of files) {
                await fs.unlink(path.join(CACHE_DIR, file)).catch(() => {})
            }
        } catch (error) {
            console.error('[Cache] Failed to clear:', error)
        }
    }

    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        }
    }
}

export const cacheService = CacheService.getInstance()
